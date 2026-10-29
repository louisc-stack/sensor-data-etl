import { readdir } from "node:fs/promises";
import path from "node:path";

export async function listCsvFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".csv"))
    .map((e) => path.join(dir, e.name));
}
