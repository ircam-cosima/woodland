const app = window.app = {};
// import client side soundworks and player experience
import * as soundworks from 'soundworks/client';
import PlayerExperience from './PlayerExperience';
import serviceViews from '../shared/serviceViews';
import debug from 'debug';

app.debug = debug('soundworks:woodland');
app.utils = require('../../shared/utils');
app.blocked = new app.utils.Blocked( (duration) => {
  app.debug('---------------------------------------------- blocked for %s ms',
            duration);
}, 50);

app.audio = require('./audio');
app.dom = require('./dom');
app.input = require('../../shared/acceleration');
app.distances = require('../../shared/distances');
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
  const experience = new PlayerExperience(config.assetsDomain, app);
  soundworks.client.start();

  app.experience = experience;

  app.workers = {};
  app.workers.propagation = new Worker('js/worker_propagation.js');
  app.workers.propagation.debug
    = require('debug')('soundworks:woodland:worker:propagation');
  app.workers.propagation.onmessage = (m) => {
    switch(m.data.type) {
      case 'debug':
        app.workers.propagation.debug(m.data.data);
        break;

      case 'sources-init':
        app.workers.propagation.debug('sources-init');
        app.experience.display.status.update('propagating: init');
        break;

      case 'sources-add':
        app.workers.propagation.debug('sources-add');
        app.experience.display.status.update('propagating: continuing');
        break;

      case 'sources-apply':
        app.workers.propagation.debug('sources-apply');
        app.experience.display.status.update('propagating: computing');
        app.experience.propagation.sourcesApply(m.data.samples, m.data.sampleRate);

        app.workers.propagation.debug('propagated');
        app.experience.display.status.update('propagated');
        app.experience.send('woodland:propagated');
        break;
    }
  };
}

window.addEventListener('load', bootstrap);
