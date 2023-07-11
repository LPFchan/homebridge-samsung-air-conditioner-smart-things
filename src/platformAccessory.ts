import { Service, PlatformAccessory } from 'homebridge';

import { SamsungAC } from './platform';
import { SamsungAPI } from './samsungApi';

export class SamsungACPlatformAccessory {
  private heatingCoolingService: Service;
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

  private defaultTemperature = 26;
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

    this.heatingCoolingService = this.accessory.getService(this.platform.Service.Thermostat)
      || this.accessory.addService(this.platform.Service.Thermostat);

    this.heatingCoolingService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.label);

    // register handlers for the On/Off Characteristic
    this.heatingCoolingService.getCharacteristic(this.platform.Characteristic.Active)
      .onSet(this.handleHeatingCoolingActiveSet.bind(this))
      .onGet(this.handleHeatingCoolingActiveGet.bind(this));

    this.heatingCoolingService.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState)
      .onGet(this.handleCurrentHeatingCoolingStateGet.bind(this));

    this.heatingCoolingService.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
      .onGet(this.handleTargetHeatingCoolingStateGet.bind(this))
      .onSet(this.handleTargetHeatingCoolingStateSet.bind(this));

    this.heatingCoolingService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.handleCurrentTemperatureGet.bind(this));

    const temperatureProps = {
      minValue: 16,
      maxValue: 30,
      minStep: 1,
    };

    /** 
     * Humidity Service always enabled
     */

    this.humidityService = this.accessory.getService(this.platform.Service.HumiditySensor)
      || this.accessory.addService(this.platform.Service.HumiditySensor);

    this.humidityService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
      .onGet(this.handleCurrentHumidityGet.bind(this));
  }

  /**
   * Handle requests to get the current value of the "Active" characteristic of the Heating Cooling Service
   */
  async handleHeatingCoolingActiveGet() {
    // set this to a valid value for Active
    let currentValue = this.platform.Characteristic.Active.INACTIVE;
    await SamsungAPI.getDeviceStatus(this.accessory.context.device.deviceId, this.accessory.context.token)
      .then((status) => {
        if (status === this.states.On) {
          return this.handleCurrentHeatingCoolingStateGet();
        } else {
          return this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
        }
      }).then((currentMode) => {
        // The heating cooling system is not active if only the fan is operating
        if (currentMode !== this.platform.Characteristic.CurrentHeatingCoolingState.OFF) {
          currentValue = this.platform.Characteristic.Active.ACTIVE;
        }
      }).catch((error) => {
        this.platform.log.warn(error);
      });

    return currentValue;
  }

  /**
   * Handle requests to set the "Active" characteristic of the Heating Cooling Service
   */
  async handleHeatingCoolingActiveSet(value) {
    let statusValue: string;
    if (value === this.platform.Characteristic.Active.ACTIVE) {
      statusValue = this.states.On;
      if (await this.handleCurrentHeatingCoolingStateGet() === this.platform.Characteristic.CurrentHeatingCoolingState.OFF) {
        // Fan only mode is turned on so far but A/C system was request to be turned on
        this.handleTargetHeatingCoolingStateSet(this.platform.Characteristic.TargetHeatingCoolingState.AUTO)
          .then(() => this.handleRotationSpeedGet());
      }

  /**
   * Handle requests to get the current value of the "Current Heating-Cooling State" characteristic
   */
  async handleCurrentHeatingCoolingStateGet() {
    // set this to a valid value for CurrentHeatingCoolingState (thermostat-specific)
    let currentValue = this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
    await SamsungAPI.getDeviceMode(this.accessory.context.device.deviceId, this.accessory.context.token)
      .then((deviceMode) => {
        switch (deviceMode) {
          case this.deviceMode.Auto: {
            currentValue = this.platform.Characteristic.CurrentHeatingCoolingState.COOL;
            break;
          }
          case this.deviceMode.Dry:
          case this.deviceMode.Fan:
          case this.deviceMode.Cool: {
            currentValue = this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;
            break;
          }
        }

        this.heatingCoolingService.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState)
          .updateValue(currentValue);
      }).catch((error) => {
        this.platform.log.warn(error);
      });

    return currentValue;
  }


  /**
   * Handle requests to get the current value of the "Target Heating-Cooling State" characteristic
   */
  async handleTargetHeatingCoolingStateGet() {
    // set this to a valid value for TargetHeatingCoolingState
    let currentValue = this.platform.Characteristic.TargetHeatingCoolingState.AUTO;
    await SamsungAPI.getDeviceMode(this.accessory.context.device.deviceId, this.accessory.context.token)
      .then((deviceMode) => {
        switch (deviceMode) {
          case this.deviceMode.Dry:
          case this.deviceMode.Cool: {
            currentValue = this.platform.Characteristic.TargetHeatingCoolingState.COOL;
            break;
          }
          case this.deviceMode.Heat: {
            currentValue = this.platform.Characteristic.TargetHeatingCoolingState.HEAT;
            break;
          }
        }

        this.heatingCoolingService.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
          .updateValue(currentValue);
      }).catch((error) => {
        this.platform.log.warn(error);
      });

    return currentValue;
  }

  /**
   * Handle requests to set the "Target Heating-Cooling State" characteristic
   */
  async handleTargetHeatingCoolingStateSet(value) {
    let modeValue = this.deviceMode.Auto;
    switch (value) {
      case this.platform.Characteristic.TargetHeatingCoolingState.COOL: {
        modeValue = this.deviceMode.Cool;
        break;
      }
      case this.platform.Characteristic.TargetHeatingCoolingState.HEAT: {
        modeValue = this.deviceMode.Heat;
        break;
      }
    }

    await SamsungAPI.setDeviceMode(this.accessory.context.device.deviceId, modeValue, this.accessory.context.token);
    // The device (and the fan) is now turned on
    await this.handleHeatingCoolingActiveSet(this.platform.Characteristic.Active.ACTIVE);
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
        this.heatingCoolingService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
          .updateValue(temperature);
      }).catch((error) => {
        this.platform.log.warn(error);
      });

    return currentValue;
  }

  async handleCoolingTemperatureGet() {
    let currentValue = this.defaultTemperature;
    // get value for DesiredTemperature
    await SamsungAPI.getDesiredTemperature(this.accessory.context.device.deviceId, this.accessory.context.token)
      .then((temperature) => {
        if (this.accessory.context.temperatureUnit === 'F') {
          temperature = SamsungACPlatformAccessory.toCelsius(temperature);
        }
        currentValue = temperature;
        this.heatingCoolingService.getCharacteristic(this.platform.Characteristic.CoolingThresholdTemperature)
          .updateValue(temperature);
        return temperature;
      }).catch((error) => {
        this.platform.log.warn(error);
      });

    return currentValue;
  }

  async handleHeatingTemperatureGet() {
    let currentValue = this.defaultTemperature;
    // get value for DesiredTemperature
    await SamsungAPI.getDesiredTemperature(this.accessory.context.device.deviceId, this.accessory.context.token)
      .then((temperature) => {
        if (this.accessory.context.temperatureUnit === 'F') {
          temperature = SamsungACPlatformAccessory.toCelsius(temperature);
        }
        currentValue = temperature;
        this.heatingCoolingService.getCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature)
          .updateValue(temperature);
      }).catch((error) => {
        this.platform.log.warn(error);
      });

    return currentValue;
  }

  async handleCoolingTemperatureSet(temp) {
    // set this to a valid value for DesiredTemperature
    if (this.accessory.context.temperatureUnit === 'F') {
      temp = SamsungACPlatformAccessory.toFahrenheit(temp);
    }
    await SamsungAPI.setDesiredTemperature(this.accessory.context.device.deviceId, temp, this.accessory.context.token);
  }

  private static toCelsius(fTemperature) {
    return Math.round((5/9) * (fTemperature - 32));
  }

  private static toFahrenheit(cTemperature){
    return Math.round((cTemperature * 1.8) + 32);
  }
}
