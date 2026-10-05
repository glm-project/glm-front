const LOCALE = 'fr-FR';
const HOUR_CYCLE = 'h23';

const NUMERIC_DATE_TIME = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: HOUR_CYCLE,
});

const TIME = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', hourCycle: HOUR_CYCLE });

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

const WEEKDAY_DAY = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric' });

const CALENDAR_DAY_RANGE = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const CALENDAR_DAY_SHORT = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', timeZone: 'UTC' });

const CALENDAR_DAY_LONG = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', timeZone: 'UTC' });

const CALENDAR_DAY_FULL = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

const utcMidnightOf = (day: string): Date => new Date(`${day}T00:00:00Z`);

export const formatInstantNumericDateTime = (instant: Date): string => NUMERIC_DATE_TIME.format(instant);

export const formatInstantTime = (instant: Date): string => TIME.format(instant);

export const formatInstantNumericDayMonth = (instant: Date): string => NUMERIC_DAY_MONTH.format(instant);

export const formatInstantShortDateTime = (instant: Date): string => SHORT_DATE_TIME.format(instant);

export const formatInstantShortDayMonth = (instant: Date): string => SHORT_DAY_MONTH.format(instant);

export const formatInstantWeekdayDay = (instant: Date): string => WEEKDAY_DAY.format(instant);

export const formatCalendarDayRange = (first: string, last: string): string =>
  CALENDAR_DAY_RANGE.formatRange(utcMidnightOf(first), utcMidnightOf(last));

export const formatCalendarDayShort = (day: string): string => CALENDAR_DAY_SHORT.format(utcMidnightOf(day));

export const formatCalendarDayLong = (day: string): string => CALENDAR_DAY_LONG.format(utcMidnightOf(day));

export const formatCalendarDayFull = (day: string): string => CALENDAR_DAY_FULL.format(utcMidnightOf(day));

const twoDigits = (value: number): string => String(value).padStart(2, '0');

export const localCalendarDay = (date: Date): string =>
  `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;
