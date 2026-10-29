import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { transformSensorData } from "../src/worker.js";

describe("transformSensorData", () => {
  describe("csv data: timestamps", () => {
    it("converts ISO-8601 timestamps of 00:00:00.000Z, 14:15:30.123Z, and 23:59:59.999Z to UTC storage format", () => {
      assert.deepEqual(
        transformSensorData({
          timestamp: "2026-10-27T00:00:00.000Z",
          sensorName: "temp-01",
          value: "2",
        }),
        {
          timestamp: "2026-10-27 00:00:00.000",
          sensorName: "temp-01",
          value: 2,
        },
      );
      assert.deepEqual(
        transformSensorData({
          timestamp: "2026-10-27T23:59:59.999Z",
          sensorName: "temp-01",
          value: "2",
        }),
        {
          timestamp: "2026-10-27 23:59:59.999",
          sensorName: "temp-01",
          value: 2,
        },
      );
      assert.deepEqual(
        transformSensorData({
          timestamp: "2026-10-27T14:15:30.123Z",
          sensorName: "temp-01",
          value: "2",
        }),
        {
          timestamp: "2026-10-27 14:15:30.123",
          sensorName: "temp-01",
          value: 2,
        },
      );
    });
    it("converts ISO-8601 timestamps of 1950-01-01T00:00:00.000Z, 2000-01-01T00:00:00.000Z, and 2050-12-31T23:59:59.999Z to UTC storage format", () => {
      assert.deepEqual(
        transformSensorData({
          timestamp: "1950-01-01T00:00:00.000Z",
          sensorName: "temp-01",
          value: "2",
        }),
        {
          timestamp: "1950-01-01 00:00:00.000",
          sensorName: "temp-01",
          value: 2,
        },
      );
      assert.deepEqual(
        transformSensorData({
          timestamp: "2000-01-01T00:00:00.000Z",
          sensorName: "temp-01",
          value: "2",
        }),
        {
          timestamp: "2000-01-01 00:00:00.000",
          sensorName: "temp-01",
          value: 2,
        },
      );
      assert.deepEqual(
        transformSensorData({
          timestamp: "2050-12-31T23:59:59.999Z",
          sensorName: "temp-01",
          value: "2",
        }),
        {
          timestamp: "2050-12-31 23:59:59.999",
          sensorName: "temp-01",
          value: 2,
        },
      );
    });
    it("converts ISO-8601 timestamps with Z, +08:00, and -05:00 to UTC storage format", () => {
      assert.deepEqual(
        transformSensorData({
          timestamp: "2026-10-27T14:15:30.123Z",
          sensorName: "temp-01",
          value: "2",
        }),
        {
          timestamp: "2026-10-27 14:15:30.123",
          sensorName: "temp-01",
          value: 2,
        },
      );
      assert.deepEqual(
        transformSensorData({
          timestamp: "2026-10-27T12:00:00.000+08:00",
          sensorName: "temp-01",
          value: "2",
        }),
        {
          timestamp: "2026-10-27 04:00:00.000",
          sensorName: "temp-01",
          value: 2,
        },
      );
      assert.deepEqual(
        transformSensorData({
          timestamp: "2026-10-27T03:00:00.000-05:00",
          sensorName: "temp-01",
          value: "2",
        }),
        {
          timestamp: "2026-10-27 08:00:00.000",
          sensorName: "temp-01",
          value: 2,
        },
      );
    });
    it("converts ISO-8601 timestamps with 0 precision to UTC storage format", () => {
      assert.deepEqual(
        transformSensorData({
          timestamp: "2026-10-27T08:00:00+00:00",
          sensorName: "temp-01",
          value: "2",
        }),
        {
          timestamp: "2026-10-27 08:00:00.000",
          sensorName: "temp-01",
          value: 2,
        },
      );
    });
    it("converts offset timestamps that change the UTC calendar date", () => {
      assert.deepEqual(
        transformSensorData({
          timestamp: "2026-10-27T02:00:00.000+08:00",
          sensorName: "temp-01",
          value: "2",
        }),
        {
          timestamp: "2026-10-26 18:00:00.000",
          sensorName: "temp-01",
          value: 2,
        },
      );
      assert.deepEqual(
        transformSensorData({
          timestamp: "2026-10-27T20:00:00.000-05:00",
          sensorName: "temp-01",
          value: "2",
        }),
        {
          timestamp: "2026-10-28 01:00:00.000",
          sensorName: "temp-01",
          value: 2,
        },
      );
    });
  });

  describe("csv data: sensorName", () => {
    it("remains the same for sensorName with uppercase and lowercase letters", () => {
      assert.deepEqual(
        transformSensorData({
          timestamp: "2026-10-27T08:00:00.000Z",
          sensorName: "TEMP-south-01",
          value: "2",
        }),
        {
          timestamp: "2026-10-27 08:00:00.000",
          sensorName: "TEMP-south-01",
          value: 2,
        },
      );
    });
    it("removes spaces and leading/trailing spaces from sensorName", () => {
      assert.deepEqual(
        transformSensorData({
          timestamp: "2026-10-27T08:00:00.000Z",
          sensorName: " temp - 01 ",
          value: "2",
        }),
        {
          timestamp: "2026-10-27 08:00:00.000",
          sensorName: "temp - 01",
          value: 2,
        },
      );
    });
    it("remains the same for sensorName with 100 characters", () => {
      const sensorName = "a".repeat(100);
      assert.deepEqual(
        transformSensorData({
          timestamp: "2026-10-27T08:00:00.000Z",
          sensorName,
          value: "2",
        }),
        {
          timestamp: "2026-10-27 08:00:00.000",
          sensorName,
          value: 2,
        },
      );
    });
    it("remains the same for sensorName with numbers only", () => {
      assert.deepEqual(
        transformSensorData({
          timestamp: "2026-10-27T08:00:00.000Z",
          sensorName: "1234567890",
          value: "2",
        }),
        {
          timestamp: "2026-10-27 08:00:00.000",
          sensorName: "1234567890",
          value: 2,
        },
      );
    });
    it("remains the same for sensorName with special characters like -, _, and .", () => {
      assert.deepEqual(
        transformSensorData({
          timestamp: "2026-10-27T08:00:00.000Z",
          sensorName: "temp-_01.02",
          value: "2",
        }),
        {
          timestamp: "2026-10-27 08:00:00.000",
          sensorName: "temp-_01.02",
          value: 2,
        },
      );
    });
  });

  describe("csv data: values", () => {
    it("converts zero, positive, and negative numeric values with and without decimal places to numbers", () => {
      assert.deepEqual(
        transformSensorData({
          timestamp: "2026-10-27T08:00:00.000Z",
          sensorName: "temp-01",
          value: "0",
        }),
        {
          timestamp: "2026-10-27 08:00:00.000",
          sensorName: "temp-01",
          value: 0,
        },
      );
      assert.deepEqual(
        transformSensorData({
          timestamp: "2026-10-27T08:00:00.000Z",
          sensorName: "temp-01",
          value: "0.10",
        }),
        {
          timestamp: "2026-10-27 08:00:00.000",
          sensorName: "temp-01",
          value: 0.1,
        },
      );
      assert.deepEqual(
        transformSensorData({
          timestamp: "2026-10-27T08:00:00.000Z",
          sensorName: "temp-01",
          value: "-5.5",
        }),
        {
          timestamp: "2026-10-27 08:00:00.000",
          sensorName: "temp-01",
          value: -5.5,
        },
      );
      assert.deepEqual(
        transformSensorData({
          timestamp: "2026-10-27T08:00:00.000Z",
          sensorName: "temp-01",
          value: "5.5",
        }),
        {
          timestamp: "2026-10-27 08:00:00.000",
          sensorName: "temp-01",
          value: 5.5,
        },
      );
    });

    it("trims spaces around numeric value before coercion", () => {
      assert.deepEqual(
        transformSensorData({
          timestamp: "2026-10-27T08:00:00.000Z",
          sensorName: "temp-01",
          value: " 21.5 ",
        }),
        {
          timestamp: "2026-10-27 08:00:00.000",
          sensorName: "temp-01",
          value: 21.5,
        },
      );
    });

    it("converts very small and very large finite values to numbers", () => {
      assert.deepEqual(
        transformSensorData({
          timestamp: "2026-10-27T08:00:00.000Z",
          sensorName: "temp-01",
          value: "0.00000000001",
        }),
        {
          timestamp: "2026-10-27 08:00:00.000",
          sensorName: "temp-01",
          value: 0.00000000001,
        },
      );
      assert.deepEqual(
        transformSensorData({
          timestamp: "2026-10-27T08:00:00.000Z",
          sensorName: "temp-01",
          value: "-0.00000000001",
        }),
        {
          timestamp: "2026-10-27 08:00:00.000",
          sensorName: "temp-01",
          value: -0.00000000001,
        },
      );
      assert.deepEqual(
        transformSensorData({
          timestamp: "2026-10-27T08:00:00.000Z",
          sensorName: "temp-01",
          value: "10245124124.521412412",
        }),
        {
          timestamp: "2026-10-27 08:00:00.000",
          sensorName: "temp-01",
          value: 10245124124.521412,
        },
      );
    });
  });
});
