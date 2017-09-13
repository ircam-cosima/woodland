import { Service, serviceManager } from 'soundworks/client';
import CalibrationServer from 'calibration/client';

const SERVICE_ID = 'service:calibration';

class CalibrationService extends Service {
  constructor(options) {
    super(SERVICE_ID);

    const defaults = {};

    this.configure(defaults);
  }

  /** @private */
  start() {
    super.start();

    this._calibration = new CalibrationServer({
      sendFunction: this.send,
      receiveFunction: this.receive,
      updateFunction: () => this.ready(),
    });

    this._calibration.load();
  }
}

serviceManager.register(SERVICE_ID, CalibrationService);

export default CalibrationService;
