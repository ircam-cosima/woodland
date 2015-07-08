'use strict';

let dom = require('../common/dom');

dom.Canvas = class {
  constructor(params = {}) {
    this.element = document.createElement('div');
    if(typeof params.DOMClass !== 'undefined') {
      this.element.classList.add(params.DOMClass);
    }
    const DOMOrigin = (typeof params.DOMOrigin !== 'undefined'
                       ? params.DOMOrigin : document.body);
    DOMOrigin.appendChild(this.element);

    this.canvas = document.createElement('canvas');
    this.element.appendChild(this.canvas);

    this.context = this.canvas.getContext('2d');
    this.resize(params);

    window.addEventListener('resize', () => {
      this.resize(params);
    } );
  }

  resize(params = {}) {
    this.context.canvas.width = (typeof params.width !== 'undefined'
                                 ? params.width
                                 : (this.element.parentNode.clientWidth
                                    || document.body.clientWidth) );
    this.context.canvas.height = (typeof params.height !== 'undefined'
                                  ? params.height
                                  : (this.element.parentNode.clientHeight
                                     || document.body.clientHeight) );
  }

  /**
   * @param {Number} amplitude in [0, 255]
   */
  fillRGB(rgb) {
    this.context.fillStyle
      = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
    this.context.fillRect(0, 0, this.context.canvas.width,
                          this.context.canvas.height);

  }

};

module.exports = exports = dom;
