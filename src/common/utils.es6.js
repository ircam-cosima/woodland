'use strict';

let utils = {};


/**
 * Convert dB to linear gain value (1e-3 for -60dB)
 *
 * @param {Number} dBValue
 *
 * @return {Number} gain value
 */
utils.dBToLin = function (dBValue) {
  const factor = 1 / 20;
  return Math.pow(10, dBValue * factor);
};

module.exports = exports = utils;
