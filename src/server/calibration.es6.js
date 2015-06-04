'use strict';

// standard libraries
const debug = require('debug')('soundworks:calibration');

// Soundworks library
const serverSide = require('soundworks/server');

class CalibrationServerPerformance extends serverSide.Performance {
  constructor(params = {}) {
    super();
    this.server = (typeof params.server !== 'undefined'
                   ? params.server
                   : serverSide.server);

    this.sync = (typeof params.sync !== 'undefined'
                 ? params.sync
                 : new serverSide.Sync() );

    // static strings
    CalibrationServerPerformance.serverParametersName =
      'calibration:server-params';

    // click
    this.active = true; // run by default
    this.lookahead = 1; // second
    this.period = 1; // second
    this.number = -1; // -1 for infinite, >0 for finite count

    // scheduler
    this.timeoutID = 0; // to cancel setTimeout
    this.nextClick = 0; // absolute time, in seconds
    this.tickDuration = 0.025; // seconds

    // run by default
    this.click();
  }

  getServerParameters() {
    return {
      active: this.active,
      lookahead: this.lookahead,
      period: this.period,
      number: this.number
    };
  }

  setServerParameters(params) {
    if(typeof params.active !== 'undefined') {
      this.active = params.active;
    }
    if(typeof params.lookahead !== 'undefined') {
      this.lookahead = params.lookahead;
    }
    if(typeof params.period !== 'undefined') {
      this.period = params.period;
    }
    if(typeof params.number !== 'undefined') {
      this.number = params.number;
    }
  }

  emitServerParameters(client) {
    const name = CalibrationServerPerformance.serverParametersName;
    const params = this.getServerParameters();

    if(typeof client === 'undefined') {
      this.server.broadcast('calibration', name, params);
    } else {
      client.send(name, params);
    }
  }

  enter(client) {
    super.enter(client);

    this.emitServerParameters(client);

    client.receive(CalibrationServerPerformance.serverParametersName,
                   (params) => {
                     const activate = !this.active && params.active;
                     this.setServerParameters(params);

                     if(!this.active || this.number === 0) {
                       clearTimeout(this.timeoutID);
                     } else if(activate) {
                       this.click();
                     }
                   } );
  }

  click() {
    if(this.active && this.number !== 0) {

      clearTimeout(this.timeoutID);
      const now = this.sync.getSyncTime();

      if(this.nextClick < now + this.lookahead) {
        --this.number;

        // too late
        if(this.nextClick < now) {
          debug('too late by %s s', now - this.nextClick);
          // good restart from now
          this.nextClick +=
            Math.ceil((now - this.nextClick) / this.period) * this.period;

          // next one might be soon: look ahead
          if(this.nextClick < now + this.lookahead) {
            --this.number;
            debug('soon in %s s', this.nextClick - now);
            this.clickEmit(this.nextClick);
            this.nextClick += this.period;
          }
        } else {
          debug('trigger %s (in %s s)', this.nextClick, this.nextClick - now);
          this.clickEmit(this.nextClick);
          this.nextClick += this.period;
        }
      } // within look-ahead

      // set new timeout
      if (this.number !== 0) {
        this.timeoutID = setTimeout( () => { this.click(); },
                                     this.tickDuration * 1000);
      } else {
        this.active = false;
      }

    }

    this.emitServerParameters();
  }

  clickEmit(nextClick) {
    this.server.broadcast('calibration', 'performance:click', {
      start: nextClick
    });
  }

} // class CalibrationServerPerformance

module.exports = exports = CalibrationServerPerformance;
