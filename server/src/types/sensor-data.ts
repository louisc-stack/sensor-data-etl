export type SensorData = {
  timestamp: string;
  sensorName: string;
  value: number;
};

export type SensorDataRaw = {
  timestamp: string;
  sensorName: string;
  value: string;
};