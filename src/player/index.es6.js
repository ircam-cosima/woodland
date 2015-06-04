'use strict';

let app = window.app || {};

app.debug = require('debug')('soundworks:woodland');
app.platform = require('platform');

app.clientSide = require('soundworks/client');
app.client = app.clientSide.client;

app.audio = require('./audio');
app.dom = require('../common/dom');
app.input = require('../common/acceleration');
app.distances = require('../common/distances');

// Initialise the client with its type
// ('player' clients connect via the root URL)
app.client.init('player');

class WoodlandClientPerformance extends app.clientSide.Performance {
  /**
   * @constructs WoodlandClientPerformance
   * @param {Object} params passed to clientSide.Performance
   */
  constructor(setup, checkin) {
    super();
    const that = this;

    this.setup = setup;
    this.checkin = checkin;

    this.display = {};
    this.display.label = new app.dom.Text( {
      DOMOrigin: that.view,
      DOMClass: 'label',
      text: '...',
      getter: () => { return that.checkin.label; }
    } );

    this.display.receiver = new app.dom.Text( {
      DOMOrigin: that.view,
      DOMClass: 'receiver',
      text: '<strong>Good catch!<strong>'
    } );
    this.display.receiver.element.style.display = 'none';

    this.display.launcher = new app.dom.Text( {
      DOMOrigin: that.view,
      DOMClass: 'launcher',
      text: '<strong>Your turn!<strong>'
    } );
    this.display.launcher.element.style.display = 'none';

    this.display.status = new app.dom.Text( {
      DOMOrigin: that.view,
      DOMClass: 'status',
      text: ''
    } );

    this.compensation = {
      delay: 0,
      gain: 0
    };

    this.calibration = new app.clientSide.Calibration( {
      updateFunction: () => {
        const calibration = that.calibration.get();
        that.compensation.delay = calibration.audio.delay;
        that.compensation.gain = calibration.audio.gain;
        app.debug('compensation: %s', that.compensation);
      }
    });
    this.sync = new app.clientSide.Sync();
    this.syncStatus = 'new';

    this.acceleration = new app.input.Acceleration();

    this.shaker = new app.audio.ShakerSynth({
      acceleration: that.acceleration,
      gain: -that.compensation.gain
    });

    this.propagation = new app.audio.Propagation({gain: -this.compensation.gain});

    this.audioFiles = [];
    this.audioBuffers = [];

    const sounds = ['pot-hit-1_c.mp3', 'pot-hit-2_c.mp3'];
    for(let i = 0; i < sounds.length; i++) {
      this.audioFiles.push('sounds/' + sounds[i]);
    }
    this.loader = new app.clientSide.Loader({
      files: this.audioFiles
    });

    this.loader.on('loader:allFilesLoaded', () => {
      for(let i = 0; i < sounds.length; i++) {
        const sound = sounds[i];
        this.audioBuffers[i] = this.loader.buffers[i];
      }

      this.propagation.setSound(this.audioBuffers[0]);
    });

    app.client.receive('woodland:parameters', (params) => {
      if(typeof params.masterGain !== 'undefined') {
        this.propagation.masterGainSet(
          params.masterGain - this.compensation.gain);
      }
    });

    app.client.receive('woodland:receiver', (label) => {
      const enabled = this.checkin.label === label;
      app.debug('receiver: %s', enabled);
      if(enabled) {
        this.display.receiver.element.style.display = '';
      } else {
        this.display.receiver.element.style.display = 'none';
      }
    });

    app.client.receive('woodland:launcher', (label) => {
      // launcher time
      this.display.receiver.element.style.display = 'none';

      const enabled = this.checkin.label === label;
      app.debug('launcher: %s', enabled);
      if(enabled) {
        this.shaker.start();
        this.acceleration.addListener(this.launcherHandler);
        this.display.launcher.element.style.display = '';
      } else {
        this.shaker.stop();
        this.acceleration.removeListener(this.launcherHandler);
        this.display.launcher.element.style.display = 'none';
      }
    });

    app.client.receive('woodland:flatness-request', () => {
      this.acceleration.addListener(this.flatnessHandler);
    });

    app.client.receive('woodland:propagate', (sources) => {
      this.display.status.update('propagating');
      this.propagation.set(sources);
      app.client.send('woodland:propagated');
      this.display.status.update('propagated');
    } );

    app.client.receive('woodland:render', (time) => {
      this.propagation.render(
        this.sync.getLocalTime(time - this.compensation.delay),
        () => {
          this.display.status.update('...');
      });
      this.display.status.update('rendering');
    });

    this.distances = null;

    this.flatnessHandler = this.flatnessHandler.bind(this);
    this.launcherHandler = this.launcherHandler.bind(this);
  }

  /**
   * Start the performance module, and restore the calibration.
   */
  start() {
    super.start();
    const that = this;
    app.debug('checkin', this.checkin.index, this.checkin.label,
              app.client.coordinates);
      this.distances = new app.distances.Distances( {
        coordinates: that.setup.coordinates
      } );

    this.calibration.load();
    this.display.label.update();
  }

  launcherHandler(event) {
    // little less than 2g (which is the maximum of some sensors)
    if(Math.abs(event.y) > 18) {
      this.shaker.stop();
      this.acceleration.removeListener(this.launcherHandler);
      app.debug('launched');
      app.client.send('woodland:launched');
      this.display.status.update('launched');
    }
  }

  flatnessHandler(event) {
    // once
    this.acceleration.removeListener(this.flatnessHandler);
    const flatness
            = Math.min(9.8,
                       Math.max(0,
                                Math.sqrt(event.z * event.z)
                                - Math.sqrt(event.x * event.x + event.y * event.y) ) );
    app.debug('flatness: %s', flatness);
    app.client.send('woodland:flatness', flatness);
  }

}

app.init = function () {
  const welcome = new app.clientSide.Dialog({
    id: 'welcome',
    text: '<p>Welcome to <b>Woodland</b>.</p> <p>Touch the screen to start.</p>',
    activateAudio: true
  });

  app.setup = new app.clientSide.Setup();
  app.checkin = new app.clientSide.Checkin();

  app.performance = new WoodlandClientPerformance(app.setup, app.checkin);

  // Start the scenario and link the modules
  app.client.start(
    app.client.serial(
      welcome,
      app.client.parallel(
        app.setup,
        app.checkin,
        app.performance.calibration,
        app.performance.sync,
        app.performance.loader
      ),
      app.performance // when all of them are done, we launch the performance
    )
  );

};

window.app = app;

window.addEventListener('DOMContentLoaded', () => {
  app.init();
});
