const JAKARTA_TIMEZONE = 'Asia/Jakarta';
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const jakartaYmdFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: JAKARTA_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const jakartaWeekdayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: JAKARTA_TIMEZONE,
  weekday: 'short',
});

function parseYmd(ymd) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ''));
  if (!match) {
    throw new Error(`Format tanggal harus YYYY-MM-DD, diterima: ${ymd}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));

  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    throw new Error(`Tanggal tidak valid: ${ymd}`);
  }

  return { year, month, day };
}

export function formatJakartaYmd(date = new Date()) {
  return jakartaYmdFormatter.format(date);
}

export function getJakartaTodayYmd(now = new Date()) {
  return formatJakartaYmd(now);
}

export function getJakartaMonthStartYmd(date = new Date()) {
  const todayYmd = formatJakartaYmd(date);
  const { year, month } = parseYmd(todayYmd);
  return `${year}-${String(month).padStart(2, '0')}-01`;
}


export function getJakartaMonthEndYmd(date = new Date()) {
  const monthStartYmd = getJakartaMonthStartYmd(date);
  const monthStartUtc = ymdToUtcDate(monthStartYmd);
  const nextMonthStartUtc = new Date(Date.UTC(
    monthStartUtc.getUTCFullYear(),
    monthStartUtc.getUTCMonth() + 1,
    1
  ));
  nextMonthStartUtc.setUTCDate(nextMonthStartUtc.getUTCDate() - 1);
  return ymdFromUtcDate(nextMonthStartUtc);
}

export function ymdToUtcDate(ymd) {
  const { year, month, day } = parseYmd(ymd);
  return new Date(Date.UTC(year, month - 1, day));
}

export function ymdFromUtcDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysYmd(ymd, days) {
  const utcDate = ymdToUtcDate(ymd);
  utcDate.setUTCDate(utcDate.getUTCDate() + Number(days || 0));
  return ymdFromUtcDate(utcDate);
}

export function iterateJakartaDates(startYmd, endYmd) {
  const startUtc = ymdToUtcDate(startYmd);
  const endUtc = ymdToUtcDate(endYmd);

  if (startUtc > endUtc) {
    return [];
  }

  const dates = [];
  for (let d = new Date(startUtc); d <= endUtc; d = new Date(d.getTime() + DAY_IN_MS)) {
    dates.push(ymdFromUtcDate(d));
  }
  return dates;
}

export function getJakartaDayRange(dateInput = new Date()) {
  const ymd = typeof dateInput === 'string' ? dateInput : formatJakartaYmd(dateInput);
  const { year, month, day } = parseYmd(ymd);
  const start = new Date(Date.UTC(year, month - 1, day, -7, 0, 0, 0));
  const end = new Date(start.getTime() + DAY_IN_MS - 1);
  return { start, end, ymd };
}

export function getJakartaWeekdayIndex(date = new Date()) {
  const weekday = jakartaWeekdayFormatter.format(date);
  const idxMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return idxMap[weekday] ?? date.getUTCDay();
}
