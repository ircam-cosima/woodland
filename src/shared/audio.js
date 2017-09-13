'use strict';

const utils = require('./utils');

let audio = {};

audio.context = require('soundworks/client').audioContext;

audio.cloneBuffer = function(original) {
  const copy = audio.context.createBuffer(
    original.numberOfChannels,
    Math.round(original.duration * original.sampleRate),
    original.sampleRate);

  for(let c = 0; c < original.numberOfChannels; ++c) {
    const copyData = copy.getChannelData(c);
    copyData.set(original.getChannelData(c) );
  }
  return copy;
};

audio.playBuffer = function (buffer) {
  const source = audio.context.createBufferSource();
  source.buffer = buffer;
  source.connect(audio.context.destination);
  source.start(0);
};

audio.generateDiracBuffer = function () {
  const length = 1;
  const channels = 1;
  const gain = 0; // dB

  let buffer = audio.context.createBuffer(channels, length,
                                          audio.context.sampleRate);
  let data = buffer.getChannelData(0);

  const amplitude = utils.dBToLin(gain);
  data[0] = amplitude;

  return buffer;
};


audio.generateClickBuffer = function () {
  const length = 2;
  const channels = 1;
  const gain = -10; // dB

  let buffer = audio.context.createBuffer(channels, length,
                                          audio.context.sampleRate);
  let data = buffer.getChannelData(0);

  const amplitude = utils.dBToLin(gain);
  data[0] = amplitude;
  data[1] = -amplitude;

  return buffer;
};

audio.generateClackBuffer = function () {
  const length = 5;
  const channels = 1;
  const gain = -10; // dB

  let buffer = audio.context.createBuffer(channels, length,
                                          audio.context.sampleRate);
  const amplitude = utils.dBToLin(gain);
  let data = buffer.getChannelData(0);

  for(let i = 0; i < length; ++i) {
    data[i] = amplitude; // sic
  }

  return buffer;
};

audio.generateNoiseBuffer = function () {
  const duration = 0.5; // second
  const gain = -30; // dB

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
};


module.exports = exports = audio;
