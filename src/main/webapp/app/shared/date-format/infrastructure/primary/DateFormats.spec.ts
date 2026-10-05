import {
  formatCalendarDayFull,
  formatCalendarDayFullWithYear,
  formatCalendarDayLong,
  formatCalendarDayRange,
  formatCalendarDayShort,
  formatCalendarDayShortDayMonth,
  formatCalendarDayShortDayMonthYear,
  formatCalendarDayShortWithMonth,
  formatCalendarMonthName,
  formatInstantNumericDateTime,
  formatInstantNumericDayMonth,
  formatInstantShortDateTime,
  formatInstantShortDayMonth,
  formatInstantShortWeekdayDay,
  formatInstantTime,
  formatInstantWeekdayDay,
  localCalendarDay,
} from './DateFormats';

describe('DateFormats', () => {
  it('should format an instant as day, month, year and time in local time', () => {
    const instant = new Date(2026, 8, 14, 8, 2);

    const text = formatInstantNumericDateTime(instant);

    expect(text).toBe('14/09/2026 08:02');
  });

  it('should write the first minutes of the day on a 24-hour clock', () => {
    const instant = new Date(2026, 8, 14, 0, 5);

    const text = formatInstantNumericDateTime(instant);

    expect(text).toBe('14/09/2026 00:05');
  });

  it('should format an instant as its local hour and minute', () => {
    const instant = new Date(2026, 8, 14, 8, 2);

    const text = formatInstantTime(instant);

    expect(text).toBe('08:02');
  });

  it('should write the first minutes of the day as 00 hours in a time', () => {
    const instant = new Date(2026, 8, 14, 0, 5);

    const text = formatInstantTime(instant);

    expect(text).toBe('00:05');
  });

  it('should format an instant as its local day and month', () => {
    const instant = new Date(2026, 8, 4, 22, 30);

    const text = formatInstantNumericDayMonth(instant);

    expect(text).toBe('04/09');
  });

  it('should keep the local day and month of an instant whose UTC day is the next one', () => {
    const instant = new Date(Date.UTC(2026, 8, 5, 1, 30));

    const text = formatInstantNumericDayMonth(instant);

    expect(text).toBe('04/09');
  });

  it('should write the local calendar day as year, month and day', () => {
    const date = new Date(2026, 0, 5, 9, 41);

    const day = localCalendarDay(date);

    expect(day).toBe('2026-01-05');
  });

  it('should keep the local calendar day of an instant whose UTC day is the next one', () => {
    const date = new Date(Date.UTC(2026, 8, 5, 1, 30));

    const day = localCalendarDay(date);

    expect(day).toBe('2026-09-04');
  });

  it('should format an instant as day, abbreviated month, year and time in local time', () => {
    const instant = new Date(2026, 9, 5, 8, 2);

    const text = formatInstantShortDateTime(instant);

    expect(text).toBe('5 oct. 2026, 08:02');
  });

  it('should keep the local day of an instant whose UTC day is the next one in a short date and time', () => {
    const instant = new Date(Date.UTC(2026, 9, 6, 1, 30));

    const text = formatInstantShortDateTime(instant);

    expect(text).toBe('5 oct. 2026, 22:30');
  });

  it('should format an instant as its local day and abbreviated month', () => {
    const instant = new Date(2026, 9, 5, 22, 30);

    const text = formatInstantShortDayMonth(instant);

    expect(text).toBe('5 oct.');
  });

  it('should keep the local day and abbreviated month of an instant whose UTC day is the next one', () => {
    const instant = new Date(Date.UTC(2026, 9, 6, 1, 30));

    const text = formatInstantShortDayMonth(instant);

    expect(text).toBe('5 oct.');
  });

  it('should format a calendar day as its abbreviated weekday and day without any time zone shift', () => {
    const text = formatCalendarDayShort('2026-09-14');

    expect(text).toBe('lun. 14');
  });

  it('should format a calendar day as its full weekday and day without any time zone shift', () => {
    const text = formatCalendarDayLong('2026-09-14');

    expect(text).toBe('lundi 14');
  });

  it('should format a calendar day as its full weekday, day and month without any time zone shift', () => {
    const text = formatCalendarDayFull('2026-09-14');

    expect(text).toBe('lundi 14 septembre');
  });

  it('should format a calendar day as its abbreviated weekday, day and abbreviated month without any time zone shift', () => {
    const text = formatCalendarDayShortWithMonth('2026-09-14');

    expect(text).toBe('lun. 14 sept.');
  });

  it('should format a calendar day as its day and abbreviated month without any time zone shift', () => {
    const text = formatCalendarDayShortDayMonth('2026-09-14');

    expect(text).toBe('14 sept.');
  });

  it('should format a calendar day as its day, abbreviated month and year without any time zone shift', () => {
    const text = formatCalendarDayShortDayMonthYear('2026-09-14');

    expect(text).toBe('14 sept. 2026');
  });

  it('should format a calendar day as its full weekday, day, month and year without any time zone shift', () => {
    const text = formatCalendarDayFullWithYear('2026-09-14');

    expect(text).toBe('lundi 14 septembre 2026');
  });

  it('should format a calendar month as its full name whatever the year', () => {
    const text = formatCalendarMonthName(2026, 9);

    expect(text).toBe('septembre');
  });

  it('should format a range of calendar days within a month once', () => {
    const text = formatCalendarDayRange('2026-09-14', '2026-09-20');

    expect(text).toBe('14–20 sept. 2026');
  });

  it('should format a range of calendar days across years with both ends', () => {
    const text = formatCalendarDayRange('2025-12-29', '2026-01-04');

    expect(text).toBe('29 déc. 2025\u2009–\u20094 janv. 2026');
  });

  it('should format an instant as its local full weekday and day', () => {
    const instant = new Date(2026, 8, 13, 22, 0);

    const text = formatInstantWeekdayDay(instant);

    expect(text).toBe('dimanche 13');
  });

  it('should keep the local weekday and day of an instant whose UTC day is the next one', () => {
    const instant = new Date(Date.UTC(2026, 8, 14, 1, 30));

    const text = formatInstantWeekdayDay(instant);

    expect(text).toBe('dimanche 13');
  });

  it('should format an instant as its local abbreviated weekday and day', () => {
    const instant = new Date(2026, 9, 1, 9, 41);

    const text = formatInstantShortWeekdayDay(instant);

    expect(text).toBe('jeu. 1');
  });

  it('should keep the local abbreviated weekday and day of an instant whose UTC day is the next one', () => {
    const instant = new Date(Date.UTC(2026, 9, 2, 1, 30));

    const text = formatInstantShortWeekdayDay(instant);

    expect(text).toBe('jeu. 1');
  });
});
