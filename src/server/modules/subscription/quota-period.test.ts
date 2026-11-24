import { describe, expect, it } from "vitest";
import { periodKey, periodResetsAt } from "./quota-period";

describe("quota periods in Vietnam time", () => {
  it("puts 17:30 UTC on the last day of a month into the next local month and day", () => {
    const now = new Date("2026-11-30T17:30:00Z"); // 00:30 on 1 Dec in Vietnam
    expect(periodKey("month", now)).toBe("M:2026-12");
    expect(periodKey("day", now)).toBe("D:2026-12-01");
  });

  it("resets at local midnight", () => {
    const now = new Date("2026-11-24T10:00:00Z");
    expect(periodResetsAt("day", now).toISOString()).toBe("2026-11-24T17:00:00.000Z");
    expect(periodResetsAt("month", now).toISOString()).toBe("2026-11-30T17:00:00.000Z");
    expect(periodResetsAt("month", new Date("2026-12-15T00:00:00Z")).toISOString()).toBe("2026-12-31T17:00:00.000Z");
  });
});
