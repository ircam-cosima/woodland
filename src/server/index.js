import 'source-map-support/register'; // enable sourcemaps in node
import path from 'path';
import * as soundworks from 'soundworks/server';
import WoodlandExperience from './WoodlandExperience';

const dir = path.join(process.cwd(), 'public');
const fs = require('fs');

const debug = require('debug')('soundworks:woodland');
const utils = require('../shared/utils');
const blocked = new utils.Blocked( (duration) => {
  debug('---------------------------------------------- blocked for %s ms',
        duration);
} );

// import positions from '../shared/positions.json';
const dataPath = path.join(process.cwd(), 'data');
const positions = JSON.parse(fs.readFileSync(path.join(dataPath, 'positions.json')));

const configName = process.env.ENV || 'default';
const configPath = path.join(__dirname, 'config', configName);
let config = null;

// rely on node `require` for synchronicity
try {
  config = require(configPath).default;
} catch(err) {
  console.error(`Invalid ENV "${configName}", file "${configPath}.js" not found`);
  process.exit(1);
}

config.setup = positions;
// configure express environment ('production' enables express cache for static files)
process.env.NODE_ENV = config.env;
// initialize application with configuration options
soundworks.server.init(config);

// define the configuration object to be passed to the `.ejs` template
soundworks.server.setClientConfigDefinition((clientType, config, httpRequest) => {
  return {
    clientType: clientType,
    env: config.env,
    appName: config.appName,
    websockets: config.websockets,
    version: config.version,
    defaultType: config.defaultClient,
    assetsDomain: config.assetsDomain,
  };
});

// create the experience
// activities must be mapped to client types:
// - the `'player'` clients (who take part in the scenario by connecting to the
//   server through the root url) need to communicate with the `checkin` (see
// `src/server/playerExperience.js`) and the server side `playerExperience`.
// - we could also map activities to additional client types (thus defining a
//   route (url) of the following form: `/${clientType}`)
const experience = new WoodlandExperience(['player', 'druid'], config.setup);

// const calibration = new serverSide.Calibration( {
//   persistent: {
//     path: dataPath,
//     file: 'calibration.json'
//   }
// });

// const calibrationPerformance = new CalibrationServerPerformance({
//   server: server,
//   calibration: calibration
// });

// start application
soundworks.server.start();
