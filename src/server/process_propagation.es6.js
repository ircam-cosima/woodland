'use strict';

const debug = require('debug')('soundworks:woodland:process:propagation');

const Propagation = require('./propagation');
let propagation;


let players = [];

let sendDestinationsOngoing = 0;
function sendDestinations(destinationId, destinations) {
  ++this.sendDestinationsOngoing;
  // more relaxed than setImmediate
  setTimeout( () => {
    // debug('propagate %s reflections to %s',
    //       destinations.length, destinationId);
    process.send( {
      type: 'destinations',
      id: destinationId,
      destinations: destinations
    } );
    --this.sendDestinationsOngoing;
  }, 0);
}

function sendDestinationsDone() {
  if(sendDestinationsOngoing === 0) {
    debug('computed');
    // more relaxed than setImmediate
    setTimeout( () => {
      process.send( { type: 'computed' } );
    }, 0);
  } else {
    // wait until completion, no pressure
    setTimeout( () => { this.sendDestinationsDone(); }, 10);
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
      const destinations = propagation.compute(m.data);
      sendDestinationsDone();
      break;
  }
} );

debug('requesting coordinates');
process.send( { type: 'coordinates-request' } );

