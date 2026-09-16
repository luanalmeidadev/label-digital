import { describe, it, expect } from "vitest";
import { getEndOfDayUTC } from "../../lib/timezone";

describe("Timezone helper - getEndOfDayUTC", () => {
  it("converts America/Sao_Paulo correctly (standard time)", () => {
    // 2026-06-15 is during standard time for SP (no DST anyway since 2019, but standard offset is -03:00)
    // Local 23:59:59.999 is UTC 02:59:59.999 of the next day
    const result = getEndOfDayUTC("2026-06-15", "America/Sao_Paulo");

    expect(result.getUTCHours()).toBe(2);
    expect(result.getUTCMinutes()).toBe(59);
    expect(result.getUTCSeconds()).toBe(59);
    expect(result.getUTCMilliseconds()).toBe(999);
    expect(result.getUTCDate()).toBe(16); // next day
    expect(result.getUTCMonth()).toBe(5); // June is 5 (0-indexed)
  });

  it("converts America/New_York correctly in standard time", () => {
    // 2026-01-15 is standard time in NY (-05:00)
    // Local 23:59:59.999 is UTC 04:59:59.999 of the next day
    const result = getEndOfDayUTC("2026-01-15", "America/New_York");

    expect(result.getUTCHours()).toBe(4);
    expect(result.getUTCDate()).toBe(16);
  });

  it("converts America/New_York correctly in DST", () => {
    // 2026-06-15 is DST in NY (-04:00)
    // Local 23:59:59.999 is UTC 03:59:59.999 of the next day
    const result = getEndOfDayUTC("2026-06-15", "America/New_York");

    expect(result.getUTCHours()).toBe(3);
    expect(result.getUTCDate()).toBe(16);
  });

  it("throws for invalid date formats", () => {
    expect(() => getEndOfDayUTC("2026-15-01", "America/Sao_Paulo")).toThrow("Data inválida.");
    expect(() => getEndOfDayUTC("invalid", "America/Sao_Paulo")).toThrow("Formato de data inválido");
  });

  it("throws for invalid timezone", () => {
    expect(() => getEndOfDayUTC("2026-01-01", "America/Invalid")).toThrowError();
  });
});
