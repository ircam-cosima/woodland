'use strict';

const path = require('path');
const childProcess = require('child_process');

let processes = {};

processes.Manager = class {
  constructor(mainProcess) {
    this.process = mainProcess;
    this.debugPort = (this.process.execArgv.indexOf('--debug') !== -1
                      || this.process.execArgv.indexOf('--debug=5858') !== -1
                      || this.process.execArgv.indexOf('--debug-brk') !== -1
                      || this.process.execArgv.indexOf('--debug-brk=5858') !== -1
                      ? 5858
                      : -1);
    this.children = [];
    this.process.on('exit', () => { this.terminate(); } );
  }

  fork(script) {
    if(this.debugPort !== -1) {
      ++this.debugPort;
      this.process.execArgv.push('--debug=' + this.debugPort);
    }
    var child = childProcess.fork(path.join(__dirname, script) );
    this.children.push(child);
    if(this.debugPort !== -1) {
      this.process.execArgv.pop();
    }
    return child;
  }

  terminate() {
    for(var c of this.children){
      c.disconnect();
    }
  }

};


module.exports = exports = processes;
