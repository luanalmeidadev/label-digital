export function getEndOfDayUTC(dateString: string, timeZone: string): Date {
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error("Formato de data inválido. Use YYYY-MM-DD.");
  }

  if (!timeZone || typeof timeZone !== "string") {
    throw new Error("Timezone inválido.");
  }

  const [, yearStr, monthStr, dayStr] = match;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error("Data inválida.");
  }

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false, timeZoneName: "shortOffset"
    });

    // Test the formatter to see if the timezone is valid
    formatter.format(new Date());

    // We want the Date object such that `formatter` outputs that specific day at 23:59:59.
    // Instead of parsing strings back, we can just use the exact offset of that day.
    // Let's probe the time at 12:00:00 UTC and see its offset.
    // Since we need the offset for the local 23:59:59, we should guess the UTC time is close to it.
    // A local 23:59:59 is roughly next day 03:00 UTC (for -03:00).
    // We format the probeDate to get the offset. But wait! The offset might change at midnight if DST changes.
    // However, DST changes typically happen at 2 AM or 3 AM local time.
    // So 23:59:59 will have the same offset as the rest of that evening.
    // A robust way to get the exact offset at local 23:59:59:

    // First, let's create a date string we know postgres and native JS can parse, but JS Date constructor is unreliable cross-browser with timezones if we just append offsets.
    // Actually, in V8/Node, `new Date("YYYY-MM-DDTHH:mm:ss.sssZ")` is rock solid.
    // We can also parse `new Date("YYYY-MM-DDTHH:mm:ss.sss-03:00")`.

    // Wait, let's make it 100% robust by binary searching or adjusting mathematically:
    // If we create a date at UTC with the target year/month/day/23/59/59, it's off by the offset.
    // So if we just create UTC, then we ask Intl to format it, we can see what local time it is.
    // Then we subtract the difference.

    const targetUTC = Date.UTC(year, month - 1, day, 23, 59, 59, 999);

    const fParts = formatter.formatToParts(new Date(targetUTC));
    const pYear = parseInt(fParts.find(p => p.type === 'year')!.value, 10);
    const pMonth = parseInt(fParts.find(p => p.type === 'month')!.value, 10);
    const pDay = parseInt(fParts.find(p => p.type === 'day')!.value, 10);
    const pHour = parseInt(fParts.find(p => p.type === 'hour')!.value, 10) % 24;
    const pMinute = parseInt(fParts.find(p => p.type === 'minute')!.value, 10);
    const pSecond = parseInt(fParts.find(p => p.type === 'second')!.value, 10);

    const localTimeAtTargetUTC = Date.UTC(pYear, pMonth - 1, pDay, pHour, pMinute, pSecond, 999);

    // The difference between what we want and what we got:
    const diff = targetUTC - localTimeAtTargetUTC;

    // So the actual UTC time that represents local 23:59:59 is targetUTC + diff
    let exactDate = new Date(targetUTC + diff);

    // Double check (rare case: DST transition exactly between these two points)
    const checkParts = formatter.formatToParts(exactDate);
    const cHour = parseInt(checkParts.find(p => p.type === 'hour')!.value, 10) % 24;
    const cMinute = parseInt(checkParts.find(p => p.type === 'minute')!.value, 10);

    if (cHour !== 23 || cMinute !== 59) {
      // Adjust by the new difference (DST shift)
      const cYear = parseInt(checkParts.find(p => p.type === 'year')!.value, 10);
      const cMonth = parseInt(checkParts.find(p => p.type === 'month')!.value, 10);
      const cDay = parseInt(checkParts.find(p => p.type === 'day')!.value, 10);
      const cLocalTime = Date.UTC(cYear, cMonth - 1, cDay, cHour, cMinute, pSecond, 999);
      const diff2 = targetUTC - cLocalTime;
      exactDate = new Date(targetUTC + diff2);
    }

    return exactDate;
  } catch (e) {
    if (e instanceof Error && e.message.includes("Timezone")) {
      throw e;
    }
    throw new Error("Timezone inválido ou erro no parse.");
  }
}
