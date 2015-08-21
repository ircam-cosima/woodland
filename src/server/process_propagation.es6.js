'use strict';

const debug = require('debug')('soundworks:woodland:process:propagation');

let players = [];
let sockets = [];
let labels = [];
var io = require('socket.io')();
io.on('connection', (socket) => {
  debug('client connection to socket2');

  socket.on('woodland:checkin', (data) => {
    debug('checkin %s, label %s', data.checkin, data.label);
    sockets[data.checkin] = socket;
    labels[data.checkin] = data.label;
  } );

  // update socket on connections, and re-connections
  socket.emit('woodland:checkin-request');
} );
// autonomous socket for process
io.listen(8887);

const Propagation = require('./propagation');
let propagation;

function sendDestinationsInit() {
  for(let p of players) {
    if(typeof sockets[p] !== 'undefined') {
      sockets[p].emit('woodland:sources-init');
    }
  }
}

let sendDestinationsOngoing = 0;
function sendDestinations(destinationId, destinations) {
  if(typeof sockets[destinationId] !== 'undefined') {
    sockets[destinationId].emit('woodland:sources-add', destinations);
  }
}

function sendDestinationsDone() {
  debug('done');
  for(let p of players) {
    if(typeof sockets[p] !== 'undefined') {
      sockets[p].emit('woodland:sources-done');
    }
  }
}

process.on('message', (m) => {
  switch(m.type) {
    case 'coordinates':
      debug('coordinates received');
      propagation = new Propagation( {
        coordinates: m.data.coordinates,
        sendFunction: sendDestinations
      });
      process.send( { type: 'parameters-request' } );
      break;

    case 'parameters':
      debug('parameters received');
      propagation.setParameters(m.data);
      break;

    case 'compute':
      debug('computing...');
      if(typeof m.data.players !== 'undefined') {
        players = m.data.players;
      }
      debug('players: ' + JSON.stringify(players) );

      sendDestinationsInit();
      const destinations = propagation.compute(m.data);
      sendDestinationsDone();
      break;
  }
} );

debug('requesting coordinates');
process.send( { type: 'coordinates-request' } );

