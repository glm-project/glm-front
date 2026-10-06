export const LOCALE = 'fr-FR';
const HOUR_CYCLE = 'h23';

export const DATE_INPUT_OPTIONS: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };

export const TIME_OPTION_LABEL_OPTIONS: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: HOUR_CYCLE };

export const TIME_INPUT_OPTIONS: Intl.DateTimeFormatOptions = { ...TIME_OPTION_LABEL_OPTIONS, second: '2-digit' };

const NUMERIC_DATE_TIME = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: HOUR_CYCLE,
});

const TIME = new Intl.DateTimeFormat(LOCALE, TIME_OPTION_LABEL_OPTIONS);

const NUMERIC_DAY_MONTH = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: '2-digit' });

const SHORT_DATE_TIME = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: HOUR_CYCLE,
});

const SHORT_DAY_MONTH = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' });

const SHORT_WEEKDAY_DAY = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric' });

const SHORT_WEEKDAY_DAY_MONTH = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' });

const WEEKDAY_DAY = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric' });

const TIME_WITH_SECONDS = new Intl.DateTimeFormat(LOCALE, TIME_INPUT_OPTIONS);

const LONG_DAY = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });

const LONG_DAY_WITH_YEAR = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const CALENDAR_DAY_SHORT_DAY_MONTH_YEAR = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const CALENDAR_DAY_SHORT = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', timeZone: 'UTC' });

const CALENDAR_DAY_LONG = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', timeZone: 'UTC' });

const CALENDAR_DAY_FULL = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

const CALENDAR_DAY_SHORT_WITH_MONTH = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

const CALENDAR_DAY_SHORT_DAY_MONTH = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', timeZone: 'UTC' });

const CALENDAR_DAY_FULL_WITH_YEAR = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const CALENDAR_MONTH_NAME = new Intl.DateTimeFormat(LOCALE, { month: 'long', timeZone: 'UTC' });

const utcMidnightOf = (day: string): Date => new Date(`${day}T00:00:00Z`);

export const formatInstantNumericDateTime = (instant: Date): string => NUMERIC_DATE_TIME.format(instant);

export const formatInstantTime = (instant: Date): string => TIME.format(instant);

export const formatInstantTimeWithSeconds = (instant: Date): string => TIME_WITH_SECONDS.format(instant);

export const formatInstantNumericDayMonth = (instant: Date): string => NUMERIC_DAY_MONTH.format(instant);

export const formatInstantShortDateTime = (instant: Date): string => SHORT_DATE_TIME.format(instant);

export const formatInstantShortDayMonth = (instant: Date): string => SHORT_DAY_MONTH.format(instant);

export const formatInstantShortWeekdayDay = (instant: Date): string => SHORT_WEEKDAY_DAY.format(instant);

export const formatInstantShortWeekdayDayMonth = (instant: Date): string => SHORT_WEEKDAY_DAY_MONTH.format(instant);

export const formatInstantWeekdayDay = (instant: Date): string => WEEKDAY_DAY.format(instant);

const longDayOf = (instant: Date, now: Date): string =>
  (instant.getFullYear() === now.getFullYear() ? LONG_DAY : LONG_DAY_WITH_YEAR).format(instant);

export const formatInstantLongDay = (instant: Date, now: Date): string => `${longDayOf(instant, now)} à ${TIME.format(instant)}`;

export const formatInstantLongDayWithSeconds = (instant: Date, now: Date): string =>
  `${longDayOf(instant, now)} à ${TIME_WITH_SECONDS.format(instant)}`;

export const formatInstantTimeAndLongDayWithSeconds = (instant: Date, now: Date): Readonly<{ time: string; day: string }> => ({
  time: TIME_WITH_SECONDS.format(instant),
  day: longDayOf(instant, now),
});

export const toHtmlDatetime = (instant: Date): string => instant.toISOString();

export const formatCalendarDayRange = (first: string, last: string): string =>
  CALENDAR_DAY_SHORT_DAY_MONTH_YEAR.formatRange(utcMidnightOf(first), utcMidnightOf(last));

export const formatCalendarDayShort = (day: string): string => CALENDAR_DAY_SHORT.format(utcMidnightOf(day));

export const formatCalendarDayLong = (day: string): string => CALENDAR_DAY_LONG.format(utcMidnightOf(day));

export const formatCalendarDayFull = (day: string): string => CALENDAR_DAY_FULL.format(utcMidnightOf(day));

export const formatCalendarDayShortWithMonth = (day: string): string => CALENDAR_DAY_SHORT_WITH_MONTH.format(utcMidnightOf(day));

export const formatCalendarDayShortDayMonth = (day: string): string => CALENDAR_DAY_SHORT_DAY_MONTH.format(utcMidnightOf(day));

export const formatCalendarDayShortDayMonthYear = (day: string): string => CALENDAR_DAY_SHORT_DAY_MONTH_YEAR.format(utcMidnightOf(day));

export const formatCalendarDayFullWithYear = (day: string): string => CALENDAR_DAY_FULL_WITH_YEAR.format(utcMidnightOf(day));

export const formatCalendarMonthName = (year: number, month: number): string =>
  CALENDAR_MONTH_NAME.format(new Date(Date.UTC(year, month - 1, 1)));

const twoDigits = (value: number): string => String(value).padStart(2, '0');

export const localCalendarDay = (date: Date): string =>
  `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;

const offsetOf = (date: Date): string => {
  const minutes = -date.getTimezoneOffset();
  const sign = minutes < 0 ? '-' : '+';
  return `${sign}${twoDigits(Math.floor(Math.abs(minutes) / 60))}:${twoDigits(Math.abs(minutes) % 60)}`;
};

export const formatInstantTimeWithOffset = (instant: Date): string =>
  `${twoDigits(instant.getHours())}:${twoDigits(instant.getMinutes())} UTC${offsetOf(instant)}`;

const ONE_HOUR = 3_600_000;

const isRepeatedByTheClock = (instant: Date): boolean =>
  [-ONE_HOUR, ONE_HOUR].some(shift => {
    const other = new Date(instant.getTime() + shift);
    return (
      other.getTimezoneOffset() !== instant.getTimezoneOffset()
      && other.getHours() === instant.getHours()
      && other.getMinutes() === instant.getMinutes()
    );
  });

export const formatInstantTimeUnambiguous = (instant: Date): string =>
  isRepeatedByTheClock(instant) ? formatInstantTimeWithOffset(instant) : TIME.format(instant);

export const toOffsetIsoString = (date: Date): string =>
  `${localCalendarDay(date)}T${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}:${twoDigits(date.getSeconds())}${offsetOf(date)}`;

export const combineLocalDayAndTime = (day: Date, time: Date): Date | undefined => {
  const combined = new Date(day.getFullYear(), day.getMonth(), day.getDate(), time.getHours(), time.getMinutes(), time.getSeconds());
  return combined.getHours() === time.getHours() && combined.getMinutes() === time.getMinutes() ? combined : undefined;
};
