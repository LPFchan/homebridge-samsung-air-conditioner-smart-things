import Axios from 'axios';

const AC_DEVICE_NAME = 'Samsung Floor A/C';
const HOST = 'https://api.smartthings.com/v1/devices';

// Samsung API documentation: https://developer-preview.smartthings.com/docs/devices/capabilities/capabilities-reference/
export class SamsungAPI {
  static setToken(token) {
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  static async getDevices(token) {
    const { data: { items = [] } = {} } = await Axios.get(`${HOST}`, this.setToken(token));

    return items.filter(item => item.name === AC_DEVICE_NAME);
  }

  static async getDeviceStatus(deviceId, token) {
    const response = await Axios.get(`${HOST}/${deviceId}/components/main/capabilities/switch/status`, this.setToken(token));
    return response.data.switch.value;
  }

  static async setDeviceStatus(deviceId, status, token) {
    // possible values: 'on', 'off'
    const data = {
      'commands' : [{'capability': 'switch', 'command': status}],
    };
    await Axios.post(`${HOST}/${deviceId}/commands`, data, this.setToken(token));
  }

  static async getDeviceTemperature(deviceId, token) {
    const {
      data: { temperature = { } } = {},
    } = await Axios.get(`${HOST}/${deviceId}/components/main/capabilities/temperatureMeasurement/status`, this.setToken(token));
    return temperature.value;
  }

  static async getDeviceHumidity(deviceId, token) {
    const {
      data: { humidity = { } } = {},
    } = await Axios.get(`${HOST}/${deviceId}/components/main/capabilities/relativeHumidityMeasurement/status`, this.setToken(token));
    return humidity.value;
  }

  static async getDesiredTemperature(deviceId, token) {
    const {
      data: { coolingSetpoint = { } } = {},
    } = await Axios.get(`${HOST}/${deviceId}/components/main/capabilities/thermostatCoolingSetpoint/status`, this.setToken(token));
    return coolingSetpoint.value;
  }

  static async setDesiredTemperature(deviceId, temperature, token) {
    // data type: integer
    const data = {
      'commands' : [{'capability': 'thermostatCoolingSetpoint', 'command': 'setCoolingSetpoint', 'arguments': [temperature]}],
    };

    await Axios.post(`${HOST}/${deviceId}/commands`, data, this.setToken(token));
  }

    static async getDeviceMode(deviceId, token) {
    const {
      data: { airConditionerMode = { } } = {},
    } = await Axios.get(`${HOST}/${deviceId}/components/main/capabilities/airConditionerMode/status`, this.setToken(token));
    return airConditionerMode.value;
  }

  // old setDeviceMode
  static async setDeviceMode(deviceId, mode, token) {
    // possible mode value: "aIComfort", "cool", "dry", "wind"
    const data = {
      'commands' : [{'capability': 'airConditionerMode', 'command': 'setAirConditionerMode', 'arguments': [mode]}],
    };
    await Axios.post(`${HOST}/${deviceId}/commands`, data, this.setToken(token));  

  }

  // get blossom info
  static async getFanMode(deviceId, token) {
    const {
      data: { airConditionerMode = { } } = {},
    } = await Axios.get(`${HOST}/${deviceId}/components/main/capabilities/airConditionerMode/status`, this.setToken(token));
    return airConditionerMode.value;
  }
  
  // set fan mode
  static async setFanMode(deviceId, mode, token) {
    // possible mode value: "solo", "dual"
    const fanMode = mode;
    const data = {
      'commands' : [
      {
        'capability': 'execute', 
        'command': 'execute', 
        'arguments': [
          "mode/vs/0",{
            "x.com.samsung.da.options":[mode]
          }
        ]
      }
    ],
    };
    await Axios.post(`${HOST}/${deviceId}/commands`, data, this.setToken(token));
  }

    // set fan mode (auto specific)
    static async setFanModeAuto(deviceId, fanMode, temperature, token) {
      // possible mode value: "solo", "dual"
      const data1 = {
        'commands' : [
        {
          'capability': 'execute', 
          'command': 'execute', 
          'arguments': [
            "mode/vs/0",{
              "x.com.samsung.da.modes": ["AIComfort"],
              "x.com.samsung.da.options": [fanMode, "ArtificialWorking_On", "ComfortAICooling_On", "AiTempChanged_On"]
            }
          ]
        }
      ],
      };
      const data2 = {
        'commands' : [{'capability': 'thermostatCoolingSetpoint', 'command': 'setCoolingSetpoint', 'arguments': [temperature]}],
      };
      await Axios.post(`${HOST}/${deviceId}/commands`, data1, this.setToken(token));
      await Axios.post(`${HOST}/${deviceId}/commands`, data2, this.setToken(token));
    }


  
  // // set upper+lower fan
  // static async setFanDual(deviceId, token) {
  //   const data = {
  //     'commands' : [{
  //       'capability': 'execute', 
  //       'command': 'execute', 
  //       'arguments': [
  //         "mode/vs/0",{
  //           "x.com.samsung.da.options":["Operation_Family", "Blooming_3"]
  //         }
  //       ]
  //     }],
  //   };
  //   await Axios.post(`${HOST}/${deviceId}/commands`, data, this.setToken(token));
  // }

}
