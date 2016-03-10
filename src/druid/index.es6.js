'use strict';

let app = window.app || {};

app.debug = require('debug')('soundworks:woodland');
app.platform = require('platform');

app.clientSide = require('soundworks/client');
app.client = app.clientSide.client;

app.dom = require('./dom');
app.files = require('../common/files');

// Initialise the client with its type
// ('player' clients connect via the root URL)
app.client.init('druid');

class DruidClientPerformance extends app.clientSide.Performance {
  constructor(options = {}) {
    super(options);
    const that = this;

    this.display = {};

    this.preset = 'default';
    this.display.presets = new app.dom.Presets( {
      DOMOrigin: this.view,
      options: [],
      setter: (preset) => {
        that.preset = preset;
        for(let v in that.presets[preset]) {
          this[v] = that.presets[preset][v];
        }
        that.parametersSend();
      },
      getter: () => { return that.preset; },
      save: () => {
        const name = window.prompt('Save preset? \n'
                                   +'(Do not change the name to update.)',
                                   that.preset);
        if(name) {
          that.presetSave(name);
        }
      },
    });

    this.display.render = new app.dom.Button( {
      DOMOrigin: this.view,
      DOMClass: 'render',
      text: 'Render',
      setter: () => { that.renderRequest(); }
    } );

    this.soundFile = app.files.sounds[0];
    this.display.soundFile = new app.dom.Select( {
      DOMOrigin: this.view,
      DOMClass: 'sound-file',
      options: app.files.sounds,
      setter: (value) => {
        that.soundFile = value;
        that.parametersSend();
      },
      getter: () => { return that.soundFile; }
    } );

    this.receiver = '';
    this.display.receiverElement = app.dom.createReceiverElement(this.view);

    this.launcher = '';
    this.display.launcher = new app.dom.ExclusiveToggles( {
      DOMOrigin: this.view,
      DOMClass: 'launcher',
      setter: (value) => { that.launcherSet(value); },
      getter: () => { return that.launcher; }
    } );

    this.masterGain = 0;
    this.display.masterGain = new app.dom.MasterGain( {
      DOMOrigin: that.view,
      setter: (value) => {
        that.masterGain = parseFloat(value);
        that.parametersSend();
      },
      getter: () => { return that.masterGain; }
    } );

    this.gainThreshold = 0;
    this.display.gainThreshold = new app.dom.GainThreshold( {
      DOMOrigin: that.view,
      setter: (value) => {
        that.gainThreshold = parseFloat(value);
        that.parametersSend();
      },
      getter: () => { return that.gainThreshold; }
    } );

    this.delayThreshold = 0;
    this.display.delayThreshold = new app.dom.DelayThreshold( {
      DOMOrigin: that.view,
      setter: (value) => {
        that.delayThreshold = parseFloat(value);
        that.parametersSend();
      },
      getter: () => { return that.delayThreshold; }
    } );

    this.airSpeed = 0;
    this.display.airSpeed = new app.dom.AirSpeed( {
      DOMOrigin: that.view,
      setter: (value) => {
        that.airSpeed = parseFloat(value);
        that.parametersSend();
      },
      getter: () => { return that.airSpeed; }
    } );

    this.distanceSpread = 0;
    this.display.distanceSpread = new app.dom.DistanceSpread( {
      DOMOrigin: that.view,
      setter: (value) => {
        that.distanceSpread = parseFloat(value);
        that.parametersSend();
      },
      getter: () => { return that.distanceSpread; }
    } );

    this.reflectionTransmission = 0;
    this.display.reflectionTransmission = new app.dom.ReflectionTransmission( {
      DOMOrigin: that.view,
      setter: (value) => {
        that.reflectionTransmission = parseFloat(value);
        that.parametersSend();
      },
      getter: () => { return that.reflectionTransmission; }
    } );

    this.launcher = '';
    this.labels = [];

  }

  presetsUpdate(presets) {
    this.presets = presets;
    const that = this;
    const options = [];
    for(let p in presets) {
      if(presets.hasOwnProperty(p) ) {
        options.push(p);
      }
    }
    options.sort();

    this.display.presets.setOptions(options);
  }

  presetSave(presetName) {
    this.presets[presetName] = {
      soundFile: this.soundFile,
      masterGain: this.masterGain,
      gainThreshold: this.gainThreshold,
      delayThreshold: this.delayThreshold,
      airSpeed: this.airSpeed,
      distanceSpread: this.distanceSpread,
      reflectionTransmission: this.reflectionTransmission,
    };

    app.client.send('woodland:druid-presets', this.presets);
  }

  labelsUpdate(labels) {
    this.labels = labels.slice(0);
    this.labels.unshift('none');
    this.display.launcher.setOptions(this.labels);
  }

  launcherUpdate(label) {
    this.launcher = label;
    this.display.launcher.update();
  }

  launcherSet(label) {
    this.launcherUpdate(label);
    app.client.send('woodland:launcher', this.launcher);
  }

  parametersSend() {
    app.client.send('woodland:parameters', {
      soundFile: this.soundFile,
      masterGain: this.masterGain,
      gainThreshold: this.gainThreshold,
      delayThreshold: this.delayThreshold,
      airSpeed: this.airSpeed,
      distanceSpread: this.distanceSpread,
      reflectionTransmission: this.reflectionTransmission
    } );

  }

  renderRequest() {
    app.client.send('woodland:render-request');
  }

  start() {
    super.start();
    const that = this;

    app.client.receive('woodland:parameters', (params) => {
      if(typeof params.soundFile !== 'undefined') {
        that.soundFile = params.soundFile;
        that.display.soundFile.update();
      }

      if(typeof params.masterGain !== 'undefined') {
        that.masterGain = params.masterGain;
        that.display.masterGain.update();
      }

      if(typeof params.gainThreshold !== 'undefined') {
        that.gainThreshold = params.gainThreshold;
        that.display.gainThreshold.update();
      }

      if(typeof params.delayThreshold !== 'undefined') {
        that.delayThreshold = params.delayThreshold;
        that.display.delayThreshold.update();
      }

      if(typeof params.airSpeed !== 'undefined') {
        that.airSpeed = params.airSpeed;
        that.display.airSpeed.update();
      }

      if(typeof params.distanceSpread !== 'undefined') {
        that.distanceSpread = params.distanceSpread;
        that.display.distanceSpread.update();
      }

      if(typeof params.reflectionTransmission !== 'undefined') {
        that.reflectionTransmission = params.reflectionTransmission;
        that.display.reflectionTransmission.update();
      }
    } );
    app.client.send('woodland:parameters-request');

    app.client.receive('woodland:druid-presets', (presets) => {
      this.presetsUpdate(presets);
    });
    app.client.send('woodland:druid-presets-request');

    app.client.receive('woodland:receiver', (label) => {
      app.dom.updateReceiverElement(this.display.receiverElement, label);
    });
    app.client.send('woodland:receiver-request');

    app.client.receive('woodland:launcher', (label) => {
      this.launcherUpdate(label);
    });
    app.client.send('woodland:launcher-request');

    app.client.receive('woodland:labels', (labels) => {
      this.labelsUpdate(labels);
    });
    app.client.send('woodland:labels-request');
  }

}

app.init = function () {
  app.performance = new DruidClientPerformance();

  // Start the scenario and link the modules
  app.client.start(
    app.performance
  );

};

window.app = app;

window.addEventListener('DOMContentLoaded', () => {
  app.init();
});
