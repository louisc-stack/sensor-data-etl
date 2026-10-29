import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateSensorData } from "../src/worker.js";

describe("validateSensorData", () => {
  describe("csv data shape", () => {
    it("reject records with missing values", () => {
      assert.equal(validateSensorData({ timestamp: "2026-10-27T08:00:00.000Z", sensorName: "temp-01", value: "" }), null);
      assert.equal(validateSensorData({ timestamp: "2026-10-27T08:03:00.000Z", sensorName: "", value: "2" }), null);
      assert.equal(validateSensorData({ timestamp: "", sensorName: "temp-01", value: "2" }), null);
      assert.equal(validateSensorData({ timestamp: "2026-10-27T08:00:00.000Z", sensorName: "temp-01", value: undefined as unknown as string }), null);
      assert.equal(validateSensorData({ timestamp: "2026-10-27T08:03:00.000Z", sensorName: undefined as unknown as string, value: "2" }), null);
      assert.equal(validateSensorData({ timestamp: undefined as unknown as string, sensorName: "temp-01", value: "2" }), null);
    });
  });

  describe("csv data: timestamps", () => {
    it("accepts ISO-8601 timestamps of 00:00:00.000Z, 14:15:30.123Z, and 23:59:59.999Z", () => {
      assert.ok(
        validateSensorData({
          timestamp: "2026-10-27T00:00:00.000Z",
          sensorName: "temp-01",
          value: "2",
        }),
      );
      assert.ok(
        validateSensorData({
          timestamp: "2026-10-27T23:59:59.999Z",
          sensorName: "temp-01",
          value: "2",
        }),
      );
      assert.ok(
        validateSensorData({
          timestamp: "2026-10-27T14:15:30.123Z",
          sensorName: "temp-01",
          value: "2",
        }),
      );
    });
    it("accepts ISO-8601 timestamps of 1950-01-01T00:00:00.000Z, 2000-01-01T00:00:00.000Z, and 2050-12-31T23:59:59.999Z", () => {
      assert.ok(
        validateSensorData({
          timestamp: "1950-01-01T00:00:00.000Z",
          sensorName: "temp-01",
          value: "2",
        }),
      );
      assert.ok(
        validateSensorData({
          timestamp: "2000-01-01T00:00:00.000Z",
          sensorName: "temp-01",
          value: "2",
        }),
      );
      assert.ok(
        validateSensorData({
          timestamp: "2050-12-31T23:59:59.999Z",
          sensorName: "temp-01",
          value: "2",
        }),
      );
    });
    it("accepts ISO-8601 timestamps with Z, +08:00, and -05:00", () => {
      assert.ok(
        validateSensorData({
          timestamp: "2026-10-27T14:15:30.123Z",
          sensorName: "temp-01",
          value: "2",
        }),
      );
      assert.ok(
        validateSensorData({
          timestamp: "2026-10-27T12:00:00.000+08:00",
          sensorName: "temp-01",
          value: "2",
        }),
      );
      assert.ok(
        validateSensorData({
          timestamp: "2026-10-27T03:00:00.000-05:00",
          sensorName: "temp-01",
          value: "2",
        }),
      );
    });
    it("accepts ISO-8601 timestamps with 0 precision", () => {
      assert.ok(
        validateSensorData({
          timestamp: "2026-10-27T08:00:00+00:00",
          sensorName: "temp-01",
          value: "2",
        }),
      );
    });

    it("rejects invalid timestamps", () => {
      assert.equal(validateSensorData({ timestamp: "2026/10/27T13:00:00Z", sensorName: "temp-01", value: "2" }), null);
      assert.equal(validateSensorData({ timestamp: "not-a-date", sensorName: "temp-01", value: "2" }), null);
      assert.equal(validateSensorData({ timestamp: "2026-10-27", sensorName: "temp-01", value: "2" }), null);
      assert.equal(validateSensorData({ timestamp: "08:00:00.000+00:00", sensorName: "temp-01", value: "2" }), null);
      assert.equal(validateSensorData({ timestamp: "2026-10-27T08:00:00.000", sensorName: "temp-01", value: "2" }), null);
      assert.equal(validateSensorData({ timestamp: "2026-10-27T08:00:00", sensorName: "temp-01", value: "2" }), null);
      assert.equal(validateSensorData({ timestamp: "2026-10-27 08:00:00+08:00", sensorName: "temp-01", value: "2" }), null);
    });
  });

  describe("csv data: sensorName", () => {
    it("accepts sensorName with uppercase and lowercase letters", () => {
      assert.ok(
        validateSensorData({
          timestamp: "2026-10-27T08:00:00.000Z",
          sensorName: "TEMP-south-01",
          value: "2",
        }),
      );
    });
    it("accepts sensorName with spaces and leading/trailing spaces", () => {
      assert.ok(
        validateSensorData({
          timestamp: "2026-10-27T08:00:00.000Z",
          sensorName: " temp - 01 ",
          value: "2",
        }),
      );
    });
    it("accepts sensorName with 100 characters", () => {
      assert.ok(
        validateSensorData({
          timestamp: "2026-10-27T08:00:00.000Z",
          sensorName: "a".repeat(100),
          value: "2",
        }),
      );
    });
    it("accepts sensorName with numbers only", () => {
      assert.ok(
        validateSensorData({
          timestamp: "2026-10-27T08:00:00.000Z",
          sensorName: "1234567890",
          value: "2",
        }),
      );
    });
    it("accepts sensorName with special characters like -, _, and .", () => {
      assert.ok(
        validateSensorData({
          timestamp: "2026-10-27T08:00:00.000Z",
          sensorName: "temp-_01.02",
          value: "2",
        }),
      );
    });

    it("rejects invalid sensorName", () => {
      assert.equal(validateSensorData({ timestamp: "2026-10-27T08:00:00.000Z", sensorName: "", value: "2" }), null);
      assert.equal(validateSensorData({ timestamp: "2026-10-27T08:00:00.000Z", sensorName: " ", value: "2" }), null);
    });
  });

  describe("csv data: values", () => {
    it("accepts zero, positive, and negative numeric values with and without decimal places", () => {
      assert.ok(
        validateSensorData({
          timestamp: "2026-10-27T08:00:00.000Z",
          sensorName: "temp-01",
          value: "0",
        }),
      );
      assert.ok(
        validateSensorData({
          timestamp: "2026-10-27T08:00:00.000Z",
          sensorName: "temp-01",
          value: "0.10",
        }),
      );
      assert.ok(
        validateSensorData({
          timestamp: "2026-10-27T08:00:00.000Z",
          sensorName: "temp-01",
          value: "-5.5",
        }),
      );
      assert.ok(
        validateSensorData({
          timestamp: "2026-10-27T08:00:00.000Z",
          sensorName: "temp-01",
          value: "5.5",
        }),
      );
    });

    it("accepts very small and very large finite values", () => {
      assert.ok(
        validateSensorData({
          timestamp: "2026-10-27T08:00:00.000Z",
          sensorName: "temp-01",
          value: "0.00000000001",
        }),
      );
      assert.ok(
        validateSensorData({
          timestamp: "2026-10-27T08:00:00.000Z",
          sensorName: "temp-01",
          value: "-0.00000000001",
        }),
      );
      assert.ok(
        validateSensorData({
          timestamp: "2026-10-27T08:00:00.000Z",
          sensorName: "temp-01",
          value: "10245124124.521412412",
        }),
      );
    });

    it("rejects non-numeric only values", () => {
      assert.equal(validateSensorData({ timestamp: "2026-10-27T08:00:00.000Z", sensorName: "temp-01", value: "ABC" }), null);
      assert.equal(validateSensorData({ timestamp: "2026-10-27T08:00:00.000Z", sensorName: "temp-01", value: "ABC123" }), null);
      assert.equal(validateSensorData({ timestamp: "2026-10-27T08:00:00.000Z", sensorName: "temp-01", value: "temp-01" }), null);
      assert.equal(validateSensorData({ timestamp: "2026-10-27T08:00:00.000Z", sensorName: "temp-01", value: "true" }), null);
      assert.equal(validateSensorData({ timestamp: "2026-10-27T08:00:00.000Z", sensorName: "temp-01", value: "" }), null);
      assert.equal(validateSensorData({ timestamp: "2026-10-27T08:00:00.000Z", sensorName: "temp-01", value: " " }), null);
      assert.equal(validateSensorData({ timestamp: "2026-10-27T08:00:00.000Z", sensorName: "temp-01", value: "undefined" }), null);
      assert.equal(validateSensorData({ timestamp: "2026-10-27T08:00:00.000Z", sensorName: "temp-01", value: "null" }), null);
      assert.equal(validateSensorData({ timestamp: "2026-10-27T08:00:00.000Z", sensorName: "temp-01", value: "NaN" }), null);
      assert.equal(validateSensorData({ timestamp: "2026-10-27T08:00:00.000Z", sensorName: "temp-01", value: "1e309" }), null);
    });
  });
});
