import { describe, expect, it } from "vitest";

import { formatBytes, formatCount, formatDate } from "./format";

describe("formatBytes", () => {
  it("renders zero and non-positive values with the base unit", () => {
    expect(formatBytes(0, "en")).toBe("0 B");
    expect(formatBytes(-5, "en")).toBe("0 B");
    expect(formatBytes(0, "fr")).toBe("0 o");
  });

  it("rounds bytes (unit index 0) to an integer", () => {
    expect(formatBytes(512, "en")).toBe("512 B");
  });

  it("formats sub-10 values with one decimal", () => {
    expect(formatBytes(1536, "en")).toBe("1.5 KB");
  });

  it("localizes the unit for large values", () => {
    expect(formatBytes(5 * 1024 ** 3, "fr")).toBe("5.0 Go");
  });
});

describe("formatDate", () => {
  it("renders an em dash for missing timestamps", () => {
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate(0)).toBe("—");
    expect(formatDate(null)).toBe("—");
  });
});

describe("formatCount", () => {
  it("groups thousands rather than emitting a bare integer", () => {
    const grouped = formatCount(12345, "fr");
    expect(grouped).not.toBe("12345");
    expect(grouped).toContain("345");
  });
});
