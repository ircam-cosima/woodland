/**
 * Moving avarage filter.
 *
 * @constructor
 * @param {number} size - The inittial filter size.
 */
 class Mvavrg {
  constructor(size) {
    this._buffer = new Float32Array(size);
    this._index = 0;
  }

  /**
   * Reset and (optionally) resize filter.
   *
   * @param {number|null} size - The new filter size (optional)
   */
  set size(size) {
    this._buffer = new Float32Array(size);
    this._index = 0;
  }

  get size() {
    return this._buffer.length;
  }

  /**
   * Input and process value.
   *
   * @param {number} value - input value.
   * @returns filtered value
   */
  input(value) {
    this._buffer[this._index] = value;

    var sum = 0.0;

    for(var i = 0; i < this._buffer.length; i++)
      sum += this._buffer[i];

    this._index = (this._index + 1) % this._buffer.length;

    return sum / this._buffer.length;
  }
}

module.exports = Mvavrg;
