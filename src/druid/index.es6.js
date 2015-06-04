'use strict';

let app = window.app || {};

app.debug = require('debug')('soundworks:woodland');
app.platform = require('platform');

app.clientSide = require('soundworks/client');
app.client = app.clientSide.client;

app.dom = require('./dom');

// Initialise the client with its type
// ('player' clients connect via the root URL)
app.client.init('druid');

class DruidClientPerformance extends app.clientSide.Performance {
  /**
   * @constructs CalibrationClient
   * @param {Object} options passed to clientSide.Performance
   */
  constructor(options = {}) {
    super(options);
    const that = this;

    this.display = {};

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

    this.airAbsorption = 0;
    this.display.airAbsorption = new app.dom.AirAbsorption( {
      DOMOrigin: that.view,
      setter: (value) => {
        that.airAbsorption = parseFloat(value);
        that.parametersSend();
      },
      getter: () => { return that.airAbsorption; }
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

  labelsUpdate(labels) {
    this.labels = labels;
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
      masterGain: this.masterGain,
      gainThreshold: this.gainThreshold,
      delayThreshold: this.delayThreshold,
      airSpeed: this.airSpeed,
      airAbsorption: this.airAbsorption,
      reflectionTransmission: this.reflectionTransmission
    } );

  }

  start() {
    super.start();
    const that = this;

    app.client.receive('woodland:parameters', (params) => {
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

      if(typeof params.airAbsorption !== 'undefined') {
        that.airAbsorption = params.airAbsorption;
        that.display.airAbsorption.update();
      }

      if(typeof params.reflectionTransmission !== 'undefined') {
        that.reflectionTransmission = params.reflectionTransmission;
        that.display.reflectionTransmission.update();
      }
    } );
    app.client.send('woodland:parameters-request');


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
