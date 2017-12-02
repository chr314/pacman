var game = new Phaser.Game(448, 496, Phaser.AUTO);

var Pacman = function (game) {

    this.map = null;
    this.layer = null;
    this.pacman = null;

    this.count_timer = 0;
    this.score = 0;
    this.mayonnaise_enabled = false;
    this.slav_lifes = 3;

    this.safetile = 14;
    this.gridsize = 16;

    this.speed = 150;
    this.threshold = 3;

    this.marker = new Phaser.Point();
    this.turnPoint = new Phaser.Point();

    this.directions = [null, null, null, null, null];
    this.opposites = [Phaser.NONE, Phaser.RIGHT, Phaser.LEFT, Phaser.DOWN, Phaser.UP];

    this.current = Phaser.NONE;
    this.turning = Phaser.NONE;

};

Pacman.prototype = {

    init: function () {

        this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
        this.scale.pageAlignHorizontally = true;
        this.scale.pageAlignVertically = true;

        Phaser.Canvas.setImageRenderingCrisp(this.game.canvas);

        this.physics.startSystem(Phaser.Physics.ARCADE);

    },

    preload: function () {

        //  We need this because the assets are on github pages
        //  Remove the next 2 lines if running locally
        //this.load.baseURL = 'https://chr314.github.io/pacman/';
        //this.load.crossOrigin = 'anonymous';

        this.load.image('dot', 'assets/dot.png');
        this.load.image('adidas', 'assets/adidas.png');
        this.load.image('mayonnaise', 'assets/mayonnaise.png');
        this.load.image('tiles', 'assets/pacman-tiles.png');
        this.load.spritesheet('pacman', 'assets/pacman.png', 32, 32);
        this.load.tilemap('map', 'assets/pacman-map.json', null, Phaser.Tilemap.TILED_JSON);


        game.load.audio('hardbass', ['assets/hardbass.mp3']);

        //  Needless to say, graphics (C)opyright Namco

    },

    updateCounter: function () {
        this.count_timer++;
    },

    create: function () {

        music = game.add.audio('hardbass');
        //music.loop = true;
        music.play();

        game.time.events.loop(Phaser.Timer.SECOND, this.updateCounter, this);

        this.map = this.add.tilemap('map');
        this.map.addTilesetImage('pacman-tiles', 'tiles');

        this.layer = this.map.createLayer('Pacman');
        this.layer_adidas = this.map.createLayer('adidas');
        this.layer_mayonnaise = this.map.createLayer('mayonnaise');

        this.dots = this.add.physicsGroup();
        this.adidas = this.add.physicsGroup();
        this.mayonnaise = this.add.physicsGroup();

        this.map.createFromTiles(7, this.safetile, 'dot', this.layer, this.dots);
        this.map.createFromTiles(7, this.safetile, 'adidas', this.layer_adidas, this.adidas);
        this.map.createFromTiles(7, this.safetile, 'mayonnaise', this.layer_mayonnaise, this.mayonnaise);

        //  The dots will need u be offset by 6px to put them back in the middle of the grid
        this.dots.setAll('x', 6, false, false, 1);
        this.dots.setAll('y', 6, false, false, 1);

        this.mayonnaise.setAll('x', -6, false, false, 1);
        this.mayonnaise.setAll('y', -6, false, false, 1);


        //  Pacman should collide with everything except the safe tile
        this.map.setCollisionByExclusion([this.safetile], true, this.layer);

        //  Position Pacman at grid location 14x17 (the +8 accounts for his anchor)
        this.pacman = this.add.sprite((14 * 16) + 8, (17 * 16) + 8, 'pacman', 0);
        this.pacman.anchor.set(0.5);
        this.pacman.animations.add('munch', [0, 1, 2, 1], 20, true);

        this.physics.arcade.enable(this.pacman);
        this.pacman.body.setSize(16, 16, 0, 0);

        this.cursors = this.input.keyboard.createCursorKeys();

        this.pacman.play('munch');
        this.move(Phaser.LEFT);

        this.adidas.callAll('kill');
        this.adidas.forEach(function (c) {
            setTimeout(function () {
                c.revive();
                setTimeout(function () {
                    c.kill();
                }, 4000);
            }, game.rnd.integerInRange(1000, 30000));
        });

        this.mayonnaise.callAll('kill');
        this.mayonnaise.forEach(function (c) {
            setTimeout(function () {
                c.revive();
                setTimeout(function () {
                    c.kill();
                }, 4000);
            }, game.rnd.integerInRange(1000, 30000));
        });

    },

    checkKeys: function () {

        if (this.cursors.left.isDown && this.current !== Phaser.LEFT) {
            this.checkDirection(Phaser.LEFT);
        }
        else if (this.cursors.right.isDown && this.current !== Phaser.RIGHT) {
            this.checkDirection(Phaser.RIGHT);
        }
        else if (this.cursors.up.isDown && this.current !== Phaser.UP) {
            this.checkDirection(Phaser.UP);
        }
        else if (this.cursors.down.isDown && this.current !== Phaser.DOWN) {
            this.checkDirection(Phaser.DOWN);
        }
        else {
            //  This forces them to hold the key down to turn the corner
            this.turning = Phaser.NONE;
        }

    },

    checkDirection: function (turnTo) {

        if (this.turning === turnTo || this.directions[turnTo] === null || this.directions[turnTo].index !== this.safetile) {
            //  Invalid direction if they're already set to turn that way
            //  Or there is no tile there, or the tile isn't index 1 (a floor tile)
            return;
        }

        //  Check if they want to turn around and can
        if (this.current === this.opposites[turnTo]) {
            this.move(turnTo);
        }
        else {
            this.turning = turnTo;

            this.turnPoint.x = (this.marker.x * this.gridsize) + (this.gridsize / 2);
            this.turnPoint.y = (this.marker.y * this.gridsize) + (this.gridsize / 2);
        }

    },

    turn: function () {

        var cx = Math.floor(this.pacman.x);
        var cy = Math.floor(this.pacman.y);

        //  This needs a threshold, because at high speeds you can't turn because the coordinates skip past
        if (!this.math.fuzzyEqual(cx, this.turnPoint.x, this.threshold) || !this.math.fuzzyEqual(cy, this.turnPoint.y, this.threshold)) {
            return false;
        }

        //  Grid align before turning
        this.pacman.x = this.turnPoint.x;
        this.pacman.y = this.turnPoint.y;

        this.pacman.body.reset(this.turnPoint.x, this.turnPoint.y);

        this.move(this.turning);

        this.turning = Phaser.NONE;

        return true;

    },

    move: function (direction) {

        var speed = this.speed;

        if (direction === Phaser.LEFT || direction === Phaser.UP) {
            speed = -speed;
        }

        if (direction === Phaser.LEFT || direction === Phaser.RIGHT) {
            this.pacman.body.velocity.x = speed;
        }
        else {
            this.pacman.body.velocity.y = speed;
        }

        //  Reset the scale and angle (Pacman is facing to the right in the sprite sheet)
        this.pacman.scale.x = 1;
        this.pacman.angle = 0;

        if (direction === Phaser.LEFT) {
            this.pacman.scale.x = -1;
        }
        else if (direction === Phaser.UP) {
            this.pacman.angle = 270;
        }
        else if (direction === Phaser.DOWN) {
            this.pacman.angle = 90;
        }

        this.current = direction;

    },

    eatDot: function (pacman, dot) {

        dot.kill();
        this.score++;

        if (this.dots.total === 0) {
            this.dots.callAll('revive');
        }

    },

    adidasPower: function (pacman, adidas_plus) {
        adidas_plus.kill();
        this.score += 10;
    },

    mayonnaisePower: function (pacman, mayonnaise_power) {
        mayonnaise_power.kill();
        this.mayonnaise_enabled = true;
        setTimeout(function () {
            this.mayonnaise_enabled = false;
        }, 7000);
    },

    update: function () {

        game.debug.text('Score: ' + this.score, 32, 32);
        game.debug.text("Time: " + this.count_timer, 32, 64);

        this.physics.arcade.collide(this.pacman, this.layer);
        this.physics.arcade.overlap(this.pacman, this.dots, this.eatDot, null, this);

        this.physics.arcade.overlap(this.pacman, this.mayonnaise, this.mayonnaisePower, null, this);
        this.physics.arcade.overlap(this.pacman, this.adidas, this.adidasPower, null, this);

        this.marker.x = this.math.snapToFloor(Math.floor(this.pacman.x), this.gridsize) / this.gridsize;
        this.marker.y = this.math.snapToFloor(Math.floor(this.pacman.y), this.gridsize) / this.gridsize;

        //  Update our grid sensors
        this.directions[1] = this.map.getTileLeft(this.layer.index, this.marker.x, this.marker.y);
        this.directions[2] = this.map.getTileRight(this.layer.index, this.marker.x, this.marker.y);
        this.directions[3] = this.map.getTileAbove(this.layer.index, this.marker.x, this.marker.y);
        this.directions[4] = this.map.getTileBelow(this.layer.index, this.marker.x, this.marker.y);

        this.checkKeys();

        if (this.turning !== Phaser.NONE) {
            this.turn();
        }

    }

};

game.state.add('Game', Pacman, true);
