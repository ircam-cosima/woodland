'use strict';

let utils = {};


/**
 * Convert dB to linear gain value (1e-3 for -60dB)
 *
 * @param {Number} dBValue
 *
 * @return {Number} gain value
 */
utils.dBToLin = function (dBValue) {
  const factor = 1 / 20;
  return Math.pow(10, dBValue * factor);
};

utils.Blocked = class {
  /**
   * @callback utils.Blocked~report
   * @param {Number} duration of blockage, in milliseconds
   */

  /**
   * Periodic test for event loop, and report of it was blocked.
   *
   * @constructs utils.Blocked
   * @param {Number} callback when blocked for more than threshold
   * @param {Number} threshold in ms
   */
  constructor(callback, threshold = 10) {
    this.callback = callback;
    this.threshold = threshold;
    this.interval = this.threshold * 10;

    if(typeof process !== 'undefined'
       && typeof process.hrtime === 'function') {
      // node version
      this.time = () => {
        const hrtime = process.hrtime();
        return hrtime[0] * 1e3 + hrtime[1] * 1e-6;
      };
    } else if(typeof window !== 'undefined'
              && typeof window.performance !== 'undefined'
              && typeof window.performance.now === 'function') {
      // modern browser
      this.time = () => { return window.performance.now(); };
    } else {
      this.time = () => { return Date.now(); };
    }

    this.tick(this.time() );
  }

  /**
   * Test for blockage, and schedule next test.
   *
   * @private
   * @function utils.Blocked~tick
   * @param {Number} start of the previous tick
   */
  tick(start) {
    const now = this.time();
    const delta = now - (start + this.interval);
    if(typeof this.callback !== 'undefined'
       && delta > this.threshold) {
      this.callback(Math.round(delta) );
    }
    setTimeout( () => { this.tick(now); }, this.interval);
  }

};

module.exports = exports = utils;
