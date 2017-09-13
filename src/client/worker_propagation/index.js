'use strict';

function debug(message) {
  self.postMessage( {type: 'debug', data: message} );
}

const socketLocation = self.location.protocol + '//'
      + self.location.hostname + ':' + '8887';
debug('socket for worker_propagation: ' + socketLocation);
const socket = require('socket.io-client')(socketLocation);

let checkin;
let label;

let sources = [];
let sourcesDelayMax = 0;

let audioSampleRate = 44100;

socket.on('test', (data) => {
  debug('test: ' + JSON.stringify(data) );
} );

socket.on('woodland:checkin-request', () => {
  socket.emit('woodland:checkin', { checkin: checkin, label: label } );
} );

socket.on('woodland:sources-init', () => {
  debug('sources-init');
  sources = [];
  sourcesDelayMax = 0;
  self.postMessage('sources-init');
} );

socket.on('woodland:sources-add', (data) => {
  debug('sources-add: ' + data.length);
  for(let s = 0; s < data.length; ++s) {
    sources.push(data[s]);
    sourcesDelayMax = Math.max(sourcesDelayMax, data[s][1]);
  }
  self.postMessage('sources-add');
} );

socket.on('woodland:sources-done', () => {
  debug('sources-done');

  const samples = new Float32Array(
    Math.max(2, // iOS does not play a single-sample buffer
             // one more after last value
             1 + Math.ceil(sourcesDelayMax * audioSampleRate) ) );

  for(let s = 0; s < sources.length; ++s) {
     samples[Math.floor(sources[s][1] * audioSampleRate)] = sources[s][0];
   }

  self.postMessage( {
    type: 'sources-apply',
    samples: samples,
    sampleRate: audioSampleRate
  } );

} );

self.onmessage = (m) => {
  switch(m.data.type) {
    case 'checkin':
      checkin = m.data.checkin;
      label = m.data.label;
      debug('chekin: ' + checkin + ', label: ' + label);
      socket.emit('woodland:checkin', { checkin: checkin, label: label } );
      break;

    case 'audio-sample-rate':
      debug('audio sample rate: ' + m.data.data);
      audioSampleRate = m.data.data;
      break;
  }
};
