import { TestBed } from '@angular/core/testing';
import { DateAdapter, MAT_DATE_FORMATS, MatDateFormats } from '@angular/material/core';
import { MatDatepickerIntl } from '@angular/material/datepicker';
import { provideGestionDateAdapter } from './gestion-date.provider';

describe('Gestion date adapter', () => {
  let adapter: DateAdapter<Date>;
  let formats: MatDateFormats;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideGestionDateAdapter()] });
    adapter = TestBed.inject<DateAdapter<Date>>(DateAdapter);
    formats = TestBed.inject(MAT_DATE_FORMATS);
  });

  it('should read a typed date as day, month and year, not as the American month first', () => {
    const date = adapter.parse('05/10/2026', formats.parse.dateInput);

    expect(date).toEqual(new Date(2026, 9, 5));
  });

  it('should read a day and a month typed without their leading zero', () => {
    const date = adapter.parse('5/1/2026', formats.parse.dateInput);

    expect(date).toEqual(new Date(2026, 0, 5));
  });

  it.each(['31/02/2026', '29/02/2026', '00/10/2026', '05/13/2026', '2026-10-05', '05/10/26', '5 octobre 2026', '05/10/2026 09:41'])(
    'should reject the typed date %p, which is not a possible day, month and year',
    text => {
      const date = adapter.parse(text, formats.parse.dateInput);

      expect(date && adapter.isValid(date)).toBe(false);
    },
  );

  it('should read the leap day of a leap year', () => {
    const date = adapter.parse('29/02/2028', formats.parse.dateInput);

    expect(date).toEqual(new Date(2028, 1, 29));
  });

  it.each(['', '   '])('should read the empty text %p as no date', text => {
    const date = adapter.parse(text, formats.parse.dateInput);

    expect(date).toBeNull();
  });

  it('should keep a date handed over by Material without parsing it', () => {
    const date = adapter.parse(0, formats.parse.dateInput);

    expect(date).toEqual(new Date(0));
  });

  it('should read a typed time with its minutes', () => {
    const time = adapter.parseTime('09:41', formats.parse.timeInput);

    expect(time && [time.getHours(), time.getMinutes(), time.getSeconds()]).toEqual([9, 41, 0]);
  });

  it('should read a typed time with its seconds', () => {
    const time = adapter.parseTime('9:41:22', formats.parse.timeInput);

    expect(time && [time.getHours(), time.getMinutes(), time.getSeconds()]).toEqual([9, 41, 22]);
  });

  it('should read a time typed with surrounding blanks', () => {
    const time = adapter.parseTime(' 23:59:59 ', formats.parse.timeInput);

    expect(time && [time.getHours(), time.getMinutes(), time.getSeconds()]).toEqual([23, 59, 59]);
  });

  it.each(['24:00', '12:60', '12:30:60', '9h41', '9', '09:4', '09:41 PM', '09.41', '09:41:22:10'])(
    'should reject the typed time %p, which is not an hour, a minute and optionally a second',
    text => {
      const time = adapter.parseTime(text, formats.parse.timeInput);

      expect(time && adapter.isValid(time)).toBe(false);
    },
  );

  it('should read the empty text as no time', () => {
    const time = adapter.parseTime('  ', formats.parse.timeInput);

    expect(time).toBeNull();
  });

  it('should keep a time handed over by Material as a copy', () => {
    const given = new Date(2026, 9, 5, 9, 41);

    const time = adapter.parseTime(given, formats.parse.timeInput);

    expect(time).toEqual(given);
    expect(time).not.toBe(given);
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

    it('should keep the hour typed or chosen whatever the day it is set on, even when the clock skips it that day', () => {
      const skippedDay = new Date(2026, 2, 29, 4, 0);

      const time = adapter.setTime(skippedDay, 2, 30, 0);

      expect([time.getHours(), time.getMinutes(), time.getSeconds()]).toEqual([2, 30, 0]);
    });
  });

  it('should start the week on Monday', () => {
    const first = adapter.getFirstDayOfWeek();

    expect(first).toBe(1);
  });

  it('should name the months in French', () => {
    const months = adapter.getMonthNames('long');

    expect(months[9]).toBe('octobre');
  });

  it('should write a date in a date field as day, month and year', () => {
    const text = adapter.format(new Date(2026, 9, 5), formats.display.dateInput);

    expect(text).toBe('05/10/2026');
  });

  it('should write a time in a time field with its seconds', () => {
    const text = adapter.format(new Date(2026, 9, 5, 9, 41, 22), formats.display.timeInput);

    expect(text).toBe('09:41:22');
  });

  it('should write a time of the time panel as hour and minute', () => {
    const text = adapter.format(new Date(2026, 9, 5, 9, 30), formats.display.timeOptionLabel);

    expect(text).toBe('09:30');
  });

  it('should name the calendar controls in French', () => {
    const labels = whenReadingTheCalendarLabels();

    expect(labels).toEqual(['Ouvrir le calendrier', 'Mois précédent', 'Mois suivant', '2016 à 2039']);
  });

  const whenReadingTheCalendarLabels = (): string[] => {
    const intl = TestBed.inject(MatDatepickerIntl);
    return [intl.openCalendarLabel, intl.prevMonthLabel, intl.nextMonthLabel, intl.formatYearRangeLabel('2016', '2039')];
  };
});
