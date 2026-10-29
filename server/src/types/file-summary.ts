export type FileSummary = {
  fileName: string;
  rowsRead: number;
  rowsInserted: number;
  rowsInvalidated: number;
  rowsTransformRejected: number;
  rowsIgnored: number;
  insertFailed: number;
};
