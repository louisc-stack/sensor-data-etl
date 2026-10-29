import { createReadStream } from "node:fs";
import { parse } from "csv-parse";
import { DateTime } from "luxon";
import mysql from "mysql2/promise";
import { workerData } from "piscina";
import { z } from "zod";
import type { SensorData, SensorDataRaw } from "./types/sensor-data.js";
import type { WorkerConfig } from "./types/worker-config.js";

const csvSensorRowSchema = z.object({
  timestamp: z.iso.datetime({ offset: true }),
  sensorName: z.string()
    .refine((field) => field.trim() !== "")
    .refine((field) => field.length >= 1 && field.length <= 255),
  value: z.string()
    .refine((field) => field.trim() !== "")
    .refine((field) => Number.isFinite(Number(field))),
});

export default async function processFile(filePath: string): Promise<void> {
  const config = workerData as WorkerConfig;
  const connection = await mysql.createConnection({
    host: config.DATABASE_HOST,
    port: config.DATABASE_PORT,
    user: config.DATABASE_USER,
    password: config.DATABASE_PASSWORD,
    database: config.DATABASE_NAME,
  });
  const input = createReadStream(filePath);
  const parser = input.pipe(
    parse({
      columns: true,
      relax_column_count: true,
      skip_empty_lines: true,
      bom: true,
    }),
  );

  const batch: SensorData[] = [];

  try {
    for await (const record of parser) {
      const validatedRecord = validateSensorData(record);
      if (!validatedRecord) {
        continue;
      }

      const transformedRecord = transformSensorData(validatedRecord);
      if (!transformedRecord) {
        continue;
      }
      batch.push(transformedRecord);
      if (batch.length >= config.BATCH_SIZE) {
        await insertBatch(connection, batch);
        batch.length = 0;
      }
    }

    if (batch.length > 0) {
      await insertBatch(connection, batch);
    }
  } finally {
    parser.destroy();
    input.destroy();
    await connection.end();
  }
}

async function insertBatch(connection: mysql.Connection, batch: SensorData[]): Promise<void> {
  const values = batch.map((record) => [record.timestamp, record.sensorName, record.value]);

  try {
    await connection.query(
      `INSERT IGNORE INTO sensor_data (\`timestamp\`, sensorName, value) VALUES ?`,
      [values],
    );
  } catch (error) {
    throw error;
  }
}

export function validateSensorData(record: {
  timestamp: string;
  sensorName: string;
  value: string;
}): SensorDataRaw | null {
  const parsed = csvSensorRowSchema.safeParse(record);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}

export function transformSensorData(record: {
  timestamp: string;
  sensorName: string;
  value: string;
}): SensorData | null {
  if (!record) {
    return null;
  }

  const parsedTimestamp = DateTime.fromISO(record.timestamp, { setZone: true });
  if (!parsedTimestamp.isValid) {
    return null;
  }

  return {
    timestamp: parsedTimestamp.toUTC().toFormat("yyyy-MM-dd HH:mm:ss.SSS"),
    sensorName: record.sensorName.trim(),
    value: Number(record.value.trim()),
  };
}
