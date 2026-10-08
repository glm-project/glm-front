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
  formatInstantLongDay,
  formatInstantLongDayWithSeconds,
  formatInstantNumericDateTime,
  formatInstantNumericDayMonth,
  formatInstantShortDateTime,
  formatInstantShortDayMonth,
  formatInstantShortWeekdayDay,
  formatInstantShortWeekdayDayMonth,
  formatInstantTime,
  formatInstantTimeAndLongDayWithSeconds,
  formatInstantTimeUnambiguous,
  formatInstantTimeWithOffset,
  formatInstantWeekdayDay,
  localCalendarDay,
  toOffsetIsoString,
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

  it('should format an instant as its local abbreviated weekday, day and abbreviated month', () => {
    const instant = new Date(2026, 9, 6, 0, 0);

    const text = formatInstantShortWeekdayDayMonth(instant);

    expect(text).toBe('mar. 6 oct.');
  });

  it('should keep the local abbreviated weekday, day and month of an instant whose UTC day is the next one', () => {
    const instant = new Date(Date.UTC(2026, 9, 7, 1, 30));

    const text = formatInstantShortWeekdayDayMonth(instant);

    expect(text).toBe('mar. 6 oct.');
  });

  it('should format an instant as its long day and local time without the year during the current year', () => {
    const instant = new Date(2026, 9, 1, 9, 41, 22);
    const now = new Date(2026, 9, 5, 10, 0);

    const text = formatInstantLongDay(instant, now);

    expect(text).toBe('jeudi 1 octobre à 09:41');
  });

  it('should add the year to the long day of an instant that falls in another year than now', () => {
    const instant = new Date(2025, 9, 1, 9, 41, 22);
    const now = new Date(2026, 9, 5, 10, 0);

    const text = formatInstantLongDay(instant, now);

    expect(text).toBe('mercredi 1 octobre 2025 à 09:41');
  });

  it('should keep the local day and time of an instant whose UTC day is the next one in a long day', () => {
    const instant = new Date(Date.UTC(2026, 9, 2, 1, 30));
    const now = new Date(2026, 9, 5, 10, 0);

    const text = formatInstantLongDay(instant, now);

    expect(text).toBe('jeudi 1 octobre à 22:30');
  });

  it('should compare the local years of the instant and of now, not their UTC years', () => {
    const instant = new Date(2026, 11, 31, 23, 30);
    const now = new Date(2026, 11, 31, 23, 45);

    const text = formatInstantLongDay(instant, now);

    expect(text).toBe('jeudi 31 décembre à 23:30');
  });

  it('should write the seconds of an instant after its long day and local time', () => {
    const instant = new Date(2026, 9, 1, 9, 41, 22);
    const now = new Date(2026, 9, 5, 10, 0);

    const text = formatInstantLongDayWithSeconds(instant, now);

    expect(text).toBe('jeudi 1 octobre à 09:41:22');
  });

  it('should add the year to the long day of an instant with seconds that falls in another year than now', () => {
    const instant = new Date(2025, 9, 1, 9, 41, 22);
    const now = new Date(2026, 9, 5, 10, 0);

    const text = formatInstantLongDayWithSeconds(instant, now);

    expect(text).toBe('mercredi 1 octobre 2025 à 09:41:22');
  });

  it('should split an instant into its local time with seconds and its long day', () => {
    const instant = new Date(2026, 9, 1, 9, 41, 22);
    const now = new Date(2026, 9, 5, 10, 0);

    const parts = formatInstantTimeAndLongDayWithSeconds(instant, now);

    expect(parts).toEqual({ time: '09:41:22', day: 'jeudi 1 octobre' });
  });

  it('should add the year to the long day part of an instant that falls in another year than now', () => {
    const instant = new Date(2025, 9, 1, 9, 41, 22);
    const now = new Date(2026, 9, 5, 10, 0);

    const parts = formatInstantTimeAndLongDayWithSeconds(instant, now);

    expect(parts).toEqual({ time: '09:41:22', day: 'mercredi 1 octobre 2025' });
  });

  it('should keep the local day and time of an instant whose UTC day is the next one in its time and long day parts', () => {
    const instant = new Date(Date.UTC(2026, 9, 2, 1, 30, 5));
    const now = new Date(2026, 9, 5, 10, 0);

    const parts = formatInstantTimeAndLongDayWithSeconds(instant, now);

    expect(parts).toEqual({ time: '22:30:05', day: 'jeudi 1 octobre' });
  });

  it('should write an instant with its local offset and without fraction', () => {
    const instant = new Date(2026, 9, 1, 9, 41, 22, 987);

    const text = toOffsetIsoString(instant);

    expect(text).toBe('2026-10-01T09:41:22-03:00');
  });

  it('should write the first minutes of the day on two digits in an offset instant', () => {
    const instant = new Date(2026, 0, 2, 0, 5, 9);

    const text = toOffsetIsoString(instant);

    expect(text).toBe('2026-01-02T00:05:09-03:00');
  });

  it('should write the local hour and minute of an instant followed by its local offset from UTC', () => {
    const instant = new Date(2026, 8, 14, 8, 2);

    const text = formatInstantTimeWithOffset(instant);

    expect(text).toBe('08:02 UTC-03:00');
  });

  it('should write only the local hour and minute of an instant whose hour the clock does not repeat', () => {
    const instant = new Date(2026, 8, 14, 8, 2);

    const text = formatInstantTimeUnambiguous(instant);

    expect(text).toBe('08:02');
  });

  describe('in a time zone that changes hour', () => {
    const original = process.env['TZ'];

    beforeEach(() => {
      process.env['TZ'] = 'Europe/Paris';
    });

    afterEach(() => {
      if (original === undefined) delete process.env['TZ'];
      else process.env['TZ'] = original;
    });

    it('should write the summer offset of an instant in the first occurrence of an ambiguous hour', () => {
      const ambiguous = new Date(2026, 9, 25, 2, 30);

      const text = toOffsetIsoString(ambiguous);

      expect(text).toBe('2026-10-25T02:30:00+02:00');
    });

    it('should write the winter offset of an instant after the hour went back', () => {
      const after = new Date(2026, 9, 25, 3, 30);

      const text = toOffsetIsoString(after);

      expect(text).toBe('2026-10-25T03:30:00+01:00');
    });

    it.each([
      { occurrence: 'first', instant: new Date(Date.UTC(2026, 9, 25, 0, 30)), text: '02:30 UTC+02:00' },
      { occurrence: 'second', instant: new Date(Date.UTC(2026, 9, 25, 1, 30)), text: '02:30 UTC+01:00' },
    ])('should tell the $occurrence occurrence of an ambiguous hour apart by its offset', ({ instant, text }) => {
      expect(formatInstantTimeWithOffset(instant)).toBe(text);
    });

    it.each([
      { occurrence: 'first', instant: new Date(Date.UTC(2026, 9, 25, 0, 30)), text: '02:30 UTC+02:00' },
      { occurrence: 'second', instant: new Date(Date.UTC(2026, 9, 25, 1, 30)), text: '02:30 UTC+01:00' },
    ])('should add the offset to the $occurrence occurrence of an hour the clock repeats', ({ instant, text }) => {
      expect(formatInstantTimeUnambiguous(instant)).toBe(text);
    });

    it.each([
      { cas: 'once the hour went back', instant: new Date(Date.UTC(2026, 9, 25, 2, 30)) },
      { cas: 'before the hour is repeated', instant: new Date(Date.UTC(2026, 9, 24, 21, 0)) },
    ])('should write only the hour and minute of an instant $cas', ({ instant }) => {
      expect(formatInstantTimeUnambiguous(instant)).toMatch(/^\d{2}:\d{2}$/);
    });
  });
});
