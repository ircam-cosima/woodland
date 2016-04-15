'use strict';

let audio = require('../common/audio');
let utils = require('../common/utils');


const debug = require('debug')('soundworks:woodland:audio');

audio.ShakerSynth = class {
  constructor(params = {}) {
    this.acceleration = params.acceleration;
    this.gain = utils.dBToLin(typeof params.gain !== 'undefined'
                              ? params.gain
                              : 0);

    this.noiseBuffer = audio.generateNoiseBuffer();
    this.bufferSource = null;

    this.minCutoff = 10;
    this.maxCutoff = 20000;
    this.logCutoffRatio = Math.log(this.maxCutoff / this.minCutoff);

    this.lowpass = audio.context.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = this.maxCutoff;
    this.lowpass.Q.value = 3;

    this.highpass = audio.context.createBiquadFilter();
    this.highpass.type = 'highpass';
    this.highpass.frequency.value = this.minCutoff;
    this.highpass.Q.value = 0.001;

    this.lowpass.connect(this.highpass);

    this.masterGain = audio.context.createGain();

    this.highpass.connect(this.masterGain);

    this.masterGain.connect(audio.context.destination);

    this.accelerationHandler = this.accelerationHandler.bind(this);
  }

  accelerationHandler(event) {
    // debug('acceleration: %s, %s, %s', event.x, event.y, event.z);
    const accelerationMax = 9.7 * 2;
    const accelerationMaxInv = 1 / accelerationMax;
    const value = Math.min(accelerationMax,
                           Math.sqrt(event.x * event.x + event.y * event.y
                                     + event.z * event.z) )
            * accelerationMaxInv;

    this.lowpass.frequency.value = this.minCutoff
      * Math.exp(this.logCutoffRatio * value);
  }

  start() {
    const now = audio.context.currentTime;
    const fadeInDuration = 1;

    const source = audio.context.createBufferSource();

    // play current waveform at given time
    source.buffer = this.noiseBuffer;
    source.loop = true;
    source.connect(this.lowpass);
    source.start(audio.context.currentTime);
    this.bufferSource = source;

    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(0, now);
    this.masterGain.gain.linearRampToValueAtTime(this.gain,
                                                 now + fadeInDuration);

    this.highpass.frequency.cancelScheduledValues(now);
    this.highpass.frequency.setValueAtTime(this.maxCutoff, now);
    this.highpass.frequency.exponentialRampToValueAtTime(this.minCutoff,
                                                         now + fadeInDuration);

    this.acceleration.addListener(this.accelerationHandler);
  }

  stop() {
    if(this.bufferSource !== null) {
      const now = audio.context.currentTime;
      const fadeOutDuration = 1;
      this.acceleration.removeListener(this.accelerationHandler);

      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.gain, now);
      this.masterGain.gain.linearRampToValueAtTime(0, now + fadeOutDuration);

      this.highpass.frequency.cancelScheduledValues(now);
      this.highpass.frequency.setValueAtTime(this.minCutoff, now);
      this.highpass.frequency.exponentialRampToValueAtTime(this.maxCutoff,
                                                           now + fadeOutDuration);

      this.bufferSource.stop(now + fadeOutDuration);
      this.bufferSource = null;
    }
  }
};

audio.Propagation = class {
  constructor(params = {}) {
    const gain = (typeof params.gain !== 'undefined'
                  ? params.gain
                  : 0);

    // pre-allocation
    this.propagationBuffer = audio.context.createBuffer(
      1, // single channel
      audio.context.sampleRate * 60, // 60 seconds is the hard limit
      audio.context.sampleRate);

    // actual duration
    this.propagationDuration = 0; // in seconds

    this.convolver = audio.context.createConvolver();
    this.convolver.buffer = audio.generateClackBuffer(); // source sound

    this.masterGain = audio.context.createGain();
    this.masterGainSet(gain);

    this.convolver.connect(this.masterGain);

    this.masterGain.connect(audio.context.destination);
  }

  masterGainSet(masterGain) {
    this.masterGain.gain.value = utils.dBToLin(masterGain);
  }

  // TODO: re-use the same buffer, to avoid memory allocation
  sourcesApply(samples, sampleRate) {
    if(sampleRate !== audio.context.sampleRate) {
      debug('sources sample rate (%) differs from audio sample rate (%s)',
            sampleRate, audio.context.sampleRate);
    }

    this.propagationDuration = samples.length / audio.context.sampleRate;

    const data = this.propagationBuffer.getChannelData(0);
    data.set(samples);
    debug('sources set');
  }

  setSound(buffer) {
    if(buffer !== this.convolver.buffer) {
      this.convolver.buffer = buffer;
    }
  }

  render(time, callback) {
    if(this.propagationBuffer !== null) {
      const propagation = audio.context.createBufferSource();
      propagation.buffer = this.propagationBuffer;
      propagation.connect(this.convolver);

      propagation.start(time);
      // stop as (recycled) buffer might be longer
      propagation.stop(time + this.propagationDuration);

      setTimeout(callback,
                 1e3 * (time - audio.context.currentTime
                         + this.propagationDuration) );
    }
  }

};

audio.Analysis = class {
  constructor(params = {}) {
    this.masterGain = audio.context.createGain();
    this.masterGain.gain.value = (typeof params.gain !== 'undefined'
                             ? utils.dBToLin(params.gain)
                             : 1);

    this.analyser = audio.context.createAnalyser();
    this.masterGain.connect(this.analyser);

    if(typeof params.analyser !== 'undefined') {
      for(let a in params.analyser) {
        if(params.analyser.hasOwnProperty(a) ) {
          this.analyser[a] = params.analyser[a];
        }
      }
    }

    this.minBin = (typeof params.minFrequency !== 'undefined'
                   ? Math.max(0,
                              Math.min(this.analyser.frequencyBinCount,
                                       Math.round(params.minFrequency * this.analyser.fftSize
                                                  / audio.context.sampleRate) ) )
                   : 0);

    this.maxBin = (typeof params.maxFrequency !== 'undefined'
                   ? Math.max(this.minBin,
                              Math.min(this.analyser.frequencyBinCount - 1,
                                       Math.round(params.maxFrequency * this.analyser.fftSize
                                                  / audio.context.sampleRate) ) )
                   : this.analyser.frequencyBinCount - 1);

    this.binsNormalisation = 1 / (this.maxBin - this.minBin + 1);

    // pre-allocation
    this.magnitudes = new Uint8Array(this.analyser.frequencyBinCount);

    this.sourcesOld = undefined;
    this.connect(params);
  }

  connect(params = {}) {
    this.disconnect();
    this.sources = params.sources;

    if(typeof this.sources !== 'undefined') {
      for(let s of this.sources) {
        s.connect(this.masterGain);
      }
    }
  }

  disconnect() {
    if(typeof this.sources !== 'undefined') {
      for(let s of this.sources) {
        s.disconnect(this.masterGain);
      }
    }
    this.sourcesOld = this.sources;
    this.sources = undefined;
  }

  reconnect() {
    this.connect({ sources: this.sourcesOld });
  }

  getAmplitude() {
    let amplitude = 0;
    if(typeof this.sources !== 'undefined') {
      this.analyser.getByteFrequencyData(this.magnitudes);

      for(let i = this.minBin; i <= this.maxBin; ++i) {
        amplitude += this.magnitudes[i];
      }
      amplitude *= this.binsNormalisation;
    }

    return Math.floor(amplitude);
  }

};


module.exports = exports = audio;
