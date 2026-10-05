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

export const formatInstantNumericDateTime = (instant: Date): string => NUMERIC_DATE_TIME.format(instant);

export const formatInstantTime = (instant: Date): string => TIME.format(instant);

export const formatInstantNumericDayMonth = (instant: Date): string => NUMERIC_DAY_MONTH.format(instant);

const twoDigits = (value: number): string => String(value).padStart(2, '0');

export const localCalendarDay = (date: Date): string =>
  `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;
