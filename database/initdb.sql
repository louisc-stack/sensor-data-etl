CREATE TABLE IF NOT EXISTS sensor_data (
  `timestamp` DATETIME(3) NOT NULL,
  sensorName VARCHAR(255) NOT NULL COLLATE utf8mb4_bin,
  value DOUBLE NOT NULL,
  PRIMARY KEY (sensorName, `timestamp`),
  INDEX idx_timestamp (`timestamp`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
