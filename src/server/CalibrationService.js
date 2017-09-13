import { Service, serviceManager } from 'soundworks/server';
import CalibrationServer from 'calibration/server';

const SERVICE_ID = 'service:calibration';

class CalibrationService extends Service {
  constructor(options) {
    super(SERVICE_ID);

    const defaults = {};

    this._calibration = new CalibrationServer(options);

    this.configure(defaults);
  }

  /** @private */
  start() {
    super.start();

    this.ready();
  }

  /** @private */
  connect(client) {
    const send = (cmd, ...args) => this.send(client, cmd, ...args);
    const receive = (cmd, callback) => this.receive(client, cmd, callback);

    this._calibration.start(send, receive);
  }
}

serviceManager.register(SERVICE_ID, CalibrationService);

export default CalibrationService;
