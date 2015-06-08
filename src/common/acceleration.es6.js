'use strict';

var platform = require('platform');

let acceleration = {};

acceleration.Acceleration = class {
  constructor(params = {}) {
    this.callbacks = [];
    this.iOS = platform.os.family === 'iOS';

    // caches
    this.interval = 0;
    this.acceleration = {x: 0, y: 0, z: 0};

    this._listener = this._listener.bind(this);

    const start = (typeof params.start !== 'undefined'
                   ? params.start
                   : true);
    if(start) {
      this.start();
    }
  }

  // unifying proxy
  _listener(event) {
    if(this.iOS) {
      this.interval = 0.001 * event.interval;
      this.acceleration = {
        x: -event.accelerationIncludingGravity.x,
        y: -event.accelerationIncludingGravity.y,
        z: -event.accelerationIncludingGravity.z
      };
    } else {
      this.interval = event.interval;
      this.acceleration = {
        x: event.accelerationIncludingGravity.x,
        y: event.accelerationIncludingGravity.y,
        z: event.accelerationIncludingGravity.z
      };

    }
    for(let c of this.callbacks) {
      if(typeof c !== 'undefined') {
        c(this.acceleration, this.interval);
      }
    }
  }

  addListener(callback) {
    if(this.callbacks.indexOf(callback) === -1) {
      this.callbacks.push(callback);
    }
  }

  removeListener(callback) {
    const index = this.callbacks.indexOf(callback);
    if(index !== -1) {
      this.callbacks.splice(index, 1);
    }
  }

  start() {
    window.addEventListener('devicemotion', this._listener, false);
  }

  stop() {
    window.removeEventListener('devicemotion', this._listener, false);
  }
};

module.exports = exports = acceleration;
