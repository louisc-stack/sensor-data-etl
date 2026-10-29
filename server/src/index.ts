import path from "node:path";
import Piscina from "piscina";
import { listCsvFiles } from "./list-csv-files.js";

async function main() {
  const {
    DATA_DIR,
    MIN_FILE_CONCURRENCY,
    MAX_FILE_CONCURRENCY,
    BATCH_SIZE,
    DATABASE_HOST,
    DATABASE_PORT,
    DATABASE_USER,
    DATABASE_PASSWORD,
    DATABASE_NAME,
  } = loadConfig();

  const csvfilePaths = await listCsvFiles(DATA_DIR);

  if (csvfilePaths.length === 0) {
    return;
  }

  const piscina = new Piscina({
    filename: path.resolve(__dirname, "worker.js"),
    minThreads: MIN_FILE_CONCURRENCY,
    maxThreads: MAX_FILE_CONCURRENCY,
    workerData: {
      DATABASE_HOST,
      DATABASE_PORT,
      DATABASE_USER,
      DATABASE_PASSWORD,
      DATABASE_NAME,
      BATCH_SIZE,
    },
  });

  try {
    await Promise.all(csvfilePaths.map((filePath) => piscina.run(filePath)));
  } finally {
    await piscina.close();
  }
}

function loadConfig() {
  const DATA_DIR = "/app/data/sensor-data";
  const MIN_FILE_CONCURRENCY = Number(process.env.MIN_FILE_CONCURRENCY);
  const MAX_FILE_CONCURRENCY = Number(process.env.MAX_FILE_CONCURRENCY);
  const BATCH_SIZE = Number(process.env.BATCH_SIZE);
  const DATABASE_HOST = process.env.DATABASE_HOST;
  const DATABASE_PORT = Number(process.env.DATABASE_PORT);
  const DATABASE_USER = process.env.DATABASE_USER;
  const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD;
  const DATABASE_NAME = process.env.DATABASE_NAME;

  if (isNaN(MIN_FILE_CONCURRENCY)) {
    throw new Error("MIN_FILE_CONCURRENCY is required");
  }
  if (isNaN(MAX_FILE_CONCURRENCY)) {
    throw new Error("MAX_FILE_CONCURRENCY is required");
  }
  if (isNaN(BATCH_SIZE)) {
    throw new Error("BATCH_SIZE is required");
  }
  if (!DATABASE_HOST) {
    throw new Error("DATABASE_HOST is required");
  }
  if (isNaN(DATABASE_PORT)) {
    throw new Error("DATABASE_PORT is required");
  }
  if (!DATABASE_USER) {
    throw new Error("DATABASE_USER is required");
  }
  if (!DATABASE_PASSWORD) {
    throw new Error("DATABASE_PASSWORD is required");
  }
  if (!DATABASE_NAME) {
    throw new Error("DATABASE_NAME is required");
  }

  return {
    DATA_DIR,
    MIN_FILE_CONCURRENCY,
    MAX_FILE_CONCURRENCY,
    BATCH_SIZE,
    DATABASE_HOST,
    DATABASE_PORT,
    DATABASE_USER,
    DATABASE_PASSWORD,
    DATABASE_NAME,
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
