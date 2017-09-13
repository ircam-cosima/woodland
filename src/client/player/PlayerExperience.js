import * as soundworks from 'soundworks/client';

const client = soundworks.client;

const template = ``;

class PlayerExperience extends soundworks.Experience {
  /**
   * @constructs WoodlandClientPerformance
   * @param {Object} params passed to clientSide.Performance
   */
  constructor(assetsDomain, app) {
    super();

    const that = this;

    this.app = app;

    this.platform = this.require('platform', { features: ['web-audio'] });
    this.placer = this.require('placer');
    // this.checkin = this.require('checkin');
    this.sync = this.require('sync');
    this.audioBufferManager = this.require('audio-buffer-manager', {
      files: app.files.map(file => `sounds/${file}`),
      assetsDomain: assetsDomain,
    });

    this.compensation = {
      delay: 0,
      gain: 0
    };

    // this.calibration = new app.clientSide.Calibration( {
    //   updateFunction: () => {
    //     const calibration = that.calibration.get();
    //     that.compensation.delay = calibration.audio.delay;
    //     that.compensation.gain = calibration.audio.gain;
    //     app.debug('delay compensation: %s ms', 1000 * that.compensation.delay);
    //     app.debug('gain compensation: %s dB', that.compensation.gain);
    //   }
    // });

    this.acceleration = new app.input.Acceleration();

    this.shaker = new app.audio.ShakerSynth({
      acceleration: that.acceleration,
      gain: -that.compensation.gain
    });

    this.propagation = new app.audio.Propagation({ gain: -this.compensation.gain });

    this.analysis = new app.audio.Analysis( {
      // to compensate compensation, and boost
      gain: 6 + this.compensation.gain,
      analyser: {
        fftSize: 128,
        minDecibels: -100,
        maxDecibels: -50,
        smoothingTimeConstant: 0.2
      },
      sources: [
        this.shaker.masterGain,
        this.propagation.masterGain
      ],
      minFrequency: 200, // avoid first FFT bin
      maxFrequency: 8000
    } );

    this.audioFiles = [];
    this.audioBuffers = [];
    this.distances = null;

    this.audioVisualisation = this.audioVisualisation.bind(this);
    this.flatnessHandler = this.flatnessHandler.bind(this);
    this.launcherHandler = this.launcherHandler.bind(this);
  }

  /**
   * Start the performance module, and restore the calibration.
   */
  start() {
    super.start();

    const app = this.app;
    const that = this;
    // this.calibration.load();

    this.view = new soundworks.View(template, {}, {}, {
      id: 'player',
    });

    this.show().then(() => {
      this.display = {};

      this.display.background = new app.dom.Canvas( {
        DOMOrigin: this.view.$el,
        DOMClass: 'background'
      } );

      this.display.label = new app.dom.Text( {
        DOMOrigin: this.view.$el,
        DOMClass: 'label',
        text: '...',
        getter: () => { return client.label; }
      } );

      this.display.receiver = new app.dom.Text( {
        DOMOrigin: this.view.$el,
        DOMClass: 'receiver',
        text: '<strong>Good catch!<strong>'
      } );
      this.display.receiver.element.style.display = 'none';

      this.display.launcher = new app.dom.Text( {
        DOMOrigin: this.view.$el,
        DOMClass: 'launcher',
        text: '<strong>Your turn!<strong>'
      } );
      this.display.launcher.element.style.display = 'none';

      this.display.status = new app.dom.Text( {
        DOMOrigin: this.view.$el,
        DOMClass: 'status',
        text: ''
      } );

      this.display.label.update();
      this.display.background.resize();
      requestAnimationFrame(this.audioVisualisation);


      this.audioFiles = this.audioBufferManager.data;
      this.propagation.setSound(this.audioFiles[0]);

      this.receive('woodland:parameters', (params) => {
        if(typeof params.soundFile !== 'undefined') {
          const index = this.app.files.indexOf(params.soundFile);
          if(index !== -1) {
            this.propagation.setSound(this.audioBuffers[index]);
          }
        }

        if(typeof params.masterGain !== 'undefined') {
          this.propagation.masterGainSet(
            params.masterGain - this.compensation.gain);
        }
      });

      this.receive('woodland:receiver', (label) => {
        const enabled = client.label === label;
        this.app.debug('receiver: %s', enabled);

        if(enabled) {
          this.display.receiver.element.style.display = '';
        } else {
          this.display.receiver.element.style.display = 'none';
        }
      });

      this.receive('woodland:launcher', (label) => {
        // launcher time
        this.display.status.update('...');
        this.display.receiver.element.style.display = 'none';

        const enabled = client.label === label;
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

      this.receive('woodland:flatness-request', () => {
        this.acceleration.addListener(this.flatnessHandler);
      });

      console.log(this);

      this.receive('woodland:render', (time) => {
        this.display.status.update('rendering');

        this.propagation.render(
          this.sync.getAudioTime(time - this.compensation.delay),
          () => that.display.status.update('...')
        );
      });

      app.debug('checkin', client.index, client.label, client.coordinates);

      this.distances = new app.distances.Distances( {
        coordinates: client.coordinates
      } );

      app.workers.propagation.postMessage( {
        type: 'checkin',
        checkin: client.index,
        label: client.label
      } );

      app.workers.propagation.postMessage( {
        type: 'audio-sample-rate',
        data: app.audio.context.sampleRate
      } );

    });
  }

  audioVisualisation() {
    const amplitude = this.analysis.getAmplitude();
    this.display.background.fillRGB([ amplitude, amplitude, amplitude]);
    requestAnimationFrame(this.audioVisualisation);
  }

  launcherHandler(event) {
    const app = this.app;
    // little less than 2g (which is the maximum of some sensors)
    if(Math.abs(event.y) > 18) {
      this.shaker.stop();
      this.acceleration.removeListener(this.launcherHandler);
      app.debug('launched');
      this.display.status.update('launched');
      this.send('woodland:launched');
    }
  }

  flatnessHandler(event) {
    const app = this.app;
    // once
    this.acceleration.removeListener(this.flatnessHandler);
    const flatness
            = Math.min(9.8,
                       Math.max(0,
                                Math.sqrt(event.z * event.z)
                                - Math.sqrt(event.x * event.x + event.y * event.y) ) );
    app.debug('flatness: %s', flatness);
    this.send('woodland:flatness', flatness);
  }

}

export default PlayerExperience;
