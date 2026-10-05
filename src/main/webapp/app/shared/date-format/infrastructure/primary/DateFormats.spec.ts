import { formatInstantNumericDateTime } from './DateFormats';

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
});
