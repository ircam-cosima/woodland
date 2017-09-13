'use strict';

let distances = {};

distances.Distances = class {
  constructor(params) {
    this.coordinates = params.coordinates;
    this.distances = [];
    for(let i = 0; i < this.coordinates.length; ++i) {
      this.distances[i] = [];
      for(let j = 0; j <= i; ++j) {
        const dx = this.coordinates[i][0] - this.coordinates[j][0];
        const dy = this.coordinates[i][1] - this.coordinates[j][1];
        this.distances[i][j] = Math.sqrt(dx * dx + dy * dy);
      }
    }
  }

  get(p1, p2) {
    if(p1 < p2) {
      const tmp = p1;
      p1 = p2;
      p2 = tmp;
    }
    return this.distances[p1][p2];
  }

};


module.exports = exports = distances;
