import * as soundworks from 'soundworks/server';
import debug from 'debug';
const log = debug('soundworks:calibration');


class CalibrationExperience extends soundworks.Experience {
  constructor(clientType, options) {
    super(clientType);

    this.sync = this.require('sync');
    this.calibration = this.require('calibration', options);

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

  start() {

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
    const name = 'calibration:server-params';
    const params = this.getServerParameters();

    if(typeof client === 'undefined') {
      log('broadcast server parameters');
      this.broadcast('calibration', null, name, params);
    } else {
      log('send sever parameters to client');
      this.send(client, name, params);
    }
  }

  enter(client) {
    super.enter(client);

    this.emitServerParameters(client);

    this.receive(client, 'calibration:server-params',
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
          log('too late by %s s', now - this.nextClick);
          // good restart from now
          this.nextClick +=
            Math.ceil((now - this.nextClick) / this.period) * this.period;

          // next one might be soon: look ahead
          if(this.nextClick < now + this.lookahead) {
            --this.number;
            log('soon in %s s', this.nextClick - now);
            this.clickEmit(this.nextClick);
            this.nextClick += this.period;
          }
        } else {
          log('trigger %s (in %s s)', this.nextClick, this.nextClick - now);
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
  }

  clickEmit(nextClick) {
    this.broadcast('calibration', null, 'performance:click', { start: nextClick });
  }

} // class CalibrationServerPerformance

export default CalibrationExperience;
