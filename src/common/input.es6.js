'use strict';

var EventEmitter = require('events').EventEmitter;
var platform = require('platform');
var Mvavrg = require('./mvavrg');


function degToRad(deg) {
  const factor = Math.PI / 180;
  return deg * factor;
}

function radToDeg(rad) {
  const factor = 180 / Math.PI;
  return rad * factor;
}

class Input extends EventEmitter {
  constructor() {
    this.sensorSupport = {
      deviceMotionEvent: false,
      deviceOrientationEvent: false,

      accelerationIncludingGravity: false,
      accelerationIncludingGravityX: false,
      accelerationIncludingGravityY: false,
      accelerationIncludingGravityZ: false,

      acceleration: false,
      accelerationX: false,
      accelerationY: false,
      accelerationZ: false,

      rotationRate: false,
      rotationRateAlpha: false,
      rotationRateBeta: false,
      rotationRateGamma: false,

      orientation: false,
      orientationAlpha: false,
      orientationBeta: false,
      orientationGamma: false
    };

    this.motionData = {};
    this.filters = {};
    this.sensorThreshold = {};

    this._listeningToDeviceMotion = false;
    this._listeningToDeviceOrientation = false;

    // Method bindings
    this._getOrientationSupportInformation = this._getOrientationSupportInformation.bind(this);
    this._getMotionSupportInformation = this._getMotionSupportInformation.bind(this);

    // Initialization
    this._checkSensorSupport();
  }

  /**
   * --------------
   * Sensor support
   * --------------
   */

  _checkSensorSupport() {
    // DeviceMotion
    if (window.DeviceMotionEvent) {
      this.sensorSupport.deviceMotionEvent = true;
      window.addEventListener('devicemotion', this._getMotionSupportInformation, false);
    }

    // DeviceOrientation
    if (window.DeviceOrientationEvent) {
      this.sensorSupport.deviceOrientationEvent = true;
      window.addEventListener('deviceorientation', this._getOrientationSupportInformation, false);
    }
  }

  _getMotionSupportInformation(e) {
    // Acceleration including gravity
    if (e.accelerationIncludingGravity) {
      if (e.accelerationIncludingGravity.x)
        this.sensorSupport.accelerationIncludingGravityX = true;
      if (e.accelerationIncludingGravity.y)
        this.sensorSupport.accelerationIncludingGravityY = true;
      if (e.accelerationIncludingGravity.z)
        this.sensorSupport.accelerationIncludingGravityZ = true;
      if (e.accelerationIncludingGravity.x && e.accelerationIncludingGravity.y && e.accelerationIncludingGravity.z)
        this.sensorSupport.accelerationIncludingGravity = true;
    }

    // Acceleration
    if (e.acceleration) {
      if (e.acceleration.x)
        this.sensorSupport.accelerationX = true;
      if (e.acceleration.y)
        this.sensorSupport.accelerationY = true;
      if (e.acceleration.z)
        this.sensorSupport.accelerationZ = true;
      if (e.acceleration.x && e.acceleration.y && e.acceleration.z)
        this.sensorSupport.acceleration = true;
    }

    // Rotation rate
    if (e.rotationRate) {
      if (e.rotationRate.alpha)
        this.sensorSupport.rotationRateAlpha = true;
      if (e.rotationRate.beta)
        this.sensorSupport.rotationRateBeta = true;
      if (e.rotationRate.gamma)
        this.sensorSupport.rotationRateGamma = true;
      if (e.rotationRate.alpha && e.rotationRate.beta && e.rotationRate.gamma)
        this.sensorSupport.rotationRate = true;
    }

    window.removeEventListener('devicemotion', this._getMotionSupportInformation, false);
  }

  _getOrientationSupportInformation(e) {
    if (e.alpha)
      this.sensorSupport.orientationAlpha = true;
    if (e.beta)
      this.sensorSupport.orientationBeta = true;
    if (e.gamma)
      this.sensorSupport.orientationGamma = true;
    if (e.alpha && e.beta && e.gamma)
      this.sensorSupport.orientation = true;

    window.removeEventListener('deviceorientation', this._getOrientationSupportInformation, false);
  }

  /**
   * --------------------------------------------
   * DeviceMotion and DeviceOrientation listeners
   * --------------------------------------------
   */

  _addDeviceOrientationListener() {
    if (!this.motionData.orientation)
      this.motionData.orientation = {};

    window.addEventListener('deviceorientation', (e) => {
      let orientationRaw = {
        alpha: e.alpha,
        beta: e.beta,
        gamma: e.gamma
      };

      if (this.motionData.orientation.raw && !this.motionData.orientation.raw.webkitCompassHeadingReference && e.webkitCompassHeading)
        orientationRaw.webkitCompassHeadingReference = e.webkitCompassHeading;

      this.motionData.orientation.raw = orientationRaw;
      this.emit('input:deviceOrientation:raw', orientationRaw);
    }, false);

    this._listeningToDeviceOrientation = true;
  }

  _addDeviceMotionListener() {
    if (!this.motionData.accelerationIncludingGravity)
      this.motionData.accelerationIncludingGravity = {};

    if (!this.motionData.acceleration)
      this.motionData.acceleration = {};

    if (!this.motionData.rotationRate)
      this.motionData.rotationRate = {};

    window.addEventListener('devicemotion', (e) => {
      if (this.sensorSupport.accelerationIncludingGravity) {
        let accelerationIncludingGravityRaw = {
          x: e.accelerationIncludingGravity.x,
          y: e.accelerationIncludingGravity.y,
          z: e.accelerationIncludingGravity.z
        };

        this.motionData.accelerationIncludingGravity.raw = accelerationIncludingGravityRaw;
        this.emit('input:accelerationIncludingGravity:raw', accelerationIncludingGravityRaw);
      }

      if (this.sensorSupport.acceleration) {
        let accelerationRaw = {
          x: e.acceleration.x,
          y: e.acceleration.y,
          z: e.acceleration.z
        };

        this.motionData.acceleration.raw = accelerationRaw;
        this.emit('input:acceleration:raw', accelerationRaw);
      }

      if (this.sensorSupport.rotationRate) {
        let rotationRateRaw = {
          alpha: e.rotationRate.alpha,
          beta: e.rotationRate.beta,
          gamma: e.rotationRate.gamma
        };

        this.motionData.rotationRate.raw = rotationRateRaw;
        this.emit('input:rotationRate:raw', rotationRateRaw);
      }

      this.emit('input:deviceMotion:raw');
    }, false);

    this._listeningToDeviceMotion = true;
  }

  /**
   * ------------
   * Calculations
   * ------------
   */

  _unifyOrientation() {
    let orientationRaw = {
      alpha: this.motionData.orientation.raw.alpha,
      beta: this.motionData.orientation.raw.beta,
      gamma: this.motionData.orientation.raw.gamma
    };

    if (this.motionData.orientation.raw.webkitCompassHeadingReference)
      orientationRaw.alpha += 360 - this.motionData.orientation.raw.webkitCompassHeadingReference;

    let matrix = new RotationMatrix();
    let euler = new EulerAngle();
    matrix.setFromEulerAngles(orientationRaw);
    euler.setFromRotationMatrix(matrix);

    let orientationUnified = {
      alpha: euler.alpha,
      beta: euler.beta,
      gamma: euler.gamma
    };

    this.motionData.orientation.unified = orientationUnified;
    this.emit('input:deviceOrientation:unified', orientationUnified);
  }

  _unifyAccelerationIncludingGravity() {
    let accelerationIncludingGravityUnified = {
      x: this.motionData.accelerationIncludingGravity.raw.x,
      y: this.motionData.accelerationIncludingGravity.raw.y,
      z: this.motionData.accelerationIncludingGravity.raw.z
    };

    if (platform.os.family === "iOS") {
      accelerationIncludingGravityUnified.x *= -1;
      accelerationIncludingGravityUnified.y *= -1;
      accelerationIncludingGravityUnified.z *= -1;
    }

    this.motionData.accelerationIncludingGravity.unified = accelerationIncludingGravityUnified;
    this.emit('input:accelerationIncludingGravity:unified', accelerationIncludingGravityUnified);
  }

  _unifyAcceleration() {
    let accelerationUnified = {
      x: this.motionData.acceleration.raw.x,
      y: this.motionData.acceleration.raw.y,
      z: this.motionData.acceleration.raw.z
    };

    if (platform.os.family === "iOS") {
      accelerationUnified.x *= -1;
      accelerationUnified.y *= -1;
      accelerationUnified.z *= -1;
    }

    this.motionData.acceleration.unified = accelerationUnified;
    this.emit('input:acceleration:unified', accelerationUnified);
  }

  _estimateAccelerationFromAccelerationIncludingGravity(accelerationIncludingGravity) {
    // low pass filter to estimate the gravity
    const k = 0.8;
    if (!this.motionData.estimatedGravity) {
      this.motionData.estimatedGravity = {
        x: 0,
        y: 0,
        z: 0
      };
    }
    this.motionData.estimatedGravity.x = k * this.motionData.estimatedGravity.x + (1 - k) * accelerationIncludingGravity.x;
    this.motionData.estimatedGravity.y = k * this.motionData.estimatedGravity.y + (1 - k) * accelerationIncludingGravity.y;
    this.motionData.estimatedGravity.z = k * this.motionData.estimatedGravity.z + (1 - k) * accelerationIncludingGravity.z;

    let accelerationEstimated = {
      x: accelerationIncludingGravity.x - this.motionData.estimatedGravity.x,
      y: accelerationIncludingGravity.y - this.motionData.estimatedGravity.y,
      z: accelerationIncludingGravity.z - this.motionData.estimatedGravity.z
    };

    this.motionData.acceleration.estimated = accelerationEstimated;
    this.emit('input:acceleration:estimated', accelerationEstimated);
  }

  _estimateTiltAndRollFromOrientation(orientation) {
    let tiltRoll = {
      tilt: orientation.beta,
      roll: orientation.gamma
    };

    this.motionData.tiltRoll = tiltRoll;
    this.emit('input:tiltRoll', tiltRoll);
  }

  _estimateTiltAndRoll2FromOrientation(orientation) {
    let matrix = new RotationMatrix();
    let euler = new EulerAngle();

    matrix.setFromEulerAngles({
      alpha: 0,
      beta: orientation.beta,
      gamma: orientation.gamma
    });
    euler.setFromRotationMatrix2(matrix);

    let tiltRoll = {
      tilt: euler.beta,
      roll: euler.gamma
    };

    this.motionData.tiltRoll = tiltRoll;
    this.emit('input:tiltRoll', tiltRoll);
  }

  _estimateTiltRollFromAccelerationIncludingGravity(accelerationIncludingGravity) {
    // Low pass filter on accelerationIncludingGravity data
    const k = 0.8;
    if (!this.motionData.accelerationIncludingGravity.filtered) {
      this.motionData.accelerationIncludingGravity.filtered = {
        x: 0,
        y: 0,
        z: 0
      };
    }
    this.motionData.accelerationIncludingGravity.filtered.x = k * this.motionData.accelerationIncludingGravity.filtered.x + (1 - k) * accelerationIncludingGravity.x;
    this.motionData.accelerationIncludingGravity.filtered.y = k * this.motionData.accelerationIncludingGravity.filtered.y + (1 - k) * accelerationIncludingGravity.y;
    this.motionData.accelerationIncludingGravity.filtered.z = k * this.motionData.accelerationIncludingGravity.filtered.z + (1 - k) * accelerationIncludingGravity.z;

    let fX = this.motionData.accelerationIncludingGravity.filtered.x;
    let fY = this.motionData.accelerationIncludingGravity.filtered.y;
    let fZ = this.motionData.accelerationIncludingGravity.filtered.z;

    let norm = Math.sqrt(fX * fX + fY * fY + fZ * fZ);
    fX /= norm;
    fY /= norm;
    fZ /= norm;

    // Beta & gamma equations (we approximate [gX, gY, gZ] by [fX, fY, fZ])
    let beta = radToDeg(Math.asin(fY)); // beta is in [-pi/2; pi/2[
    let gamma = radToDeg(Math.atan2(-fX, fZ)); // gamma is in [-pi; pi[

    // Since we want beta in [-pi; pi[ and gamma in [-pi/2; pi/2[,
    // we pass the angles through the euler > matrix > euler conversion
    let matrix = new RotationMatrix();
    let euler = new EulerAngle();

    matrix.setFromEulerAngles({
      alpha: 0,
      beta: beta,
      gamma: gamma
    });
    euler.setFromRotationMatrix(matrix);

    let tiltRoll = {
      tilt: euler.beta,
      roll: euler.gamma
    };

    this.motionData.tiltRoll = tiltRoll;
    this.emit('input:tiltRoll', tiltRoll);
  }

  _estimateTiltRoll2FromAccelerationIncludingGravity(accelerationIncludingGravity) {
    // Low pass filter on accelerationIncludingGravity data
    const k = 0.8;
    if (!this.motionData.accelerationIncludingGravity.filtered) {
      this.motionData.accelerationIncludingGravity.filtered = {
        x: 0,
        y: 0,
        z: 0
      };
    }
    this.motionData.accelerationIncludingGravity.filtered.x = k * this.motionData.accelerationIncludingGravity.filtered.x + (1 - k) * accelerationIncludingGravity.x;
    this.motionData.accelerationIncludingGravity.filtered.y = k * this.motionData.accelerationIncludingGravity.filtered.y + (1 - k) * accelerationIncludingGravity.y;
    this.motionData.accelerationIncludingGravity.filtered.z = k * this.motionData.accelerationIncludingGravity.filtered.z + (1 - k) * accelerationIncludingGravity.z;

    let fX = this.motionData.accelerationIncludingGravity.filtered.x;
    let fY = this.motionData.accelerationIncludingGravity.filtered.y;
    let fZ = this.motionData.accelerationIncludingGravity.filtered.z;

    let norm = Math.sqrt(fX * fX + fY * fY + fZ * fZ);
    fX /= norm;
    fY /= norm;
    fZ /= norm;

    // Beta & gamma equations (we approximate [gX, gY, gZ] by [fX, fY, fZ])
    let beta = radToDeg(Math.asin(fY)); // beta is in [-pi/2; pi/2[
    let gamma = radToDeg(Math.atan2(-fX, fZ)); // gamma is in [-pi; pi[

    // Since we want beta in [-pi; pi[ and gamma in [-pi/2; pi/2[,
    // we pass the angles through the euler > matrix > euler conversion
    let matrix = new RotationMatrix();
    let euler = new EulerAngle();

    matrix.setFromEulerAngles({
      alpha: 0,
      beta: beta,
      gamma: gamma
    });
    euler.setFromRotationMatrix2(matrix);

    let tiltRoll = {
      tilt: euler.beta,
      roll: euler.gamma
    };

    this.motionData.tiltRoll = tiltRoll;
    this.emit('input:tiltRoll', tiltRoll);
  }

  _estimateEnergy(id, numFrames, acceleration, rotationRate) {
    if (!this.filters.energy)
      this.filters.energy = {};

    if (!this.filters.energy[id])
      this.filters.energy[id] = new Mvavrg(numFrames);

    if (!this.sensorThreshold.energy) {
      this.sensorThreshold.energy = {
        accelerometer: 9.81,
        gyroscope: 200
      };
    }

    let accelerationEnergy = 0;
    let rotationRateEnergy = 0;

    if (acceleration) {
      let aX = Math.min(acceleration.x);
      let aY = Math.min(acceleration.y);
      let aZ = Math.min(acceleration.z);
      let accelerationMagnitude = Math.sqrt(aX * aX + aY * aY + aZ * aZ);
      let accMax = 20;

      if (this.sensorThreshold.energy.accelerometer < accelerationMagnitude)
        this.sensorThreshold.energy.accelerometer = Math.min(accelerationMagnitude, accMax);

      accelerationEnergy = Math.min(accelerationMagnitude / this.sensorThreshold.energy.accelerometer, 1);
    }

    if (rotationRate) {
      let rA = Math.min(rotationRate.alpha);
      let rB = Math.min(rotationRate.beta);
      let rG = Math.min(rotationRate.gamma);
      let rotationRateMagnitude = Math.sqrt(rA * rA + rB * rB + rG * rG);
      let gyroMax = 600;

      if (this.sensorThreshold.energy.gyroscope < rotationRateMagnitude)
        this.sensorThreshold.energy.gyroscope = Math.min(rotationRateMagnitude, gyroMax);

      rotationRateEnergy = Math.min(rotationRateMagnitude / this.sensorThreshold.energy.gyroscope, 1);
    }

    let energy = Math.max(accelerationEnergy, rotationRateEnergy);
    energy = this.filters.energy[id].input(energy);

    this.motionData.energy = energy;
    this.emit('input:energy:' + id, energy);
  }

  _triggerJiggle(energy) {
    if (!this.motionData.jiggle)
      this.motionData.jiggle = {
        lastEnergy: 0,
        lastLastEnergy: 0
      };

    if (energy <= this.motionData.jiggle.lastEnergy && this.motionData.jiggle.lastEnergy >= this.motionData.jiggle.lastLastEnergy && energy > 0.1)
      this.emit('input:jiggle', this.motionData.jiggle.lastEnergy);

    this.motionData.jiggle.lastLastEnergy = this.motionData.jiggle.lastEnergy;
    this.motionData.jiggle.lastEnergy = energy;
  }

  /**
   * ------------
   * Applications
   * ------------
   */

  tiltRoll() {
    if (this.sensorSupport.orientationBeta && this.sensorSupport.orientationGamma) {
      if (!this._listeningToDeviceOrientation)
        this._addDeviceOrientationListener();

      this.on('input:deviceOrientation:raw', () => {
        this._unifyOrientation();
      });

      this.on('input:deviceOrientation:unified', (orientationUnified) => {
        this._estimateTiltAndRollFromOrientation(orientationUnified);
      });
    } else if (this.sensorSupport.accelerationIncludingGravity) {
      if (!this._listeningToDeviceMotion)
        this._addDeviceMotionListener();

      this.on('input:deviceMotion:raw', () => {
        this._unifyAccelerationIncludingGravity();
      });

      this.on('input:accelerationIncludingGravity:unified', (accelerationIncludingGravityUnified) => {
        this._estimateTiltRollFromAccelerationIncludingGravity(accelerationIncludingGravityUnified);
      });
    } else {
      console.log('ERROR: Impossible to estimate the tilt and roll with the available sensors.');
    }
  }

  tiltRoll2() {
    if (this.sensorSupport.orientationBeta && this.sensorSupport.orientationGamma) {
      if (!this._listeningToDeviceOrientation)
        this._addDeviceOrientationListener();

      this.on('input:deviceOrientation:raw', () => {
        this._unifyOrientation();
      });

      this.on('input:deviceOrientation:unified', (orientationUnified) => {
        this._estimateTiltAndRoll2FromOrientation(orientationUnified);
      });
    } else if (this.sensorSupport.accelerationIncludingGravity) {
      if (!this._listeningToDeviceMotion)
        this._addDeviceMotionListener();

      this.on('input:deviceMotion:raw', () => {
        this._unifyAccelerationIncludingGravity();
      });

      this.on('input:accelerationIncludingGravity:unified', (accelerationIncludingGravityUnified) => {
        this._estimateTiltRoll2FromAccelerationIncludingGravity(accelerationIncludingGravityUnified);
      });
    } else {
      console.log('ERROR: Impossible to estimate the tilt and roll with the available sensors.');
    }
  }

  energy(id, numFrames) {
    if (this.sensorSupport.acceleration) {
      if (!this._listeningToDeviceMotion)
        this._addDeviceMotionListener();

      this.on('input:deviceMotion:raw', () => {
        let acceleration = this.motionData.acceleration.raw;
        let rotationRate = null;

        if (this.sensorSupport.rotationRate)
          rotationRate = this.motionData.rotationRate.raw;

        this._estimateEnergy(id, numFrames, acceleration, rotationRate);
      });
    } else if (this.sensorSupport.accelerationIncludingGravity) {
      if (!this._listeningToDeviceMotion)
        this._addDeviceMotionListener();

      this.on('input:deviceMotion:raw', () => {
        this._unifyAccelerationIncludingGravity();
      });

      this.on('input:accelerationIncludingGravity:unified', (accelerationIncludingGravityUnified) => {
        this._estimateAccelerationFromAccelerationIncludingGravity(accelerationIncludingGravityUnified);
      });

      this.on('input:acceleration:estimated', (accelerationEstimated) => {
        let acceleration = accelerationEstimated;
        let rotationRate = null;

        if (this.sensorSupport.rotationRate)
          rotationRate = this.motionData.rotationRate.raw;

        this._estimateEnergy(id, numFrames, acceleration, rotationRate);
      });
    } else {
      console.log('ERROR: Impossible to estimate the energy with the available sensors.');
    }
  }

  jiggle(id) {
    this.on('input:energy:' + id, (energy) => {
      this._triggerJiggle(energy);
    })
  }

}

/**
 * --------------
 * HELPER CLASSES
 * --------------
 */

class EulerAngle {
  constructor(alpha, beta, gamma) {
    this.alpha = alpha || 0;
    this.beta = beta || 0;
    this.gamma = gamma || 0;
  }

  setFromRotationMatrix(matrix) {
    const m = matrix.elements;
    let alpha, beta, gamma;


    /**
     * Cf. W3C specification (http://w3c.github.io/deviceorientation/spec-source-orientation.html)
     * and Euler angles Wikipedia page (http://en.wikipedia.org/wiki/Euler_angles).
     *
     * W3C convention: Tait–Bryan angles Z-X'-Y'', where
     *   alpha is in [0; 360[
     *   beta is in [-180; 180[
     *   gamma is in [-90; 90[
     */

    /** 
     * In the comments that follow, we use this notation:
     *   cA = cos(alpha)
     *   cB = cos(beta)
     *   cG = cos(gamma)
     *   sA = sin(alpha)
     *   sB = sin(beta)
     *   sG = sin(gamma)
     */

    /**
     * The rotation matrix associated with the rotations Z-X'-Y'' is:
     *   m[0] = cA * cG - sA * sB * sG
     *   m[1] = -cB * sA
     *   m[2] = cA * sG + cG * sA * sB
     *   m[3] = cG * sA + cA * sB * sG
     *   m[4] = cA * cB
     *   m[5] = sA * sG - cA * cG * sB
     *   m[6] = -cB * sG
     *   m[7] = sB
     *   m[8] = cB * cG
     */

    // Since gamma is in [-90; 90[, cG >= 0.
    //
    // Case 1: m[8] > 0 <=> cB > 0                (and cG != 0)
    //                  <=> beta in ]-pi/2; pi/2[ (and cG != 0)
    if (m[8] > 0) {
      alpha = Math.atan2(-m[1], m[4]);
      beta = Math.asin(m[7]); // asin returns a number between -pi/2 and pi/2
      gamma = Math.atan2(-m[6], m[8]);
    }
    // Case 2: m[8] < 0 <=> cB < 0                            (and cG != 0)
    //                  <=> beta in [-pi; -pi/2[ U ]pi/2; pi] (and cG != 0)
    else if (m[8] < 0) {
      // Since cB < 0 and cB is in m[1] and m[4], the point is flipped by 180 degrees.
      // Hence, we have to multiply both arguments of atan2 by -1 in order
      // to revert the point in its original position (=> another flip by 180 degrees).
      alpha = Math.atan2(m[1], -m[4]);
      beta = -Math.asin(m[7]); // asin returns a number between -pi/2 and pi/2
      beta += (beta >= 0) ? -Math.PI : Math.PI; // beta in [-pi; -pi/2[ U ]pi/2; pi]
      gamma = Math.atan2(m[6], -m[8]); // same remark as for alpha
    }
    // Case 3: m[8] = 0 <=> cB = 0 or cG = 0 
    else {
      // Subcase 1: cG = 0 and cB > 0
      //            cG = 0 <=> sG = -1 <=> gamma = -pi/2 => m[6] = cB
      //            Hence, m[6] > 0 <=> cB > 0 <=> beta in ]-pi/2; pi/2[
      if (m[6] > 0) {
        alpha = Math.atan2(-m[1], m[4]);
        beta = Math.asin(m[7]); // asin returns a number between -pi/2 and pi/2
        gamma = -Math.PI / 2;
      }
      // Subcase 2: cG = 0 and cB < 0
      //            cG = 0 <=> sG = -1 <=> gamma = -pi/2 => m[6] = cB
      //            Hence, m[6] < 0 <=> cB < 0 <=> beta in [-pi; -pi/2[ U ]pi/2; pi]
      else if (m[6] < 0) {
        alpha = Math.atan2(m[1], -m[4]); // same remark as for alpha in a case above
        beta = -Math.asin(m[7]); // asin returns a number between -pi/2 and pi/2
        beta += (beta >= 0) ? -Math.PI : Math.PI; // beta in [-pi; -pi/2[ U ]pi/2; pi]
        gamma = -Math.PI / 2;
      }
      // Subcase 3: cB = 0
      // In the case where cos(beta) = 0 (i.e. beta = -pi/2 or beta = pi/2),
      // we have the gimbal lock problem: in that configuration, only the angle
      // alpha + gamma (if beta = pi/2) or alpha - gamma (if beta = -pi/2)
      // are uniquely defined: alpha and gamma can take an infinity of values.
      // For convenience, let's set gamma = 0 (and thus sin(gamma) = 0).
      // (As a consequence of the gimbal lock problem, there is a discontinuity
      // in alpha and gamma.)
      else {
        alpha = Math.atan2(m[3], m[0]);
        beta = (m[7] > 0) ? Math.PI / 2 : -Math.PI / 2;
        gamma = 0;
      }
    }

    // atan2 returns a number between -pi and pi
    // => make sure alpha is in [0, 2*pi[.
    if (alpha < 0)
      alpha += 2 * Math.PI;

    this.alpha = radToDeg(alpha);
    this.beta = radToDeg(beta);
    this.gamma = radToDeg(gamma);

  }

  setFromRotationMatrix2(matrix) {
    const m = matrix.elements;
    let alpha, beta, gamma;

    /**
     * Convention here: Tait–Bryan angles Z-X'-Y'', where
     *   alpha is in [0, +360[
     *   beta is in [-90, +90[
     *   gamma is in [-180, +180[
     */

    alpha = Math.atan2(-m[1], m[4]);
    beta = Math.asin(m[7]); // asin returns a number between -pi/2 and pi/2
    gamma = Math.atan2(-m[6], m[8]);

    // atan2 returns a number between -pi and pi
    // => make sure alpha is in [0, 2*pi[.
    if (alpha < 0)
      alpha += 2 * Math.PI;

    this.alpha = radToDeg(alpha);
    this.beta = radToDeg(beta);
    this.gamma = radToDeg(gamma);
  }

}

class RotationMatrix {
  constructor(elements) {
    this.elements = elements || [1, 0, 0, 0, 1, 0, 0, 0, 1]; // defaults to identity matrix
  }

  setFromEulerAngles(euler) {
    const a = degToRad(euler.alpha);
    const b = degToRad(euler.beta);
    const g = degToRad(euler.gamma);

    const cA = Math.cos(a);
    const cB = Math.cos(b);
    const cG = Math.cos(g);
    const sA = Math.sin(a);
    const sB = Math.sin(b);
    const sG = Math.sin(g);

    // Tait–Bryan angles Z-X'-Y''
    // Cf. W3C specification (http://w3c.github.io/deviceorientation/spec-source-orientation.html)
    // and Euler angles Wikipedia page (http://en.wikipedia.org/wiki/Euler_angles).
    const m = [cA * cG - sA * sB * sG, -cB * sA, cA * sG + cG * sA * sB, cG * sA + cA * sB * sG, cA * cB, sA * sG - cA * cG * sB, -cB * sG, sB, cB * cG];

    this.elements = m;
    this.normalize();
  }

  normalize() {
    let m = this.elements;
    const det = m[0] * m[4] * m[8] + m[1] * m[5] * m[6] + m[2] * m[3] * m[7] - m[0] * m[5] * m[7] - m[1] * m[3] * m[8] - m[2] * m[4] * m[6];

    const detInv = 1 / det;
    for (let i = 0; i < this.elements.length; i++)
      m[i] *= detInv;
  }

}



/**
 * List of motion data available
 *   accelerationIncludingGravity
 *   acceleration
 *   rotationRate
 *   orientation
 *   tiltRoll
 *   yaw
 *   energy
 *   strike
 *   ...
 *
 */

// addListener(motionDataTypes, options = {}) {
//   for (let i = 0; i < motionDataTypes.length; i++) {
//     this._setupChaining(motionDataTypes[i]);
//   }
// }

module.exports = Input;