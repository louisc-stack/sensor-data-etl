import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { listCsvFiles } from "../src/list-csv-files.js";

describe("listCsvFiles", () => {
  let tempDir: string;

  after(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true });
    }
  });

  it("returns only top-level CSV file paths", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "list-csv-"));

    await writeFile(path.join(tempDir, "file-1.csv"), "timestamp,sensorName,value\n");
    await writeFile(path.join(tempDir, "file-2.csv"), "timestamp,sensorName,value\n");
    await writeFile(path.join(tempDir, "file-99999.csv"), "timestamp,sensorName,value\n");

    await writeFile(path.join(tempDir, "notes.txt"), "not csv\n");
    const nested = path.join(tempDir, "nested");
    await mkdir(nested);
    await writeFile(path.join(nested, "skip.csv"), "timestamp,sensorName,value\n");

    const result = await listCsvFiles(tempDir);
    result.sort();

    assert.deepEqual(result, [
      path.join(tempDir, "file-1.csv"),
      path.join(tempDir, "file-2.csv"),
      path.join(tempDir, "file-99999.csv"),
    ].sort());
  });
});
