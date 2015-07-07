'use strict';

const debug = require('debug')('soundworks:woodland');

// Express application
const express = require('express');
const app = express();
const port = process.env.PORT || 8888;
const path = require('path');
const dir = path.join(__dirname, '../../public');
const fs = require('fs');

// Soundworks library
const serverSide = require('soundworks/server');
const server = serverSide.server;

const setup = new serverSide.Setup();

const dataPath = path.join(__dirname, '../../data');

// default values
setup.width = 5;
setup.height = 5;
setup.spacing = 1;
setup.coordinates = [];
setup.labels = [];

let order = 'random';

try {
  const data = JSON.parse(fs.readFileSync(
    path.join(dataPath, 'positions.json') ) );

  for(let p of data.positions) {
    setup.labels.push(p[0]);
    setup.coordinates.push(p[1]);
  }

  if(typeof data.width !== 'undefined') {
    setup.width = data.width;
  }
  if(typeof data.height !== 'undefined') {
    setup.height = data.height;
  }
  if(typeof data.spacing !== 'undefined') {
    setup.spacing = data.spacing;
  }

  if(typeof data.order !== 'undefined') {
    order = data.order;
  }
} catch(error) {
  console.log('Error loading positions from'
              + path.join(dataPath, 'positions.json') );
}


const checkin = new serverSide.Checkin({setup: setup, order: order});

const calibration = new serverSide.Calibration( {
  persistent: {
    path: dataPath,
    file: 'calibration.json'
  }
});
const sync = new serverSide.Sync();

const CalibrationServerPerformance = require('./calibration');
const WoodlandServerPerformance = require('./woodland');

const calibrationPerformance = new CalibrationServerPerformance({
  server: server,
  calibration: calibration
});

const woodlandPerformance = new WoodlandServerPerformance({
  server: server,
  calibration: calibration,
  setup: setup
});


debug('launch server on port %s', port);

server.start(app, dir, port);
server.map('calibration', calibration, sync, calibrationPerformance);
server.map('player', setup, checkin, calibration, sync, woodlandPerformance);
server.map('druid', setup, checkin, woodlandPerformance);
