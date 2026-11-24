import { describe, expect, it } from "vitest";
import { addMonths, billingCycle, quotaWindow } from "./quota-period";

const d = (iso: string) => new Date(iso);

describe("billing cycle", () => {
  it("starts each monthly cycle on the anchor's day, not on the 1st", () => {
    const anchor = d("2026-11-28T09:00:00Z");
    expect(billingCycle(anchor, d("2026-12-03T00:00:00Z"))).toEqual({
      start: d("2026-11-28T09:00:00Z"),
      end: d("2026-12-28T09:00:00Z"),
    });
    expect(billingCycle(anchor, d("2027-03-01T00:00:00Z")).start).toEqual(d("2027-02-28T09:00:00Z"));
  });

  it("clamps a 31st anchor to the last day of shorter months", () => {
    const anchor = d("2026-01-31T10:00:00Z");
    expect(addMonths(anchor, 1)).toEqual(d("2026-02-28T10:00:00Z"));
    expect(addMonths(anchor, 2)).toEqual(d("2026-03-31T10:00:00Z"));
    expect(billingCycle(anchor, d("2026-03-05T00:00:00Z"))).toEqual({
      start: d("2026-02-28T10:00:00Z"),
      end: d("2026-03-31T10:00:00Z"),
    });
  });

  it("is the first cycle right at the anchor", () => {
    const anchor = d("2026-11-24T13:00:00Z");
    expect(billingCycle(anchor, anchor).start).toEqual(anchor);
  });
});

describe("quota windows", () => {
  it("keys a monthly quota by its cycle start and resets at the cycle end", () => {
    const window = quotaWindow("month", d("2026-11-28T09:00:00Z"), d("2026-12-03T00:00:00Z"));
    expect(window).toEqual({ key: "C:2026-11-28T09:00:00.000Z", resetsAt: d("2026-12-28T09:00:00Z") });
  });

  it("resets a daily quota at midnight Vietnam time", () => {
    const now = d("2026-11-30T17:30:00Z"); // 00:30 on 1 Dec in Vietnam
    expect(quotaWindow("day", d("2020-01-01T00:00:00Z"), now)).toEqual({
      key: "D:2026-12-01",
      resetsAt: d("2026-12-01T17:00:00Z"),
    });
  });
});
