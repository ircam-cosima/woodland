'use strict';

// standard libraries
const debug = require('debug')('soundworks:woodland');

// Soundworks library
const serverSide = require('soundworks/server');

const distances = require('../common/distances');
const utils = require('../common/utils');
const files = require('../common/files');

class WoodlandServerPerformance extends serverSide.Performance {
  constructor(params = {}) {
    super();
    this.server = (typeof params.server !== 'undefined'
                   ? params.server
                   : serverSide.server);

    this.sync = (typeof params.sync !== 'undefined'
                 ? params.sync
                 : new serverSide.Sync() );

    this.setup = params.setup;

    this.players = [];
    this.receiver = null;
    this.launcher = null;

    this.flatnesses = [];
    this.flatnessesExpected = 0; // when request is made
    this.flatnessesTimeoutDuration = 5; // seconds
    this.flatnessesTimeoutID = 0;

    this.propagations = 0;
    this.propagationsExpected = 0; // when request is made
    this.propagationsTimeoutDuration = 30; // seconds after previous reply
    this.propagationsTimeoutID = 0;

    // TODO: add low-pass filters

    this.distances = new distances.Distances( {
      coordinates: this.setup.coordinates
    } );

    this.lookahead = 1; // second
    this.active = true;

    this.soundFile = files.sounds[0];
    this.masterGain = 0; // dB

    this.gainThreshold = -20; // dB
    this.delayThreshold = 30; // s
    this.airSpeed = 330; // m.s^-1
    this.distanceSpread = 6; // dB/m (reference at 1 m)
    this.reflectionTransmission = 0.7; // per reflection
  }

  enter(client) {
    super.enter(client);

    if(client.type === 'player') {
      this.players.push(client.modules.checkin.index);

      // first player is a launcher
      if(this.players.length === 1) {
        debug('first client %s. Check-in index: %s, label: %s',
              client.index,
              client.modules.checkin.index,
              client.modules.checkin.label);
        this.setLauncher(client);
      }
    }

    // this.sendLabels();
    this.sendParameters();

    client.receive('woodland:receiver-request', () => {
      if(this.receiver !== null) {
        this.server.broadcast('druid', 'woodland:receiver',
                              this.receiver.modules.checkin.label);
      }
    });

    client.receive('woodland:launcher-request', () => {
      this.server.broadcast('druid', 'woodland:launcher',
                            (this.launcher !== null
                             ? this.launcher.modules.checkin.label
                             : 'none') );
    });

    client.receive('woodland:launcher', (label) => {
      const client = this.clients.find( (e) => {
        return e.modules.checkin.label === label;
      } );
      this.setLauncher(client);
    });

    this.sendLabels();
    client.receive('woodland:labels-request', () => {
      this.sendLabels();
    });

    client.receive('woodland:launched', () => {
      debug('launched');
      this.setLauncher(null);
      this.flatnesses = [];
      this.flatnessesExpected = this.players.length;
      this.server.broadcast('player', 'woodland:flatness-request');
      this.flatnessesTimeoutID = setTimeout( () => {
        debug('flatnesses time-out');
        this.flatnessesCompleted();
      }, this.flatnessesTimeoutDuration * 1000);
    } );

    client.receive('woodland:flatness', (flatness) => {
      this.flatnesses.push([flatness, client]);
      if(this.flatnesses.length === this.flatnessesExpected) {
        this.flatnessesCompleted();
      }
    });

    client.receive('woodland:propagated', () => {
      ++this.propagations;

      // relative time-out after previous reply
      clearTimeout(this.propagationsTimeoutID);
      if(this.propagations === this.propagationsExpected) {
        this.propagationsCompleted();
      } else {
        this.propagationsTimeoutID = setTimeout( () => {
          debug('propagations time-out');
          this.propagationsCompleted();
        }, this.propagationsTimeoutDuration * 1000);
      }
    });

    client.receive('woodland:parameters-request', () => {
      this.sendParameters();
    } );

    client.receive('woodland:parameters', (params) => {
      if(typeof params.soundFile !== 'undefined') {
        this.soundFile = params.soundFile;
      }

      if(typeof params.masterGain !== 'undefined') {
        this.masterGain = params.masterGain;
      }

      if(typeof params.gainThreshold !== 'undefined') {
        this.gainThreshold = params.gainThreshold;
      }

      if(typeof params.delayThreshold !== 'undefined') {
        this.delayThreshold = params.delayThreshold;
      }

      if(typeof params.airSpeed !== 'undefined') {
        this.airSpeed = params.airSpeed;
      }

      if(typeof params.distanceSpread !== 'undefined') {
        this.distanceSpread = params.distanceSpread;
      }

      if(typeof params.reflectionTransmission !== 'undefined') {
        this.reflectionTransmission = params.reflectionTransmission;
      }

      // re-broadcast
      this.sendParameters();
    } );

    client.receive('woodland:render-request', () => {
      this.server.broadcast('player', 'woodland:render',
                            this.sync.getSyncTime() + this.lookahead);
    });

  }

  exit(client) {
    super.exit(client);
    if(client.type === 'player') {
      const index = this.players.indexOf(client.modules.checkin.index);
      if(index >= 0) {
        this.players.splice(index, 1);
      }

      if(this.players.length > 0 && this.launcher === client) {
        const launcher = this.clients.find( (e) => {
          return e.type === 'player';
        } );
        this.setLauncher(launcher);
      }

      this.sendLabels();
    }
  }

  setReceiver(client) {
    this.receiver = client;
    const label = (this.receiver !== null
                   ? this.receiver.modules.checkin.label
                   : 'none');

    debug('receiver: %s', label);
    this.server.broadcast('player', 'woodland:receiver', label);
    this.server.broadcast('druid', 'woodland:receiver', label);
  }

  setLauncher(client) {
    this.launcher = (typeof client !== 'undefined'
                     ? client
                     : null);
    const label = (this.launcher !== null
                   ? this.launcher.modules.checkin.label
                   : 'none');

    debug('launcher: %s', label);
    this.server.broadcast('player', 'woodland:launcher', label);
    this.server.broadcast('druid', 'woodland:launcher', label);
  }

  sendLabels() {
    let labels = [];
    for(let c = 0; c < this.clients.length; ++c) {
      if(this.clients[c].type === 'player') {
        labels.push(this.clients[c].modules.checkin.label);
      }
    }
    labels.sort();
    this.server.broadcast('druid', 'woodland:labels', labels);
  }

  sendParameters() {
    const params = {
      soundFile: this.soundFile,
      masterGain: this.masterGain,
      gainThreshold: this.gainThreshold,
      delayThreshold: this.delayThreshold,
      airSpeed: this.airSpeed,
      distanceSpread: this.distanceSpread,
      reflectionTransmission: this.reflectionTransmission
    };

    this.server.broadcast('player', 'woodland:parameters', params);
    this.server.broadcast('druid', 'woodland:parameters', params);
  }

  flatnessesCompleted() {
    clearTimeout(this.flatnessesTimeoutID);
    if(this.flatnesses.length > 0) {
      this.flatnesses.sort();
      const source = this.flatnesses[this.flatnesses.length - 1][1];
      this.flatnessesExpected = 0; // completed
      this.setReceiver(source);

      this.propagate(source.modules.checkin.index);
    }
  }

  propagationsCompleted() {
    clearTimeout(this.propagationsTimeoutID);
    this.propagationsExpected = 0; // completed
    this.server.broadcast('player', 'woodland:render',
                          this.sync.getSyncTime() + this.lookahead);
  }

  propagate(origin) {
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
    const diffusionsNbMax = 1e6;
    // Yes, we may hard-brake
    ongoingReflections: // eslint-disable-line
    while(ongoing) {
    ongoing = false;
      // debug('diffusions: %s', diffusionsNb);
      for(let s of this.players) {
        // debug('s: %s', s);
        for(let source = sources[s].shift(); // loudest first
            source !== undefined;
            source = sources[s].pop() ) {
          // debug('pop %s: %s', s, source);
          for(let d of this.players) {
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

    this.propagations = 0;
    this.propagationsExpected = this.players.length;
    for(let c = 0; c < this.clients.length; ++c) {
      const client = this.clients[c];
      if(client.type === 'player') {
        debug('woodland:propagate %s reflections to %s',
              destinations[client.modules.checkin.index].length,
              client.modules.checkin.label);
        client.send('woodland:propagate',
                    destinations[client.modules.checkin.index] );
      }
    }



  }

} // class WoodlandServerPerformance

module.exports = exports = WoodlandServerPerformance;
