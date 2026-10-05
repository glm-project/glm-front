import { formatInstantNumericDateTime, formatInstantNumericDayMonth, formatInstantTime, localCalendarDay } from './DateFormats';

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
});
