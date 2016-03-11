'use strict';

let dom = require('../common/dom');

dom.Presets = class {
  constructor(params) {
    this.setter = params.setter; // undefined is fine
    this.getter = params.getter; // undefined is fine
    this.save = params.save;

    const origin = (typeof params.DOMOrigin !== 'undefined'
                   ? params.DOMOrigin : document.body);

    this.element = document.createElement('div');
    this.element.classList.add('presets');
    origin.appendChild(this.element);

    const child = document.createElement('div');
    child.innerHTML = 'Preset ';
    this.element.appendChild(child);

    const that = this; // problem with gulp-es6-transpiler 1.0.1

    that.select = new dom.Select( {
      DOMOrigin: this.element,
      DOMClass: 'preset',
      options: params.options,
      setter: that.setter,
      getter: that.getter,
    });

    that.saveButton = new dom.Button({
      DOMOrigin: this.element,
      DOMClass: 'save',
      text: 'Save',
      setter: that.save,
    });

  }

  setOptions(options) {
    this.select.setOptions(options);
  }

  update() {
    this.select.update();
  }
};



dom.createReceiverElement = function (origin) {
  const element = document.createElement('div');
  element.classList.add('receiver');
  element.innerHTML = 'Receiver: ';
  origin.appendChild(element);

  return element;
};

dom.updateReceiverElement = function(element, receiver) {
  element.innerHTML = 'Receiver: ' + receiver;
};

dom.MasterGain = class {
  constructor(params) {
    this.setter = params.setter; // undefined is fine
    this.getter = params.getter; // undefined is fine

    const origin = (typeof params.DOMOrigin !== 'undefined'
                   ? params.DOMOrigin : document.body);

    this.element = document.createElement('div');
    this.element.classList.add('master-gain');
    origin.appendChild(this.element);

    let child = document.createElement('div');
    child.innerHTML = 'Master gain ';
    this.element.appendChild(child);

    const that = this; // problem with gulp-es6-transpiler 1.0.1
    this.input = new dom.Input( {
      DOMOrigin: this.element,
      DOMAttributes: {
        type: 'number',
        step: '1',
        max: '+300',
        min: '-30'
      },
      setter: that.setter,
      getter: that.getter
    } );

    child = document.createElement('div');
    child.innerHTML = ' dB';
    this.element.appendChild(child);

    child = document.createElement('br');
    this.element.appendChild(child);

    for(let v of [-10, -5, -1]) {
      child = new dom.Button( {
        DOMOrigin: this.element,
        DOMClass: 'input-control',
        text: v.toString(),
        setter: () => { // eslint-disable-line no-loop-func
          that.setter(that.getter() + v);
          that.input.update();
        }
      } );
    }

    child = new dom.Button( {
      DOMOrigin: this.element,
      DOMClass: 'input-control',
      text: '=0',
      setter: () => {
        that.setter(0);
        that.input.update();
      }
    } );

    for(let v of [1, 5, 10]) {
      child = new dom.Button( {
        DOMOrigin: this.element,
        DOMClass: 'input-control',
        text: '+' + v.toString(),
        setter: () => { // eslint-disable-line no-loop-func
          that.setter(that.getter() + v);
          that.input.update();
        }
      } );
    }

    child = document.createElement('br');
    this.element.appendChild(child);

  }

  update() {
    this.input.update();
  }

}; // MasterGain


dom.GainThreshold = class {
  constructor(params) {
    this.setter = params.setter; // undefined is fine
    this.getter = params.getter; // undefined is fine

    const origin = (typeof params.DOMOrigin !== 'undefined'
                   ? params.DOMOrigin : document.body);

    this.element = document.createElement('div');
    this.element.classList.add('gain-threshold');
    origin.appendChild(this.element);

    let child = document.createElement('div');
    child.innerHTML = 'Gain threshold ';
    this.element.appendChild(child);

    const that = this; // problem with gulp-es6-transpiler 1.0.1
    this.input = new dom.Input( {
      DOMOrigin: this.element,
      DOMAttributes: {
        type: 'number',
        step: '1',
        max: '0',
        min: '-60'
      },
      setter: that.setter,
      getter: that.getter
    } );

    child = document.createElement('div');
    child.innerHTML = ' dB';
    this.element.appendChild(child);

    child = document.createElement('br');
    this.element.appendChild(child);

    for(let v of [-10, -5, -1]) {
      child = new dom.Button( {
        DOMOrigin: this.element,
        DOMClass: 'input-control',
        text: v.toString(),
        setter: () => { // eslint-disable-line no-loop-func
          that.setter(that.getter() + v);
          that.input.update();
        }
      } );
    }

    child = new dom.Button( {
      DOMOrigin: this.element,
      DOMClass: 'input-control',
      text: '=-20',
      setter: () => {
        that.setter(-20);
        that.input.update();
      }
    } );

    for(let v of [1, 5, 10]) {
      child = new dom.Button( {
        DOMOrigin: this.element,
        DOMClass: 'input-control',
        text: '+' + v.toString(),
        setter: () => { // eslint-disable-line no-loop-func
          that.setter(that.getter() + v);
          that.input.update();
        }
      } );
    }

    child = document.createElement('br');
    this.element.appendChild(child);

  }

  update() {
    this.input.update();
  }

}; // GainThreshold


dom.DelayThreshold = class {
  constructor(params) {
    this.setter = params.setter; // undefined is fine
    this.getter = params.getter; // undefined is fine

    const origin = (typeof params.DOMOrigin !== 'undefined'
                   ? params.DOMOrigin : document.body);

    this.element = document.createElement('div');
    this.element.classList.add('delay-threshold');
    origin.appendChild(this.element);

    let child = document.createElement('div');
    child.innerHTML = 'Delay threshold ';
    this.element.appendChild(child);

    const that = this; // problem with gulp-es6-transpiler 1.0.1
    this.input = new dom.Input( {
      DOMOrigin: this.element,
      DOMAttributes: {
        type: 'number',
        step: '1',
        max: '60',
        min: '0'
      },
      setter: that.setter,
      getter: that.getter
    } );

    child = document.createElement('div');
    child.innerHTML = ' s';
    this.element.appendChild(child);

    child = document.createElement('br');
    this.element.appendChild(child);

    for(let v of [-10, -5, -1]) {
      child = new dom.Button( {
        DOMOrigin: this.element,
        DOMClass: 'input-control',
        text: v.toString(),
        setter: () => { // eslint-disable-line no-loop-func
          that.setter(that.getter() + v);
          that.input.update();
        }
      } );
    }

    child = new dom.Button( {
      DOMOrigin: this.element,
      DOMClass: 'input-control',
      text: '=3',
      setter: () => {
        that.setter(3);
        that.input.update();
      }
    } );

    child = new dom.Button( {
      DOMOrigin: this.element,
      DOMClass: 'input-control',
      text: '=10',
      setter: () => {
        that.setter(10);
        that.input.update();
      }
    } );

    child = new dom.Button( {
      DOMOrigin: this.element,
      DOMClass: 'input-control',
      text: '=30',
      setter: () => {
        that.setter(30);
        that.input.update();
      }
    } );

    for(let v of [1, 5, 10]) {
      child = new dom.Button( {
        DOMOrigin: this.element,
        DOMClass: 'input-control',
        text: '+' + v.toString(),
        setter: () => { // eslint-disable-line no-loop-func
          that.setter(that.getter() + v);
          that.input.update();
        }
      } );
    }

    child = document.createElement('br');
    this.element.appendChild(child);

  }

  update() {
    this.input.update();
  }

}; // DelayCalibration


dom.AirSpeed = class {
  constructor(params) {
    this.setter = params.setter; // undefined is fine
    this.getter = params.getter; // undefined is fine

    const origin = (typeof params.DOMOrigin !== 'undefined'
                   ? params.DOMOrigin : document.body);

    this.element = document.createElement('div');
    this.element.classList.add('air-speed');
    origin.appendChild(this.element);

    let child = document.createElement('div');
    child.innerHTML = 'Air speed ';
    this.element.appendChild(child);

    const that = this; // problem with gulp-es6-transpiler 1.0.1
    this.input = new dom.Input( {
      DOMOrigin: this.element,
      DOMAttributes: {
        type: 'number',
        step: '1',
        max: '600',
        min: '0'
      },
      setter: that.setter,
      getter: that.getter
    } );

    child = document.createElement('div');
    child.innerHTML = ' m/s';
    this.element.appendChild(child);

    child = document.createElement('br');
    this.element.appendChild(child);

    for(let v of [-100, -50, -10, -5, -1, -0.5, -0.1]) {
      child = new dom.Button( {
        DOMOrigin: this.element,
        DOMClass: 'input-control',
        text: v.toString(),
        setter: () => { // eslint-disable-line no-loop-func
          that.setter(that.getter() + v);
          that.input.update();
        }
      } );
    }

    child = new dom.Button( {
      DOMOrigin: this.element,
      DOMClass: 'input-control',
      text: '=0.1',
      setter: () => {
        that.setter(0.1);
        that.input.update();
      }
    } );

    child = new dom.Button( {
      DOMOrigin: this.element,
      DOMClass: 'input-control',
      text: '=1',
      setter: () => {
        that.setter(1);
        that.input.update();
      }
    } );

    child = new dom.Button( {
      DOMOrigin: this.element,
      DOMClass: 'input-control',
      text: '=3',
      setter: () => {
        that.setter(3);
        that.input.update();
      }
    } );

    child = new dom.Button( {
      DOMOrigin: this.element,
      DOMClass: 'input-control',
      text: '=30',
      setter: () => {
        that.setter(30);
        that.input.update();
      }
    } );

    child = new dom.Button( {
      DOMOrigin: this.element,
      DOMClass: 'input-control',
      text: '=330',
      setter: () => {
        that.setter(330);
        that.input.update();
      }
    } );

    for(let v of [0.1, 0.5, 1, 5, 10, 50, 100]) {
      child = new dom.Button( {
        DOMOrigin: this.element,
        DOMClass: 'input-control',
        text: '+' + v.toString(),
        setter: () => { // eslint-disable-line no-loop-func
          that.setter(that.getter() + v);
          that.input.update();
        }
      } );
    }

    child = document.createElement('br');
    this.element.appendChild(child);

  }

  update() {
    this.input.update();
  }

}; // AirSpeed

dom.DistanceSpread = class {
  constructor(params) {
    this.setter = params.setter; // undefined is fine
    this.getter = params.getter; // undefined is fine

    const origin = (typeof params.DOMOrigin !== 'undefined'
                   ? params.DOMOrigin : document.body);

    this.element = document.createElement('div');
    this.element.classList.add('distance-spread');
    origin.appendChild(this.element);

    let child = document.createElement('div');
    child.innerHTML = 'Distance spread ';
    this.element.appendChild(child);

    const that = this; // problem with gulp-es6-transpiler 1.0.1
    this.input = new dom.Input( {
      DOMOrigin: this.element,
      DOMAttributes: {
        type: 'number',
        step: '0.1',
        max: '12',
        min: '0'
      },
      setter: that.setter,
      getter: that.getter
    } );

    child = document.createElement('div');
    child.innerHTML = ' dB';
    this.element.appendChild(child);

    child = document.createElement('br');
    this.element.appendChild(child);

    for(let v of [-10, -5, -1, -0.5, -0.1]) {
      child = new dom.Button( {
        DOMOrigin: this.element,
        DOMClass: 'input-control',
        text: v.toString(),
        setter: () => { // eslint-disable-line no-loop-func
          that.setter(that.getter() + v);
          that.input.update();
        }
      } );
    }

    child = new dom.Button( {
      DOMOrigin: this.element,
      DOMClass: 'input-control',
      text: '=1',
      setter: () => {
        that.setter(1);
        that.input.update();
      }
    } );

    child = new dom.Button( {
      DOMOrigin: this.element,
      DOMClass: 'input-control',
      text: '=3',
      setter: () => {
        that.setter(3);
        that.input.update();
      }
    } );

    child = new dom.Button( {
      DOMOrigin: this.element,
      DOMClass: 'input-control',
      text: '=6',
      setter: () => {
        that.setter(6);
        that.input.update();
      }
    } );

    for(let v of [0.1, 0.5, 1, 5, 10]) {
      child = new dom.Button( {
        DOMOrigin: this.element,
        DOMClass: 'input-control',
        text: '+' + v.toString(),
        setter: () => { // eslint-disable-line no-loop-func
          that.setter(that.getter() + v);
          that.input.update();
        }
      } );
    }

    child = document.createElement('br');
    this.element.appendChild(child);

  }

  update() {
    this.input.update();
  }

}; // DistanceSpread

dom.ReflectionTransmission = class {
  constructor(params) {
    this.setter = params.setter; // undefined is fine
    this.getter = params.getter; // undefined is fine

    const origin = (typeof params.DOMOrigin !== 'undefined'
                   ? params.DOMOrigin : document.body);

    this.element = document.createElement('div');
    this.element.classList.add('reflection-transmission');
    origin.appendChild(this.element);

    let child = document.createElement('div');
    child.innerHTML = 'Reflection transmission ';
    this.element.appendChild(child);

    const that = this; // problem with gulp-es6-transpiler 1.0.1
    this.input = new dom.Input( {
      DOMOrigin: this.element,
      DOMAttributes: {
        type: 'number',
        step: '0.1',
        max: '1',
        min: '0'
      },
      setter: that.setter,
      getter: that.getter
    } );

    child = document.createElement('div');
    child.innerHTML = ' (factor)';
    this.element.appendChild(child);

    child = document.createElement('br');
    this.element.appendChild(child);

    for(let v of [-0.5, -0.1, -0.05, -0.01]) {
      child = new dom.Button( {
        DOMOrigin: this.element,
        DOMClass: 'input-control',
        text: v.toString(),
        setter: () => { // eslint-disable-line no-loop-func
          that.setter(that.getter() + v);
          that.input.update();
        }
      } );
    }

    child = new dom.Button( {
      DOMOrigin: this.element,
      DOMClass: 'input-control',
      text: '=0',
      setter: () => {
        that.setter(0);
        that.input.update();
      }
    } );

    child = new dom.Button( {
      DOMOrigin: this.element,
      DOMClass: 'input-control',
      text: '=0.1',
      setter: () => {
        that.setter(0.1);
        that.input.update();
      }
    } );

    child = new dom.Button( {
      DOMOrigin: this.element,
      DOMClass: 'input-control',
      text: '=0.3',
      setter: () => {
        that.setter(0.3);
        that.input.update();
      }
    } );

    child = new dom.Button( {
      DOMOrigin: this.element,
      DOMClass: 'input-control',
      text: '=0.7',
      setter: () => {
        that.setter(0.7);
        that.input.update();
      }
    } );

    child = new dom.Button( {
      DOMOrigin: this.element,
      DOMClass: 'input-control',
      text: '=0.9',
      setter: () => {
        that.setter(0.9);
        that.input.update();
      }
    } );

    for(let v of [0.01, 0.05, 0.1, 0.5]) {
      child = new dom.Button( {
        DOMOrigin: this.element,
        DOMClass: 'input-control',
        text: '+' + v.toString(),
        setter: () => { // eslint-disable-line no-loop-func
          that.setter(that.getter() + v);
          that.input.update();
        }
      } );
    }

    child = document.createElement('br');
    this.element.appendChild(child);

  }

  update() {
    this.input.update();
  }

}; // ReflectionTransmission



module.exports = exports = dom;
