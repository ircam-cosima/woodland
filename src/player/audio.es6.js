'use strict';

let audio = require('../common/audio');
let utils = require('../common/utils');


const debug = require('debug')('soundworks:woodland:audio');

audio.ShakerSynth = class {
  constructor(params = {}) {
    this.acceleration = params.acceleration;
    const gain = (typeof params.gain !== 'undefined'
                  ? params.gain
                  : 0);

    this.noiseBuffer = this.generateNoiseBuffer();
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
    this.masterGainSet(gain);

    this.highpass.connect(this.masterGain);

    this.masterGain.connect(audio.context.destination);

    this.accelerationHandler = this.accelerationHandler.bind(this);
  }

  masterGainSet(masterGain) {
    this.masterGain.gain.value = utils.dBToLin(masterGain);
  }

  generateNoiseBuffer () {
    const duration = 3; // second
    const gain = -10; // dB

    const length = duration * audio.context.sampleRate;
    const amplitude = utils.dBToLin(gain);
    const channelCount = audio.context.destination.channelCount;
    let buffer = audio.context.createBuffer(channelCount, length,
                                            audio.context.sampleRate);
    for(let c = 0; c < channelCount; ++c) {
      let data = buffer.getChannelData(c);
      for(let i = 0; i < length; ++i) {
        data[i] = amplitude * (Math.random() * 2 - 1);
      }
    }
    return buffer;
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
    this.masterGain.gain.linearRampToValueAtTime(1, now + fadeInDuration);

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
      this.masterGain.gain.setValueAtTime(1, now);
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

    this.propagationBuffer = null;

    this.convolver = audio.context.createConvolver();
    this.convolver.buffer = audio.generateClackBuffer(); // source sound

    this.masterGain = audio.context.createGain();
    this.masterGainSet(gain);

    this.convolver.connect(this.masterGain);

    this.masterGain.connect(audio.context.destination);

    this.sourcesInit();
  }

  masterGainSet(masterGain) {
    this.masterGain.gain.value = utils.dBToLin(masterGain);
  }

  sourcesInit() {
    this.sources = [];
    this.sourcesDelayMax = 0;
  }

  sourcesAdd(sources) {
    for(let s = 0; s < sources.length; ++s) {
      this.sources.push(sources[s]);
      this.sourcesDelayMax = Math.max(this.sourcesDelayMax, sources[s][1]);
    }
  }

  sourcesApply() {
    const sampleRate = audio.context.sampleRate;

    // single channel
    this.propagationBuffer = audio.context.createBuffer(
      1,
      Math.max(2, // iOS does not play a single-sample buffer
               // including last value
               1 + Math.ceil(this.sourcesDelayMax * sampleRate)),
      sampleRate);

    const data = this.propagationBuffer.getChannelData(0);
    debug('setting sources');
    for(let s = 0; s < this.sources.length; ++s) {
      data[Math.floor(this.sources[s][1] * sampleRate)] = this.sources[s][0];
    }
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
      if(typeof callback !== 'undefined') {
        propagation.onended = callback;
      }
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
