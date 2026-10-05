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

export const formatInstantNumericDateTime = (instant: Date): string => NUMERIC_DATE_TIME.format(instant);
