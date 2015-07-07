'use strict';

const debug = require('debug')('soundworks:woodland:process:propagation');

const Propagation = require('./propagation');

let propagation;

process.on('message', (m) => {
  switch(m.type) {
    case 'coordinates':
      debug('coordinates received');
      propagation = new Propagation(m.data);
      process.send( { type: 'parameters-request' } );
      break;

    case 'parameters':
      debug('parameters received');
      propagation.setParameters(m.data);
      break;

    case 'compute':
      debug('computing...');
      const destinations = propagation.compute(m.data);
      debug('computed; sending...');
      process.send( {
        type: 'computed',
        data: { destinations: destinations }
      } );
      debug('sent');
      break;
  }
} );

debug('requesting coordinates');
process.send( { type: 'coordinates-request' } );

