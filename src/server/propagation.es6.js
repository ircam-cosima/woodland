'use strict';

const debug = require('debug')('soundworks:woodland:propagation');

const distances = require('../common/distances');
const utils = require('../common/utils');

class Propagation {
  constructor(params = {}) {
    this.distances = new distances.Distances( {
      coordinates: params.coordinates
    } );
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
                     : 330); // m.s^-1
    this.distanceSpread = (typeof params.distanceSpread !== 'undefined'
                           ? params.distanceSpread
                           : 6); // dB/m (reference at 1 m)
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
      return [];
    }

    let sources = []; // [distance, gain, delay]
    let destinations = []; // [distance, gain, delay]
    const positionsNb = this.distances.coordinates.length;
    for(let d = 0; d < positionsNb; ++d) {
      destinations[d] = [];
      sources[d] = [];
    }

    sources[origin].push([0, 1, 0]);

    const linearGainThreshold = utils.dBToLin(this.gainThreshold);
    const airSpeedInv = 1 / this.airSpeed;
    // reference is 6 dB for natural inverse square law
    const gainExponent = -this.distanceSpread / 6;

    let ongoing = true;
    let diffusionsNb = 0;
    let diffusionsNbDisplay = 1;
    const diffusionsNbMax = 1e5;
    // Yes, we may hard-brake
    ongoingReflections: // eslint-disable-line
    while(ongoing) {
    ongoing = false;
      // debug('diffusions: %s', diffusionsNb);
      for(let s of players) {
        // debug('s: %s', s);
        for(let source = sources[s].shift(); // loudest first
            source !== undefined;
            source = sources[s].pop() ) {
          // debug('pop %s: %s', s, source);
          for(let d of players) {
            // debug('d: %s', d);
            if(s === d) {
              if(destinations[d].length < diffusionsNbMax) {
                destinations[d].push(source);
                // debug('destination push: %s', source);
                ++diffusionsNb;
                if(diffusionsNb > diffusionsNbDisplay) {
                  debug('diffusions2: %s', diffusionsNb);
                  diffusionsNbDisplay *= 2;
                }
                ongoing = true;
              }
              else {
                debug('destinations[%s].length ≥ %s', d, diffusionsNbMax);
                ongoing = false;
                break ongoingReflections; // eslint-disable-line
              }
              // debug('destination %s', d);
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
                if(sources[d].length < diffusionsNbMax) {
                  sources[d].push([distance, gain, delay]);
                  // debug('source push %s: [%s, %s, %s]', d, distance, gain, delay);
                  ongoing = true;
                } else {
                  ongoing = false;
                  debug('sources[%s].length ≥ %s', d, diffusionsNbMax);
                  break ongoingReflections; // eslint-disable-line
                }
              }
            }
          } // for all potential destinations
        } // for all existing sources
      } // for all potential sources
    } // while ongoing

    return destinations;
  } // compute
} // class Propagation

module.exports = exports = Propagation;
