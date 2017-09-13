const app = window.app = {};
// import client side soundworks and player experience
import * as soundworks from 'soundworks/client';
import DruidExperience from './DruidExperience';
import serviceViews from '../shared/serviceViews';
import debug from 'debug';

app.debug = debug('soundworks:woodland');
app.dom = require('./dom');
app.files = require('../../shared/files').default;

function bootstrap() {
  // initialize the client with configuration received
  // from the server through the `index.html`
  // @see {~/src/server/index.js}
  // @see {~/html/default.ejs}
  const config = Object.assign({ appContainer: '#container' }, window.soundworksConfig);
  soundworks.client.init(config.clientType, config);

  // configure views for the services
  soundworks.client.setServiceInstanciationHook((id, instance) => {
    if (serviceViews.has(id))
      instance.view = serviceViews.get(id, config);
  });

  // create client side (player) experience and start the client
  const experience = new DruidExperience(app);
  soundworks.client.start();
}

window.addEventListener('load', bootstrap);
