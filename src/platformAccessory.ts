import { Service, PlatformAccessory } from 'homebridge';

import { SamsungAC } from './platform';
import { SamsungAPI } from './samsungApi';

export class SamsungACPlatformAccessory {
  private acService: Service;
  // private fanV2Service: Service;
  private humidityService: Service | undefined;

  private states = {
    On: 'on',
    Off: 'off',
  };
  
  private deviceMode = {
    Cool: 'cool',
    Dry: 'dry',
    Fan: 'wind',
    Auto: 'aIComfort',
  };

  // deviceMode fixed to aIComfort
  // private deviceMode = {
  //   Cool: 'cool',
  //   Dry: 'dry',
  //   Fan: 'wind',
  //   Auto: 'aIComfort',
  // };

  // FanV2 Disabled
  // private fanMode = {
  //   Auto: { name: 'auto', rotation: 0 },
  //   Low: { name: 'low', rotation: 25 },
  //   Medium: { name: 'medium', rotation: 50 },
  //   High: { name: 'high', rotation: 75 },
  //   Turbo: { name: 'turbo', rotation: 100 },
  // };

  // private swingMode = {
  //   All: 'all',
  //   Fixed: 'fixed',
  // };

  // private windFreeMode = {
  //   Off: 'off', // maps to SWING_ENABLED
  //   windFree: 'windFree', // maps to SWING_DISABLED
  // };

  private defaultTemperature = 27;
  private defaultHumidity = 50;

  constructor(
    private readonly platform: SamsungAC,
    private readonly accessory: PlatformAccessory,
    // public readonly log: Logger,
  ) {
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, accessory.context.device.manufacturerName)
      .setCharacteristic(this.platform.Characteristic.Model, accessory.context.device.deviceTypeName)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.device.deviceId);

    this.acService = this.accessory.getService(this.platform.Service.HeaterCooler)
      || this.accessory.addService(this.platform.Service.HeaterCooler);

    this.acService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.label);

    // register handlers for the On/Off Characteristic
    this.acService.getCharacteristic(this.platform.Characteristic.Active)
      // Active
      // 0:inactive  1:active
      .onSet(this.handleHeaterCoolerActiveSet.bind(this))
      .onGet(this.handleHeaterCoolerActiveGet.bind(this));

    this.acService.getCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState)
      // Current Heater-Cooler State
      // 0:inactive  1:idle  2:heating  3:cooling
      .setProps({
        minValue: 0,
        maxValue: 3, 
        validValues: [0,1,3]
      })
      .onGet(this.handleCurrentHeaterCoolerStateGet.bind(this));

    this.acService.getCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState)
      // Target Heater-Cooler State
      // 0:auto  1:heat  2:cool
      .setProps({
        minValue: 0,
        maxValue: 2,
        validValues: [0,2]
      })
      .onGet(this.handleTargetHeaterCoolerStateGet.bind(this))
      .onSet(this.handleTargetHeaterCoolerStateSet.bind(this));
      
    this.acService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.handleCurrentTemperatureGet.bind(this));

    const temperatureProps = {
      minValue: 16,
      maxValue: 30,
      minStep: 1,
    };

    this.acService.getCharacteristic(this.platform.Characteristic.CoolingThresholdTemperature)
      .setProps(temperatureProps)
      .onSet(this.handleCoolingTemperatureSet.bind(this))
      .onGet(this.handleCoolingTemperatureGet.bind(this));

    // Heating Disabled
    // this.acService.getCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature)
    //   .setProps(temperatureProps)
    //   .onSet(this.handleCoolingTemperatureSet.bind(this))
    //   .onGet(this.handleHeatingTemperatureGet.bind(this));

    // FanV2 Service Disabled
    // /**
    //  *  FanV2 Service
    //  */
    // this.fanV2Service = this.accessory.getService(this.platform.Service.Fanv2)
    //   || this.accessory.addService(this.platform.Service.Fanv2);
    // 
    // this.fanV2Service.getCharacteristic(this.platform.Characteristic.Active)
    //   .onSet(this.handleFanActiveSet.bind(this))
    //   .onGet(this.handleFanActiveGet.bind(this));
    // 
    // const rotationProps = {
    //   minValue: 0,
    //   maxValue: 100,
    //   minStep: 25,
    // };

    // // register handlers for the Fan Rotation Speed Characteristic
    // this.fanV2Service.getCharacteristic(this.platform.Characteristic.RotationSpeed)
    //   .setProps(rotationProps)
    //   .onSet(this.handleRotationSpeedSet.bind(this))
    //   .onGet(this.handleRotationSpeedGet.bind(this));

    // // register handlers for the Target Fan State Characteristic
    // this.fanV2Service.getCharacteristic(this.platform.Characteristic.CurrentFanState)
    //   .onGet(this.handleFanActiveGet.bind(this));

    // // register handlers for the Target Fan State Characteristic
    // this.fanV2Service.getCharacteristic(this.platform.Characteristic.TargetFanState)
    //   .onSet(this.handleTargetFanStateSet.bind(this))
    //   .onGet(this.handleTargetFanStateGet.bind(this));

    // // If WindFree is available, the "oscillating" button in Home should control the windFree option.
    // // Otherwise, limited oscillation support is available
    // if (this.platform.config.windFreeSupported) {
    //   //  register handlers for the WindFree Characteristic
    //   this.fanV2Service.getCharacteristic(this.platform.Characteristic.SwingMode)
    //     .onSet(this.handleWindFreeModeSet.bind(this))
    //     .onGet(this.handleWindFreeModeGet.bind(this));

      // // register handlers for the Fan Swing Mode Characteristic
      // this.acService.getCharacteristic(this.platform.Characteristic.SwingMode)
      //   .onSet(this.handleSwingModeSet.bind(this))
      //   .onGet(this.handleSwingModeGet.bind(this));
    // } else {
    //   // register handlers for the Fan Swing Mode Characteristic
    //   this.fanV2Service.getCharacteristic(this.platform.Characteristic.SwingMode)
    //     .onSet(this.handleSwingModeSet.bind(this))
    //     .onGet(this.handleSwingModeGet.bind(this));
    // }

    // Humidity Service always enabled
    this.humidityService = this.accessory.getService(this.platform.Service.HumiditySensor)
      || this.accessory.addService(this.platform.Service.HumiditySensor);

    this.humidityService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
      .onGet(this.handleCurrentHumidityGet.bind(this));
  }  
  /**
   * constructor ends
   * index
   * 
   * Characteristic.Active
   *  0:inactive  1:active
   *    handleHeaterCoolerActiveSet
   *    handleHeaterCoolerActiveGet
   *
   * Characteristic.CurrentHeaterCoolerState
   *  0:inactive  1:idle  2:heating  3:cooling
   *  validValues: [0,1,3]
   *    handleCurrentHeaterCoolerStateGet
   *
   * Characteristic.TargetHeaterCoolerState
   *  0:auto  1:heat  2:cool
   *  validValues: [0,2]
   *    handleTargetHeaterCoolerStateGet
   *    handleTargetHeaterCoolerStateSet
   *
   * Characteristic.CurrentTemperature
   *    handleCurrentTemperatureGet
   *
   * Characteristic.CoolingThresholdTemperature
   *    handleCoolingTemperatureSet
   *    handleCoolingTemperatureGet
   *
   */

  /**
   * Characteristic.Active
   *  0:inactive  1:active
   * Characteristic.CurrentHeaterCoolerState
   *  0:inactive  1:idle  2:heating  3:cooling
   */
  async handleHeaterCoolerActiveGet() {
    // set this to a valid value for Active
    let currentValue = this.platform.Characteristic.Active.INACTIVE;
    await SamsungAPI.getDeviceStatus(this.accessory.context.device.deviceId, this.accessory.context.token)
      .then((status) => { // feed the output from above
        if (status === this.states.On) { // if API returns 'on',
          return this.handleCurrentHeaterCoolerStateGet(); 
            // return "this.handleCurrentHeaterCoolerStateGet()" as currentMode
            // does this execute "this.handleCurrentHeaterCoolerStateGet()" as well?
        } else { // if not
          return this.platform.Characteristic.CurrentHeaterCoolerState.INACTIVE; 
            // return "this.platform.Characteristic.CurrentHeaterCoolerState.INACTIVE" as currentMode
        }
      }).then((currentMode) => { // feed the output from above
        // The heater cooler system is not active if only the fan is operating (???)
        if (currentMode !== this.platform.Characteristic.CurrentHeaterCoolerState.INACTIVE) { 
          // if it returned "this.handleCurrentHeaterCoolerStateGet()" (which means it's on)
          currentValue = this.platform.Characteristic.Active.ACTIVE; // return ACTIVE
        }
      }).catch((error) => {
        this.platform.log.warn(error);
      });

    return currentValue; // feed the output from above
  }

  async handleHeaterCoolerActiveSet(value) {
    // value: "this.platform.Characteristic.Active.ACTIVE" or "this.platform.Characteristic.Active.INACTIVE"
    let statusValue: string;
    if (value === this.platform.Characteristic.Active.ACTIVE) {
      // turn the AC on
      statusValue = this.states.On;

      // Idle state disabled (FanV2)
      // if (await this.handleCurrentHeaterCoolerStateGet() === this.platform.Characteristic.CurrentHeaterCoolerState.INACTIVE) {
      //   // Fan only mode is turned on so far but A/C system was request to be turned on
      //   this.handleTargetHeaterCoolerStateSet(this.platform.Characteristic.TargetHeaterCoolerState.AUTO)
      //     .then(() => this.handleRotationSpeedGet());
      // }
      
      // windFree disabled (FanV2)
      // // windFree mode (if supported) cannot be activated directly, the device will start in normal mode
      // this.fanV2Service.getCharacteristic(this.platform.Characteristic.CurrentFanState)
      //   .updateValue(this.platform.Characteristic.CurrentFanState.BLOWING_AIR);
      
    } else { 
      // turn the AC OFF
      statusValue = this.states.Off;
      
      // this.fanV2Service.getCharacteristic(this.platform.Characteristic.CurrentFanState)
      //   .updateValue(this.platform.Characteristic.CurrentFanState.INACTIVE);
    }
    await SamsungAPI.setDeviceStatus(this.accessory.context.device.deviceId, statusValue, this.accessory.context.token);

    // // Take the same input value for the fan service. Either, the device is now turned on or off completely
    // this.fanV2Service.getCharacteristic(this.platform.Characteristic.Active)
    //   .updateValue(value);
  }

  /**
   * Characteristic.CurrentHeaterCoolerState
   *  0:inactive  1:idle  2:heating  3:cooling
   *  validValues: [0,1,3]
   *    handleCurrentHeaterCoolerStateGet
   *
   * deviceMode
   *  Cool: 'cool'
   *  Dry: 'dry',
   *  Fan: 'wind',
   *  Auto: 'aIComfort',
   */

  async handleCurrentHeaterCoolerStateGet() {
    // set this to a valid value for CurrentHeaterCoolerState
    let currentValue = this.platform.Characteristic.CurrentHeaterCoolerState.IDLE; // also returned for "auto" mode
    await SamsungAPI.getDeviceMode(this.accessory.context.device.deviceId, this.accessory.context.token)
      .then((deviceMode) => {
        switch (deviceMode) {
          case this.deviceMode.Auto: { // only Auto is permitted as COOLING
            currentValue = this.platform.Characteristic.CurrentHeaterCoolerState.COOLING;
            break;
          }
          // Heating Disabled
          // case this.deviceMode.Heat: {
          //   currentValue = this.platform.Characteristic.CurrentHeaterCoolerState.HEATING;
          //   break;
          // }
          case this.deviceMode.Cool:
          case this.deviceMode.Dry:
          case this.deviceMode.Fan: {
            currentValue = this.platform.Characteristic.CurrentHeaterCoolerState.INACTIVE;
            // currentValue = this.platform.Characteristic.CurrentHeaterCoolerState.IDLE; // changed INACTIVE to IDLE
            break;
          }
        }
        
        this.acService.getCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState)
          .updateValue(currentValue);
      }).catch((error) => {
        this.platform.log.warn(error);
      });

    return currentValue;
  }


  /**
   * Characteristic.TargetHeaterCoolerState
   *  0:AUTO  1:HEAT  2:COOL
   *  validValues: [0,2]
   *    handleTargetHeaterCoolerStateGet
   *    handleTargetHeaterCoolerStateSet
   */
  async handleTargetHeaterCoolerStateGet() {
    // set this to a valid value for TargetHeaterCoolerState
    let currentValue = this.platform.Characteristic.TargetHeaterCoolerState.AUTO;
    await SamsungAPI.getDeviceMode(this.accessory.context.device.deviceId, this.accessory.context.token)
      .then((deviceMode) => {
        switch (deviceMode) {
          case this.deviceMode.Dry:
          case this.deviceMode.Cool: {
            currentValue = this.platform.Characteristic.TargetHeaterCoolerState.COOL;
            break;
          }
          // case this.deviceMode.Heat: {
          //   currentValue = this.platform.Characteristic.TargetHeaterCoolerState.HEAT;
          //   break;
          // }
          case this.deviceMode.Auto: {
            currentValue = this.platform.Characteristic.TargetHeaterCoolerState.AUTO; // added AUTO return
            break;
          }
        }
        this.acService.getCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState)
          .updateValue(currentValue);
      }).catch((error) => {
        this.platform.log.warn(error);
      });

    return currentValue;
  }

  async handleTargetHeaterCoolerStateSet(value) {
    let modeValue = this.deviceMode.Auto;
    switch (value) {
      case this.platform.Characteristic.TargetHeaterCoolerState.AUTO: {
        modeValue = this.deviceMode.Auto; // added AUTO case
        break;
      }
      case this.platform.Characteristic.TargetHeaterCoolerState.COOL: {
        modeValue = this.deviceMode.Cool;
        break;
      }
      // case this.platform.Characteristic.TargetHeaterCoolerState.HEAT: {
      //   modeValue = this.deviceMode.Heat;
      //   break;
      // }
    }

    await SamsungAPI.setDeviceMode(this.accessory.context.device.deviceId, modeValue, this.accessory.context.token);
    // The device (and the fan) is now turned on
    await this.handleHeaterCoolerActiveSet(this.platform.Characteristic.Active.ACTIVE);
  }

  /**
   * Handle requests to get the current value of the "Current Humidity" characteristic
   */
  async handleCurrentHumidityGet() {
    // set this to a valid value for CurrentRelativeHumidity
    let currentValue = this.defaultHumidity;
    await SamsungAPI.getDeviceHumidity(this.accessory.context.device.deviceId, this.accessory.context.token)
      .then((humidity) => {
        currentValue = humidity;
        if (this.humidityService) {
          this.humidityService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
            .updateValue(currentValue);
        }
      }).catch((error) => {
        this.platform.log.warn(error);
      });

    return currentValue;
  }

  /**
   * Handle requests to get the current value of the "Current Temperature" characteristic
   */
  async handleCurrentTemperatureGet() {
    // set this to a valid value for CurrentTemperature
    let currentValue = this.defaultTemperature;
    await SamsungAPI.getDeviceTemperature(this.accessory.context.device.deviceId, this.accessory.context.token)
      .then((temperature) => {
        if (this.accessory.context.temperatureUnit === 'F') {
          temperature = SamsungACPlatformAccessory.toCelsius(temperature);
        }
        currentValue = temperature;
        this.acService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
          .updateValue(temperature);
      }).catch((error) => {
        this.platform.log.warn(error);
      });

    return currentValue;
  }
  
  /**
   * Characteristic.CoolingThresholdTemperature
   *    handleCoolingTemperatureSet
   *    handleCoolingTemperatureGet
   */
  async handleCoolingTemperatureGet() {
    let currentValue = this.defaultTemperature;
    // get value for DesiredTemperature
    await SamsungAPI.getDesiredTemperature(this.accessory.context.device.deviceId, this.accessory.context.token)
      .then((temperature) => {
        if (this.accessory.context.temperatureUnit === 'F') {
          temperature = SamsungACPlatformAccessory.toCelsius(temperature);
        }
        currentValue = temperature;
        this.acService.getCharacteristic(this.platform.Characteristic.CoolingThresholdTemperature)
          .updateValue(temperature);
        return temperature;
      }).catch((error) => {
        this.platform.log.warn(error);
      });

    return currentValue;
  }
  
  // Heating Disabled
  // async handleHeatingTemperatureGet() {
  //   let currentValue = this.defaultTemperature;
  //   // get value for DesiredTemperature
  //   await SamsungAPI.getDesiredTemperature(this.accessory.context.device.deviceId, this.accessory.context.token)
  //     .then((temperature) => {
  //       if (this.accessory.context.temperatureUnit === 'F') {
  //         temperature = SamsungACPlatformAccessory.toCelsius(temperature);
  //       }
  //       currentValue = temperature;
  //       this.acService.getCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature)
  //         .updateValue(temperature);
  //     }).catch((error) => {
  //       this.platform.log.warn(error);
  //     });

  //   return currentValue;
  // }

  async handleCoolingTemperatureSet(temp) {
    // set this to a valid value for DesiredTemperature
    if (this.accessory.context.temperatureUnit === 'F') {
      temp = SamsungACPlatformAccessory.toFahrenheit(temp);
    }
    await SamsungAPI.setDesiredTemperature(this.accessory.context.device.deviceId, temp, this.accessory.context.token);
  }

  // FanV2 Disabled
  // /**
  //  * Handle requests to get the current value of the "Active" characteristic of the Fan V2 Service
  //  */
  // async handleFanActiveGet() {
  //   // set this to a valid value for Active
  //   let currentValue = this.platform.Characteristic.Active.INACTIVE;
  //   await SamsungAPI.getDeviceStatus(this.accessory.context.device.deviceId, this.accessory.context.token)
  //     .then((status) => {
  //       if (status === this.states.On) {
  //         currentValue = this.platform.Characteristic.Active.ACTIVE;
  //       }

  //       // The device status maps directly to the Active characteristic of the Fan service
  //       this.fanV2Service.getCharacteristic(this.platform.Characteristic.Active)
  //         .updateValue(currentValue);

  //       if (currentValue === this.platform.Characteristic.Active.ACTIVE) {
  //         return this.handleWindFreeModeGet();
  //       }
  //     }).then((windFreeMode) => {
  //       const currentState = this.platform.Characteristic.CurrentFanState;
  //       let fanValue;
  //       if (windFreeMode === undefined) {
  //         // The fan is not active and the previous Promise did not return a new Promise
  //         fanValue = currentState.INACTIVE;
  //       } else if (this.platform.Characteristic.SwingMode.SWING_DISABLED) {
  //         fanValue = currentState.IDLE;
  //       } else {
  //         // This value is also used if windFreeMode is not available
  //         fanValue = currentState.BLOWING_AIR;
  //       }

  //       this.fanV2Service
  //         .getCharacteristic(this.platform.Characteristic.CurrentFanState)
  //         .updateValue(fanValue);
  //     }).catch((error) => {
  //       this.platform.log.warn(error);
  //     });

  //   return currentValue;
  // }

  // /**
  //  * Handle requests to set the "Active" characteristic of the Fan V2 Service
  //  */
  // async handleFanActiveSet(value) {
  //   let statusValue: string;
  //   if (value === this.platform.Characteristic.Active.ACTIVE) {
  //     statusValue = this.states.On;
  //     this.handleFanActiveGet()
  //       .then((activeModeFan) => {
  //         if (activeModeFan === this.platform.Characteristic.Active.INACTIVE) {
  //           return this.handleHeaterCoolerActiveGet();
  //         }
  //       }).then((activeModeAC) => {
  //         if (activeModeAC === undefined) {
  //         // The fan is already active and the previous Promise did not return a new Promise
  //         // Nothing should be changed here, skipping the actions below
  //           return;
  //         } else if (activeModeAC === this.platform.Characteristic.Active.INACTIVE) {
  //           SamsungAPI.setDeviceMode(this.accessory.context.device.deviceId, this.deviceMode.Fan, this.accessory.context.token);
  //           // The fan will be set to "Low" and manual mode
  //           this.fanV2Service.getCharacteristic(this.platform.Characteristic.RotationSpeed)
  //             .updateValue(this.fanMode.Low.rotation);
  //           this.fanV2Service.getCharacteristic(this.platform.Characteristic.TargetFanState)
  //             .updateValue(this.platform.Characteristic.TargetFanState.MANUAL);
  //         } else {
  //           this.handleRotationSpeedGet();
  //         }
  //       });
  //     // windFree mode (if supported) cannot be activated directly, the device will start in normal mode
  //     this.fanV2Service.getCharacteristic(this.platform.Characteristic.CurrentFanState)
  //       .updateValue(this.platform.Characteristic.CurrentFanState.BLOWING_AIR);
  //   } else {
  //     statusValue = this.states.Off;
  //     this.fanV2Service.getCharacteristic(this.platform.Characteristic.CurrentFanState)
  //       .updateValue(this.platform.Characteristic.CurrentFanState.INACTIVE);
  //   }
  // 
  //   await SamsungAPI.setDeviceStatus(this.accessory.context.device.deviceId, statusValue, this.accessory.context.token);
  // }

  // /**
  //  * Handle requests to get the current value of the "Rotation Speed" characteristic
  //  */
  // async handleRotationSpeedGet() {
  //   let currentValue = this.fanMode.Auto.rotation;
  //   // set this to a valid value for RotationSpeed
  //   await SamsungAPI.getFanMode(this.accessory.context.device.deviceId, this.accessory.context.token)
  //     .then((fanMode) => {
  //       switch (fanMode) {
  //         case this.fanMode.Auto.name: {
  //           currentValue = this.fanMode.Auto.rotation;
  //           break;
  //         }
  //         case this.fanMode.Low.name: {
  //           currentValue = this.fanMode.Low.rotation;
  //           break;
  //         }
  //         case this.fanMode.Medium.name: {
  //           currentValue = this.fanMode.Medium.rotation;
  //           break;
  //         }
  //         case this.fanMode.High.name: {
  //           currentValue = this.fanMode.High.rotation;
  //           break;
  //         }
  //         case this.fanMode.Turbo.name: {
  //           currentValue = this.fanMode.Turbo.rotation;
  //           break;
  //         }
  //       }

  //       this.fanV2Service.getCharacteristic(this.platform.Characteristic.RotationSpeed)
  //         .updateValue(currentValue);
  //     }).then(() => this.handleTargetFanStateGet())
  //     .catch((error) => {
  //       this.platform.log.warn(error);
  //     });

  //   return currentValue;
  // }

  // /**
  //  * Handle requests to set the "Rotation Speed" characteristic
  //  */
  // async handleRotationSpeedSet(speed) {
  //   if (await this.handleHeaterCoolerActiveGet() === this.platform.Characteristic.Active.INACTIVE) {
  //     // If the heater cooler system is inactive but the rotation speed was changed, fan mode is desired
  //     await SamsungAPI.setDeviceMode(this.accessory.context.device.deviceId, this.deviceMode.Fan, this.accessory.context.token);
  //   } else if (await this.handleCurrentHeaterCoolerStateGet() === this.platform.Characteristic.CurrentHeaterCoolerState.IDLE) {
  //     // The fan speed cannot be changed if the heater cooler system is idle. Reverting.
  //     await this.handleRotationSpeedGet();
  //     return;
  //   }

  //   let modeValue = this.fanMode.Auto.name;
  //   switch (speed) {
  //     case 0: {
  //       // If the target rotation speed is set to 0, the device should be turned off
  //       return this.handleFanActiveSet(this.platform.Characteristic.Active.INACTIVE);
  //     }
  //     case this.fanMode.Low.rotation: {
  //       modeValue = this.fanMode.Low.name;
  //       break;
  //     }
  //     case this.fanMode.Medium.rotation: {
  //       modeValue = this.fanMode.Medium.name;
  //       break;
  //     }
  //     case this.fanMode.High.rotation: {
  //       modeValue = this.fanMode.High.name;
  //       break;
  //     }
  //     case this.fanMode.Turbo.rotation: {
  //       modeValue = this.fanMode.Turbo.name;
  //       break;
  //     }
  //   }

  //   if (modeValue !== this.fanMode.Auto.name) {
  //     // The fan speed indicates that manual mode is desired
  //     this.fanV2Service.getCharacteristic(this.platform.Characteristic.TargetFanState)
  //       .updateValue(this.platform.Characteristic.TargetFanState.MANUAL);
  //   }
  //   SamsungAPI.setFanMode(this.accessory.context.device.deviceId, modeValue, this.accessory.context.token)
  //     // After changing the fan mode, we definitely know that the fan is active
  //     .then(() => this.handleFanActiveSet(this.platform.Characteristic.Active.ACTIVE));
  // }

  // /**
  //  * Handle requests to get the current value of the "Target Fan State" characteristic
  //  */
  // async handleTargetFanStateGet() {
  //   let currentValue = this.platform.Characteristic.TargetFanState.AUTO;
  //   // set this to a valid value for TargetFanState
  //   await SamsungAPI.getFanMode(this.accessory.context.device.deviceId, this.accessory.context.token)
  //     .then((fanMode) => {
  //       if (fanMode === this.fanMode.Auto.name) {
  //         currentValue = this.platform.Characteristic.TargetFanState.AUTO;
  //       } else {
  //         currentValue = this.platform.Characteristic.TargetFanState.MANUAL;
  //       }

  //       this.fanV2Service.getCharacteristic(this.platform.Characteristic.TargetFanState)
  //         .updateValue(currentValue);
  //     }).catch((error) => {
  //       this.platform.log.warn(error);
  //     });

  //   return currentValue;
  // }

  // /**
  //  * Handle requests to set the "Target Fan State" characteristic
  //  */
  // async handleTargetFanStateSet(value) {
  //   if (await this.handleHeaterCoolerActiveGet() === this.platform.Characteristic.Active.INACTIVE) {
  //     // The fan cannot be set to "auto" if the heater cooler system is not active.
  //     this.fanV2Service.getCharacteristic(this.platform.Characteristic.TargetFanState)
  //       .updateValue(this.platform.Characteristic.TargetFanState.MANUAL);
  //     return;
  //   }

  //   let modeValue: string;
  //   if (value === this.platform.Characteristic.TargetFanState.MANUAL) {
  //     modeValue = this.fanMode.Medium.name;
  //     this.fanV2Service.getCharacteristic(this.platform.Characteristic.RotationSpeed)
  //       .updateValue(this.fanMode.Medium.rotation);
  //   } else {
  //     modeValue = this.fanMode.Auto.name;
  //     this.fanV2Service.getCharacteristic(this.platform.Characteristic.RotationSpeed)
  //       .updateValue(this.fanMode.Auto.rotation);
  //   }
  //   await SamsungAPI.setFanMode(this.accessory.context.device.deviceId, modeValue, this.accessory.context.token);
  // }

  // /**
  //  * Handle requests to get the current value of the "Swing Mode" characteristic, used for the windFree support
  //  */
  // async handleWindFreeModeGet() {
  //   let currentValue = this.platform.Characteristic.SwingMode.SWING_ENABLED;
  //   if (this.platform.config.windFreeSupported) {
  //     // set this to a valid value for SwingMode
  //     await SamsungAPI.getWindFreeMode(this.accessory.context.device.deviceId, this.accessory.context.token)
  //       .then((windFreeMode) => {
  //         if (windFreeMode === this.windFreeMode.windFree) {
  //           currentValue = this.platform.Characteristic.SwingMode.SWING_DISABLED;
  //           this.fanV2Service.getCharacteristic(this.platform.Characteristic.CurrentFanState)
  //             .updateValue(this.platform.Characteristic.CurrentFanState.IDLE);
  //         } else {
  //           this.fanV2Service.getCharacteristic(this.platform.Characteristic.CurrentFanState)
  //             .updateValue(this.platform.Characteristic.CurrentFanState.BLOWING_AIR);
  //         }

  //         this.fanV2Service.getCharacteristic(this.platform.Characteristic.SwingMode)
  //           .updateValue(currentValue);
  //       }).catch((error) => {
  //         this.platform.log.warn(error);
  //       });
  //   }

  //   return currentValue;
  // }

  // /**
  //  * Handle requests to set the "Swing Mode" characteristic, used for the windFree support
  //  */
  // async handleWindFreeModeSet(value) {
  //   let statusValue: string;
  //   if (value === 1) {
  //     statusValue = this.windFreeMode.Off;
  //     this.fanV2Service.getCharacteristic(this.platform.Characteristic.CurrentFanState)
  //       .updateValue(this.platform.Characteristic.CurrentFanState.BLOWING_AIR);
  //   } else {
  //     statusValue = this.windFreeMode.windFree;
  //     this.fanV2Service.getCharacteristic(this.platform.Characteristic.CurrentFanState)
  //       .updateValue(this.platform.Characteristic.CurrentFanState.IDLE);
  //   }
  //   await SamsungAPI.setWindFreeMode(this.accessory.context.device.deviceId, statusValue, this.accessory.context.token);
  // }


  // /**
  //  * Handle requests to get the current value of the "Swing Mode" characteristic
  //  */
  // async handleSwingModeGet() {
  //   let currentValue = this.platform.Characteristic.SwingMode.SWING_ENABLED;
  //   // set this to a valid value for SwingMode
  //   await SamsungAPI.getFanOscillationMode(this.accessory.context.device.deviceId, this.accessory.context.token)
  //     .then((fanOscillationMode) => {
  //       if (fanOscillationMode === this.swingMode.Fixed) {
  //         // Other values for `fanOscillationMode` are possible but are not represented in HomeKit
  //         currentValue = this.platform.Characteristic.SwingMode.SWING_DISABLED;
  //       }

  //       if (this.platform.config.windFreeSupported) {
  //         this.acService.getCharacteristic(this.platform.Characteristic.SwingMode)
  //           .updateValue(currentValue);
  //       } else {
  //         this.fanV2Service.getCharacteristic(this.platform.Characteristic.SwingMode)
  //           .updateValue(currentValue);
  //       }

  //     }).catch((error) => {
  //       this.platform.log.warn(error);
  //     });

  //   return currentValue;
  // }

  // /**
  //  * Handle requests to set the "Swing Mode" characteristic
  //  */
  // async handleSwingModeSet(value) {
  //   const statusValue = value === 1 ? this.swingMode.All : this.swingMode.Fixed ;
  //   await SamsungAPI.setFanOscillationMode(this.accessory.context.device.deviceId, statusValue, this.accessory.context.token);
  // }

  private static toCelsius(fTemperature) {
    return Math.round((5/9) * (fTemperature - 32));
  }

  private static toFahrenheit(cTemperature){
    return Math.round((cTemperature * 1.8) + 32);
  }
}
