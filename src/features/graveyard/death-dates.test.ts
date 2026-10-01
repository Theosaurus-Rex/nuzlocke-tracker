import { describe, expect, it } from "vitest";

import { loggedAt, shortDate } from "./death-dates";

const local = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(y, m, d, h, min).toISOString();

describe("shortDate", () => {
  it("pads a single-digit day and uppercases the month", () => {
    expect(shortDate(local(2026, 8, 2))).toBe("02 SEP");
  });

  it("reads December as DEC", () => {
    expect(shortDate(local(2026, 11, 25))).toBe("25 DEC");
  });
});

describe("loggedAt", () => {
  it("gives day, short month and 24-hour time", () => {
    expect(loggedAt(local(2026, 8, 8, 21, 14))).toBe("08 Sep · 21:14");
  });

  it("pads the hour and minute", () => {
    expect(loggedAt(local(2026, 0, 3, 9, 5))).toBe("03 Jan · 09:05");
  });

  it("reads December as Dec", () => {
    expect(loggedAt(local(2026, 11, 31, 23, 59))).toBe("31 Dec · 23:59");
  });
});
