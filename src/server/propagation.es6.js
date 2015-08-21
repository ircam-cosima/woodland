'use strict';

const debug = require('debug')('soundworks:woodland:propagation');

const distances = require('../common/distances');
const utils = require('../common/utils');

class Propagation {
  constructor(params = {}) {
    this.distances = new distances.Distances( {
      coordinates: params.coordinates
    } );

    this.sendFunction = params.sendFunction;

    this.sources = []; // [distance, gain, delay]
    this.destinations = []; // [gain, delay]
    this.destinationsNb = [];

    this.setParameters(params);
  }

  setParameters(params = {}) {
    this.gainThreshold = (typeof params.gainThreshold !== 'undefined'
                          ? params.gainThreshold
                          : -20); // dB
    this.delayThreshold = (typeof params.delayThreshold !== 'undefined'
                           ? params.delayThreshold
                           : 30); // s
    this.airSpeed = (typeof params.airSpeed !== 'undefined'
                     ? params.airSpeed
                     : 330); // m/s
    this.distanceSpread = (typeof params.distanceSpread !== 'undefined'
                           ? params.distanceSpread
                           : 6); // attenuation when distance doubles
                                 // (dB/m with reference at 1 m)
    this.reflectionTransmission =
      (typeof params.reflectionTransmission !== 'undefined'
       ? params.reflectionTransmission
       : 0.7); // per reflection
  }

  compute(params = {}) {
    const players = params.players;
    const origin = params.origin;

    if(typeof players === 'undefined'
       || typeof origin === 'undefined') {
      console.log('propagation error');
      console.log('players: %s', players);
      console.log('origin: %s', origin);
      return;
    }

    if(typeof params.origin !== 'undefined') {
      const positionsNb = this.distances.coordinates.length;
      for(let d = 0; d < positionsNb; ++d) {
        this.destinations[d] = [];
        this.destinationsNb[d] = 0;
        this.sources[d] = [];
      }
      this.sources[origin].push([0, 1, 0]);
    }

    const linearGainThreshold = utils.dBToLin(this.gainThreshold);
    const airSpeedInv = 1 / this.airSpeed;
    // reference is 6 dB for natural inverse square law
    const gainExponent = -this.distanceSpread / 6;

    let ongoing = true;
    let destinationsNb = 0;
    let destinationsNbDisplay = 1;
    const destinationsNbTransmit = 1e4; // per destination
    const destinationsNbMax = 1e5; // hard limit, per destination or source

    // Yes, we may hard-brake
    ongoingReflections: // eslint-disable-line
    while(ongoing) {
    ongoing = false;
      // sources
      for(let s of players) {
        for(let source = this.sources[s].shift(); // loudest first
            source !== undefined;
            source = this.sources[s].pop() ) {

          // destinations
          for(let d of players) {
            if(s === d) {
              if(this.destinationsNb[d] < destinationsNbMax) {
                this.destinations[d].push( [ source[1], source[2] ] );
                ++this.destinationsNb[d];
                if(this.destinations[d].length % destinationsNbTransmit === 0) {
                  // debug('transmit %s to %s', this.destinations[d].length, d);
                  this.sendFunction(d, this.destinations[d]);
                  // new array, while the previous one is being sent
                  this.destinations[d] = [];
                }

                ++destinationsNb;
                if(destinationsNb > destinationsNbDisplay) {
                  debug('destinations2: %s', destinationsNb);
                  destinationsNbDisplay *= 2;
                }
                ongoing = true;
              } else {
                debug('destinations[%s].length ≥ %s', d, destinationsNbMax);
                ongoing = false;
                break ongoingReflections; // eslint-disable-line
              }
            } else {
              // use global distance, because of clipping for gain
              const distance = this.distances.get(s, d) + source[0];
              const distanceClipped = Math.max(1, distance);
              // const distanceClippedInv = 1 / Math.max(1, distance);
              const gain = source[1]
                      * this.reflectionTransmission
                      * Math.pow(distanceClipped, gainExponent);
              const delay = airSpeedInv * distance;
              if(gain > linearGainThreshold && delay < this.delayThreshold) {
                if(this.sources[d].length < destinationsNbMax) {
                  this.sources[d].push([distance, gain, delay]);
                  ongoing = true;
                } else {
                  ongoing = false;
                  debug('sources[%s].length ≥ %s', d, destinationsNbMax);
                  break ongoingReflections; // eslint-disable-line
                }
              }
            }
          } // for all potential destinations
        } // for all existing sources
      } // for all potential sources
    } // while ongoing

    // send last destinations
    debug('sending to last destinations');
    for(let d of players) {
      debug('sending: %s to %s (total %s)',
            this.destinations[d].length, d, this.destinationsNb[d]);
      this.sendFunction(d, this.destinations[d]);
    }
    debug('sent');

    return;
  } // compute
} // class Propagation

module.exports = exports = Propagation;
