import * as soundworks from 'soundworks/server';

// standard libraries
const fs = require('fs');
const path = require('path');
const debug = require('debug')('soundworks:woodland');

// Soundworks library
const serverSide = require('soundworks/server');

const processes = require('./processes');
const files = require('../shared/files');
const Propagation = require('./propagation');

const dataPath =  path.join(__dirname, '../../data');

class WoodlandExperience extends soundworks.Experience {
  constructor(clientTypes, setup) {
    super(clientTypes);

    const that = this;

    this.placer = this.require('placer');
    // this.checkin = this.require('checkin');
    this.sync = this.require('sync');
    this.audioBufferManager = this.require('audio-buffer-manager');

    this.setup = setup;

    this.processes = {};
    this.processes.manager = new processes.Manager(process);

    this.processes.propagation = this.processes.manager.fork('process_propagation');
    this.processes.propagation.on('message', (m) => {
      switch(m.type) {
        case 'coordinates-request':
          this.processes.propagation.send( {
            type: 'coordinates',
            data: { coordinates: that.setup.coordinates }
          } );
          break;

        case 'clients-request':
          this.processes.propagation.send( {
            type: 'clients',
            data: { clients: that.setup.coordinates }
          } );
          break;

        case 'parameters-request':
          this.sendParameters();
          break;
      }
    } );

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

    this.lookahead = 1; // second
    this.active = true;

    this.soundFile = files[0];
    this.masterGain = 0; // dB

    this.gainThreshold = -20; // dB
    this.delayThreshold = 30; // s
    this.airSpeed = 330; // m.s^-1
    this.distanceSpread = 6; // dB attenuation for double distance
    this.reflectionTransmission = 0.7; // per reflection (factor)

    this.druidPresetsFile = path.join(dataPath, 'druid_presets.json');

    try {
      this.druidPresets = JSON.parse(fs.readFileSync(this.druidPresetsFile) );
    } catch(error) {
      debug('Error loading druid presets from ' + this.druidPresetsFile + '. '
            + error.message);
      this.druidPresets = {
        default: {
          soundFile: this.soundFile,
          masterGain: this.masterGain,
          gainThreshold: this.gainThreshold,
          delayThreshold: this.delayThreshold,
          airSpeed: this.airSpeed,
          distanceSpread: this.distanceSpread,
          reflectionTransmission: this.reflectionTransmission,
        },
      };

    }

  }

  enter(client) {
    super.enter(client);

    if(client.type === 'player') {
      this.players.push(client.index);

      // first player is a launcher
      if(this.players.length === 1) {
        debug('first client %s. Check-in index: %s, label: %s',
              client.index,
              client.index,
              client.label);
        this.setLauncher(client);
      }
    }

    // this.sendLabels();
    this.sendParameters();

    this.receive(client, 'woodland:receiver-request', () => {
      if(this.receiver !== null) {
        this.broadcast('druid', null, 'woodland:receiver',
                              this.receiver.label);
      }
    });

    this.receive(client, 'woodland:launcher-request', () => {
      this.broadcast('druid', null, 'woodland:launcher',
                            (this.launcher !== null
                             ? this.launcher.label
                             : 'none') );
    });

    this.receive(client, 'woodland:launcher', (label) => {
      const launcher = this.clients.find( (e) => {
        return e.label === label;
      } );
      this.setLauncher(launcher);
    });

    this.sendLabels();
    this.receive(client, 'woodland:labels-request', () => {
      this.sendLabels();
    });

    this.receive(client, 'woodland:launched', () => {
      debug('launched');
      this.setLauncher(null);
      this.flatnesses = [];
      this.flatnessesExpected = this.players.length;
      this.broadcast('player', null, 'woodland:flatness-request');
      this.flatnessesTimeoutID = setTimeout( () => {
        debug('flatnesses time-out');
        this.flatnessesCompleted();
      }, this.flatnessesTimeoutDuration * 1000);
    } );

    this.receive(client, 'woodland:flatness', (flatness) => {
      this.flatnesses.push([flatness, client]);
      if(this.flatnesses.length === this.flatnessesExpected) {
        this.flatnessesCompleted();
      }
    });

    this.receive(client, 'woodland:propagated', () => {
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

    this.receive(client, 'woodland:parameters-request', () => {
      this.sendParameters();
    } );

    this.receive(client, 'woodland:parameters', (params) => {
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
        // hard limit to 60 seconds (see player/audio.Propagation)
        this.delayThreshold = Math.min(60, params.delayThreshold);
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

    this.receive(client, 'woodland:druid-presets-request', () => {
      this.sendDruidPresets();
    });

    this.receive(client, 'woodland:druid-presets', (presets) => {
      this.druidPresets = presets;

      fs.writeFile(this.druidPresetsFile, JSON.stringify(this.druidPresets) );

      // re-broadcast
      this.sendDruidPresets();
    });

    this.receive(client, 'woodland:render-request', () => {
      this.broadcast('player', null, 'woodland:render',
                            this.sync.getSyncTime() + this.lookahead);
    });

  }

  exit(client) {
    super.exit(client);

    if(client.type === 'player') {
      const index = this.players.indexOf(client.index);
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
                   ? this.receiver.label
                   : 'none');

    debug('receiver: %s', label);
    this.broadcast('player', null, 'woodland:receiver', label);
    this.broadcast('druid', null, 'woodland:receiver', label);
  }

  setLauncher(client) {
    this.launcher = (typeof client !== 'undefined'
                     ? client
                     : null);
    const label = (this.launcher !== null
                   ? this.launcher.label
                   : 'none');

    debug('launcher: %s', label);
    this.broadcast('player', null, 'woodland:launcher', label);
    this.broadcast('druid', null, 'woodland:launcher', label);
  }

  sendLabels() {
    let labels = [];
    for(let c = 0; c < this.clients.length; ++c) {
      if(this.clients[c].type === 'player') {
        labels.push(this.clients[c].label);
      }
    }

    labels.sort( (a, b) => {
      const aFloat = parseFloat(a);
      const bFloat = parseFloat(b);
      if(isNaN(aFloat) || isNaN(bFloat) ) {
        return a > b;
      } else {
        return aFloat > bFloat;
      }
    });
    this.broadcast('druid', null, 'woodland:labels', labels);
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

    this.broadcast('player', null, 'woodland:parameters', params);
    this.broadcast('druid', null, 'woodland:parameters', params);

    this.processes.propagation.send( {type: 'parameters', data: params} );
  }

  sendDruidPresets() {
    this.broadcast('druid', null, 'woodland:druid-presets', this.druidPresets);
  }

  flatnessesCompleted() {
    clearTimeout(this.flatnessesTimeoutID);
    if(this.flatnesses.length > 0) {
      this.flatnesses.sort();
      const source = this.flatnesses[this.flatnesses.length - 1][1];
      this.flatnessesExpected = 0; // completed
      this.setReceiver(source);

      this.propagate(source.index);
    }
  }

  propagationsCompleted() {
    clearTimeout(this.propagationsTimeoutID);
    this.propagationsExpected = 0; // completed
    this.broadcast('player', null, 'woodland:render',
                          this.sync.getSyncTime() + this.lookahead);
  }

  propagate(origin) {
    const that = this;

    this.propagations = 0;
    this.propagationsExpected = this.players.length;

    debug('compute');
    this.processes.propagation.send( {
      type: 'compute',
      data: { players: that.players,
              origin: origin }
    } );
  }

} // class WoodlandServerPerformance

export default WoodlandExperience;
