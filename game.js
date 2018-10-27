var Game = function() {
  // Set the width and height of the scene.
  this._width = 1280;
  this._height = 720;

  // Setup the rendering surface.
  this.renderer = new PIXI.CanvasRenderer(this._width, this._height);
  document.body.appendChild(this.renderer.view);

  // Create the main stage to draw on.
  this.stage = new PIXI.Stage();

  // Setup our physics world simulation.
  this.world = new p2.World({
    gravity: [0, 0]
  });

  // Speed parameters for our ship
  this.speed = 100;
  this.turnSpeed = 2;

  window.addEventListener('keydown', function(event) {
    this.handleKeys(event.keyCode, true);
  }.bind(this), false);

  window.addEventListener('keyup', function(event) {
    this.handleKeys(event.keyCode, false);
  }.bind(this), false);

  this.enemyBodies = [];
  this.enemyGraphics = [];
  this.removeObjs = [];

  // Start running the game.
  this.build();
};

Game.prototype = {
  /**
   * Build the scene and begin animating.
   */
  build: function() {
    // Draw the star-field in the background.
    this.drawStars();

    // Setup the boundaries of the game's arena.
    this.setupBoundaries();

    // Draw the ship to the scene.
    this.createShip();

    // Spawn random enemy ships.
    this.createEnemies();

    // Setup howler.js audio.
    this.setupAudio();

    // Begin the first frame.
    requestAnimationFrame(this.tick.bind(this));
  },

  setupAudio: function() {
    this.sounds = new Howl({
      urls: ['sounds.mps', 'sounds.ogg'],
      sprite: {
        boom1: [0, 3056],
        boom2: [4000, 636],
        boom3: [6000, 1925]
      }
    });

    this.music = new Howl({
      urls: ['music.mp3', 'music.ogg'],
      buffer: true,
      autoplay: true,
      volume: 0.7
    });
  },

  /**
   * Draw the field of stars behind all of the action.
   */
  drawStars: function() {
    // Draw randomly positioned stars.
    for (var i=0; i<1500; i++) {
      // Generate random parameters for the stars.
      var x = Math.round(Math.random() * this._width);
      var y = Math.round(Math.random() * this._height);
      var rad = Math.ceil(Math.random() * 2);
      var alpha = Math.min(Math.random() + 0.25, 1);

      // Draw the star.
      var star  = new PIXI.Graphics();
      star.beginFill(0xFFFFFF, alpha);
      star.drawCircle(x, y, rad);
      star.endFill();

      // Attach the star to the stage.
      this.stage.addChild(star);
    }
  },

  /**
   * Draw the boundaries of the space arena.
   */
  setupBoundaries: function() {
    var walls = new PIXI.Graphics();
    walls.beginFill(0xFFFFFF, 0.5);
    walls.drawRect(0, 0, this._width, 10);
    walls.drawRect(this._width - 10, 10, 10, this._height - 20);
    walls.drawRect(0, this._height - 10, this._width, 10);
    walls.drawRect(0, 10, 10, this._height - 20);
    
    // Attach the walls to the stage.
    this.stage.addChild(walls);    
  },

  createShip: function() {
    // Create the ship object.
    this.ship = new p2.Body({
      mass: 1,
      angularVelocity: 0,
      damping: 0,
      angularDampling: 0,
      position: [Math.round(this._width / 2), Math.round(this._height / 2)]
    });
    this.shipShape = new p2.Rectangle(52, 69);
    this.ship.addShape(this.shipShape);
    this.world.addBody(this.ship);

    this.shipGraphics = new PIXI.Graphics();

    // Draw the ship's body
    this.shipGraphics.beginFill(0x20d3fe);
    this.shipGraphics.moveTo(0, 0);
    this.shipGraphics.lineTo(-26, 60);
    this.shipGraphics.lineTo(26, 60);
    this.shipGraphics.endFill();

    // Add engine to our ship.
    this.shipGraphics.beginFill(0x1495d1);
    this.shipGraphics.drawRect(-15, 60, 30, 8);
    this.shipGraphics.endFill();

    // Attach the ship to the stage.
    this.stage.addChild(this.shipGraphics);
  },

  createEnemies: function() {
    // Create random interval to generate new enemies.
    this.enemyTimer = setInterval(function() {
      // Create the enemy physics body.
      var x = Math.round(Math.random() * this._width);
      var y = Math.round(Math.random() * this._height);
      var vx = (Math.random() - 0.5) * this.speed;
      var vy = (Math.random() - 0.5) * this.speed;
      var va = (Math.random() - 0.5) * this.speed;
      var enemy = new p2.Body({
        position: [x, y],
        mass: 1,
        damping: 0,
        angularDampling: 0,
        velocity: [vx, vy],
        angularVelocity: va
      });
      var enemyShape = new p2.Circle(20);
      enemyShape.sensor = true;
      enemy.addShape(enemyShape);
      this.world.addBody(enemy);

      // Create the graphics object.
      var enemyGraphics = new PIXI.Graphics();
      enemyGraphics.beginFill(0x38d41a);
      enemyGraphics.drawCircle(0, 0, 20);
      enemyGraphics.endFill();
      enemyGraphics.beginFill(0x2aff00);
      enemyGraphics.lineStyle(1, 0x239d0b, 1);
      enemyGraphics.drawCircle(0, 0, 10);
      enemyGraphics.endFill();

      this.stage.addChild(enemyGraphics);

      // Keep track of these enemies.
      this.enemyBodies.push(enemy);
      this.enemyGraphics.push(enemyGraphics);
      
    }.bind(this), 1000);

    this.world.on('beginContact', function(event) {
      if(event.bodyB.id === this.ship.id) {
        this.removeObjs.push(event.bodyA);
      }
    }.bind(this));
  },

  /**
   * Handle key presses and filter them.
   * @param {Number} code Key code pressed.
   * @param {Boolean} state true/false
   */
  handleKeys: function(code, state) {
    switch (code) {
      case 65: // A
        this.keyLeft = state;
        break;

        case 68: // D
          this.keyRight = state;
          break;

        case 87: // W
          this.keyUp = state;
          break;
    }
  },

  /**
   * Update physics within the game loop.
   */
  updatePhysics: function() {
    // Update the ship's abgular velocities for rotation.
    if (this.keyLeft) {
      this.ship.angularVelocity = -1 * this.turnSpeed;
    } else if (this.keyRight) {
      this.ship.angularVelocity = this.turnSpeed;
    } else {
      this.ship.angularVelocity = 0;
    }

    // Apply the force vector to ship.
    if(this.keyUp) {
      var angle = this.ship.angle + Math.PI / 2;
      this.ship.force[0] -= this.speed * Math.cos(angle);
      this.ship.force[1] -= this.speed * Math.sin(angle);
    }

    // Update the position of the graphics based on the 
    // physics simulation position
    this.shipGraphics.x = this.ship.position[0];
    this.shipGraphics.y = this.ship.position[1];
    this.shipGraphics.rotation = this.ship.angle;

    // Warp the ship to the other side if it is out of bonds.
    if(this.ship.position[0] > this._width) {
      this.ship.position[0] = 0;
    } else if (this.ship.position[0] < 0) {
      this.ship.position[0] = this._width;
    }

    if(this.ship.position[1] > this._height) {
      this.ship.position[1] = 0;
    } else if (this.ship.position[1] < 0) {
      this.ship.position[1] = this._height;
    }

    // Update enemy positions
    for(var i=0; i<this.enemyBodies.length; i++) {
      this.enemyGraphics[i].x = this.enemyBodies[i].position[0];
      this.enemyGraphics[i].y = this.enemyBodies[i].position[1];
    }

    // Step the physics simulation forward.
    this.world.step(1 / 60);

    // Remove enemy bodies.
    for (i=0; i<this.removeObjs.length; i++) {
      this.world.removeBody(this.removeObjs[i]);

      var index = this.enemyBodies.indexOf(this.removeObjs[i]);
      if(index) {
        this.enemyBodies.splice(index, 1);
        this.stage.removeChild(this.enemyGraphics[index]);
        this.enemyGraphics.splice(index, 1);
      }

      // Play random boom sound
      this.sounds.play('boom' + (Math.ceil(Math.random() * 3)));
    }

    this.removeObjs.length = 0;
  },

  /**
   * Fires at the end of the gameloop to reset and redraw the canvas.
   */
  tick: function() {
    this.updatePhysics();

    // Render the stage for the current frame.
    this.renderer.render(this.stage);

    // Begin the next frame.
    requestAnimationFrame(this.tick.bind(this));
  }
};