import { createReadStream } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse";
import { DateTime } from "luxon";
import mysql, { type ResultSetHeader } from "mysql2/promise";
import { workerData } from "piscina";
import { z } from "zod";
import type { FileSummary } from "./types/file-summary.js";
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

export default async function processFile(filePath: string): Promise<FileSummary> {
  const config = workerData as WorkerConfig;
  const summary: FileSummary = {
    fileName: path.basename(filePath),
    rowsRead: 0,
    rowsInserted: 0,
    rowsInvalidated: 0,
    rowsTransformRejected: 0,
    rowsIgnored: 0,
    insertFailed: 0,
  };
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
      summary.rowsRead += 1;

      const validatedRecord = validateSensorData(record);
      if (!validatedRecord) {
        summary.rowsInvalidated += 1;
        continue;
      }

      const transformedRecord = transformSensorData(validatedRecord);
      if (!transformedRecord) {
        summary.rowsTransformRejected += 1;
        continue;
      }
      batch.push(transformedRecord);
      if (batch.length >= config.BATCH_SIZE) {
        await flushBatch(connection, batch, summary);
      }
    }

    await flushBatch(connection, batch, summary);
    return summary;
  } finally {
    parser.destroy();
    input.destroy();
    await connection.end();
  }
}

async function flushBatch(
  connection: mysql.Connection,
  batch: SensorData[],
  summary: FileSummary,
): Promise<void> {
  if (batch.length === 0) {
    return;
  }

  try {
    const affectedRows = await insertBatch(connection, batch);
    summary.rowsInserted += affectedRows;
    summary.rowsIgnored += batch.length - affectedRows;
  } catch {
    summary.insertFailed += batch.length;
  }
  batch.length = 0;
}

async function insertBatch(
  connection: mysql.Connection,
  batch: SensorData[],
): Promise<number> {
  const values = batch.map((record) => [
    record.timestamp,
    record.sensorName,
    record.value,
  ]);

  const [result] = await connection.query<ResultSetHeader>(
    `INSERT IGNORE INTO sensor_data (\`timestamp\`, sensorName, value) VALUES ?`,
    [values],
  );
  return result.affectedRows;
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
