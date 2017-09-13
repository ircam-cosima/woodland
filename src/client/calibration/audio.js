let audio = require('../../shared/audio');
let utils = require('../../shared/utils');

audio.Synth = class {
  constructor(sync) {
    this.sync = sync;

    this.clickBuffer = audio.generateClickBuffer();
    this.clackBuffer = audio.generateClackBuffer();
    this.noiseBuffer = audio.generateNoiseBuffer();
  }

  play(params = {}) {
    const type = params.type || 'click';
    const start = (typeof params.start !== undefined ? params.start : 0);
    const gain = (typeof params.gain !== undefined ? params.gain : 0);
    const duration = params.duration; // undefined is possible

    let bufferSource = audio.context.createBufferSource();

    switch(type) {
    case 'click':
      bufferSource.buffer = this.clickBuffer;
      break;
    case 'clack':
      bufferSource.buffer = this.clackBuffer;
      break;
    case 'noise':
      bufferSource.buffer = this.noiseBuffer;
    }

    const gainNode = audio.context.createGain();
    gainNode.gain.value = utils.dBToLin(gain);

    bufferSource.connect(gainNode);
    gainNode.connect(audio.context.destination);

    const localTime = Math.max(0, this.sync.getLocalTime(start));
    bufferSource.start(localTime);
    if(typeof duration !== 'undefined') {
      bufferSource.stop(localTime + duration);
    }
  }

};

module.exports = exports = audio;
