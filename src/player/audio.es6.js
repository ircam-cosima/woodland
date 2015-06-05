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
    this.masterGain.value = utils.dBToLin(gain);

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
    this.masterGain.gain.value = utils.dBToLin(gain);

    this.convolver.connect(this.masterGain);

    this.masterGain.connect(audio.context.destination);
  }

  masterGainSet(masterGain) {
    this.masterGain.gain.value = utils.dBToLin(masterGain);
  }

  set(sources) {
    // [distance, gain, delay]
    const maxDelay = sources.reduce( (max, element) => {
      return element[2] > max ? element[2] : max;
    }, 0);

    const sampleRate = audio.context.sampleRate;

    // single channel
    this.propagationBuffer = audio.context.createBuffer(
      1,
      Math.max(2, // iOS does not play a single-sample buffer
               1 + maxDelay * sampleRate), // including last value
      sampleRate);

    const data = this.propagationBuffer.getChannelData(0);
    for(let s = 0; s < sources.length; ++s) {
      data[Math.floor(sources[s][2] * sampleRate)] = sources[s][1];
    }

  }

  setSound(buffer) {
    this.convolver.buffer = buffer;
  }


  render(time, callback) {
    const propagation = audio.context.createBufferSource();
    propagation.buffer = this.propagationBuffer;
    propagation.connect(this.convolver);

    if(typeof callback !== 'undefined') {
      propagation.onended = callback;
    }
    propagation.start(time);
  }

};


module.exports = exports = audio;
