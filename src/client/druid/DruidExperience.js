import * as soundworks from 'soundworks/client';

const template = ``;

class DruidExperience extends soundworks.Experience {
  constructor(app) {
    super();
    const that = this;

    this.app = app;
    this.preset = 'default';

    this.launcher = '';
    this.labels = [];

    this.masterGain = 0;
    this.gainThreshold = 0;
    this.delayThreshold = 0;
    this.airSpeed = 0;
    this.distanceSpread = 0;
    this.reflectionTransmission = 0;
  }

  presetsUpdate(presets) {
    this.presets = presets;
    const that = this;
    const options = [];

    for(let p in presets) {
      if(presets.hasOwnProperty(p) ) {
        options.push(p);
      }
    }
    options.sort();

    this.display.presets.setOptions(options);
  }

  presetSave(presetName) {
    this.presets[presetName] = {
      soundFile: this.soundFile,
      masterGain: this.masterGain,
      gainThreshold: this.gainThreshold,
      delayThreshold: this.delayThreshold,
      airSpeed: this.airSpeed,
      distanceSpread: this.distanceSpread,
      reflectionTransmission: this.reflectionTransmission,
    };

    this.send('woodland:druid-presets', this.presets);
  }

  labelsUpdate(labels) {
    this.labels = labels.slice(0);
    this.labels.unshift('none');
    this.display.launcher.setOptions(this.labels);
  }

  launcherUpdate(label) {
    this.launcher = label;
    this.display.launcher.update();
  }

  launcherSet(label) {
    this.launcherUpdate(label);
    this.send('woodland:launcher', this.launcher);
  }

  parametersSend() {
    this.send('woodland:parameters', {
      soundFile: this.soundFile,
      masterGain: this.masterGain,
      gainThreshold: this.gainThreshold,
      delayThreshold: this.delayThreshold,
      airSpeed: this.airSpeed,
      distanceSpread: this.distanceSpread,
      reflectionTransmission: this.reflectionTransmission
    } );

  }

  renderRequest() {
    this.send('woodland:render-request');
  }

  start() {
    super.start();

    const that = this;
    const app = this.app;

    this.view = new soundworks.View(template, {}, {}, {
      id: 'druid',
    });

    this.show().then(() => {

      this.display = {};

      this.display.presets = new app.dom.Presets( {
        DOMOrigin: this.view.$el,
        options: [],
        setter: (preset) => {
          that.preset = preset;
          for(let v in that.presets[preset]) {
            this[v] = that.presets[preset][v];
          }
          that.parametersSend();
        },
        getter: () => { return that.preset; },
        save: () => {
          const name = window.prompt('Save preset? \n'
                                     +'(Do not change the name to update.)',
                                     that.preset);
          if(name) {
            that.presetSave(name);
          }
        },
      });

      this.display.render = new app.dom.Button( {
        DOMOrigin: this.view.$el,
        DOMClass: 'render',
        text: 'Render',
        setter: () => { that.renderRequest(); }
      } );

      this.soundFile = app.files[0];
      this.display.soundFile = new app.dom.Select( {
        DOMOrigin: this.view.$el,
        DOMClass: 'sound-file',
        options: app.files,
        setter: (value) => {
          that.soundFile = value;
          that.parametersSend();
        },
        getter: () => { return that.soundFile; }
      } );

      this.receiver = '';
      this.display.receiverElement = app.dom.createReceiverElement(this.view.$el);

      this.launcher = '';
      this.display.launcher = new app.dom.ExclusiveToggles( {
        DOMOrigin: this.view.$el,
        DOMClass: 'launcher',
        setter: (value) => { that.launcherSet(value); },
        getter: () => { return that.launcher; }
      } );

      this.display.masterGain = new app.dom.MasterGain( {
        DOMOrigin: this.view.$el,
        setter: (value) => {
          that.masterGain = parseFloat(value);
          that.parametersSend();
        },
        getter: () => { return that.masterGain; }
      } );

      this.display.gainThreshold = new app.dom.GainThreshold( {
        DOMOrigin: this.view.$el,
        setter: (value) => {
          that.gainThreshold = parseFloat(value);
          that.parametersSend();
        },
        getter: () => { return that.gainThreshold; }
      } );

      this.display.delayThreshold = new app.dom.DelayThreshold( {
        DOMOrigin: this.view.$el,
        setter: (value) => {
          that.delayThreshold = parseFloat(value);
          that.parametersSend();
        },
        getter: () => { return that.delayThreshold; }
      } );

      this.display.airSpeed = new app.dom.AirSpeed( {
        DOMOrigin: this.view.$el,
        setter: (value) => {
          that.airSpeed = parseFloat(value);
          that.parametersSend();
        },
        getter: () => { return that.airSpeed; }
      } );

      this.display.distanceSpread = new app.dom.DistanceSpread( {
        DOMOrigin: this.view.$el,
        setter: (value) => {
          that.distanceSpread = parseFloat(value);
          that.parametersSend();
        },
        getter: () => { return that.distanceSpread; }
      } );

      this.display.reflectionTransmission = new app.dom.ReflectionTransmission( {
        DOMOrigin: this.view.$el,
        setter: (value) => {
          that.reflectionTransmission = parseFloat(value);
          that.parametersSend();
        },
        getter: () => { return that.reflectionTransmission; }
      } );


      this.receive('woodland:parameters', (params) => {
        if(typeof params.soundFile !== 'undefined') {
          that.soundFile = params.soundFile;
          that.display.soundFile.update();
        }

        if(typeof params.masterGain !== 'undefined') {
          that.masterGain = params.masterGain;
          that.display.masterGain.update();
        }

        if(typeof params.gainThreshold !== 'undefined') {
          that.gainThreshold = params.gainThreshold;
          that.display.gainThreshold.update();
        }

        if(typeof params.delayThreshold !== 'undefined') {
          that.delayThreshold = params.delayThreshold;
          that.display.delayThreshold.update();
        }

        if(typeof params.airSpeed !== 'undefined') {
          that.airSpeed = params.airSpeed;
          that.display.airSpeed.update();
        }

        if(typeof params.distanceSpread !== 'undefined') {
          that.distanceSpread = params.distanceSpread;
          that.display.distanceSpread.update();
        }

        if(typeof params.reflectionTransmission !== 'undefined') {
          that.reflectionTransmission = params.reflectionTransmission;
          that.display.reflectionTransmission.update();
        }
      });

      this.send('woodland:parameters-request');

      this.receive('woodland:druid-presets', (presets) => {
        this.presetsUpdate(presets);
      });
      this.send('woodland:druid-presets-request');

      this.receive('woodland:receiver', (label) => {
        app.dom.updateReceiverElement(this.display.receiverElement, label);
      });
      this.send('woodland:receiver-request');

      this.receive('woodland:launcher', (label) => {
        this.launcherUpdate(label);
      });
      this.send('woodland:launcher-request');

      this.receive('woodland:labels', (labels) => {
        this.labelsUpdate(labels);
      });
      this.send('woodland:labels-request');
    });
  }

}

export default DruidExperience;
