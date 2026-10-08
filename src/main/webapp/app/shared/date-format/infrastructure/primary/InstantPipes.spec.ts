import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InstantLongDayPipe, InstantLongDayWithSecondsPipe, InstantTimeAndLongDayWithSecondsPipe } from './InstantPipes';

@Component({
  imports: [InstantLongDayWithSecondsPipe, InstantTimeAndLongDayWithSecondsPipe],
  template: '<p>{{ received | instantLongDayWithSeconds: now }}</p><p>{{ (received | instantTimeAndLongDayWithSeconds: now).time }}</p>',
})
class HostFixture {
  readonly received = new Date(2026, 9, 1, 9, 41, 22).toISOString();
  readonly now = new Date(2026, 9, 5, 10, 0);
}

describe('Instant pipes', () => {
  const now = new Date(2026, 9, 5, 10, 0);

  it('should show the instant received as text as its long day and local time', () => {
    const received = new Date(2026, 9, 1, 9, 41, 22).toISOString();

    const text = new InstantLongDayPipe().transform(received, now);

    expect(text).toBe('jeudi 1 octobre à 09:41');
  });

  it('should add the year to the long day of a received instant from another year than now', () => {
    const received = new Date(2025, 9, 1, 9, 41, 22).toISOString();

    const text = new InstantLongDayPipe().transform(received, now);

    expect(text).toBe('mercredi 1 octobre 2025 à 09:41');
  });

  it('should read the local time of an instant received with a UTC offset and nanoseconds', () => {
    const received = '2026-10-01T14:41:22.123456789+02:00';

    const text = new InstantLongDayPipe().transform(received, now);

    expect(text).toBe('jeudi 1 octobre à 09:41');
  });

  it('should leave a text that is not an instant as it was typed in a long day', () => {
    const typed = '2026-10-01T09';

    const text = new InstantLongDayPipe().transform(typed, now);

    expect(text).toBe('2026-10-01T09');
  });

  it('should show the instant received as text with its seconds', () => {
    const received = new Date(2026, 9, 1, 9, 41, 22).toISOString();

    const text = new InstantLongDayWithSecondsPipe().transform(received, now);

    expect(text).toBe('jeudi 1 octobre à 09:41:22');
  });

  it('should add the year to the long day with seconds of a received instant from another year than now', () => {
    const received = new Date(2025, 9, 1, 9, 41, 22).toISOString();

    const text = new InstantLongDayWithSecondsPipe().transform(received, now);

    expect(text).toBe('mercredi 1 octobre 2025 à 09:41:22');
  });

  it('should leave a text that is not an instant as it was typed with seconds', () => {
    const typed = '';

    const text = new InstantLongDayWithSecondsPipe().transform(typed, now);

    expect(text).toBe('');
  });

  it('should split the instant received as text into its time with seconds and its long day', () => {
    const received = new Date(2026, 9, 1, 9, 41, 22).toISOString();

    const parts = new InstantTimeAndLongDayWithSecondsPipe().transform(received, now);

    expect(parts).toEqual({ time: '09:41:22', day: 'jeudi 1 octobre' });
  });

  it('should keep a text that is not an instant as the time part, without a day', () => {
    const typed = 'pas un instant';

    const parts = new InstantTimeAndLongDayWithSecondsPipe().transform(typed, now);

    expect(parts).toEqual({ time: 'pas un instant', day: '' });
  });

  it('should be usable from a template by their names', () => {
    const fixture = whenRenderingTheHostOfThePipes();

    thenTheParagraphsRead(fixture, ['jeudi 1 octobre à 09:41:22', '09:41:22']);
  });
});

const whenRenderingTheHostOfThePipes = (): ComponentFixture<HostFixture> => {
  const fixture = TestBed.createComponent(HostFixture);
  fixture.detectChanges();
  return fixture;
};

const thenTheParagraphsRead = (fixture: ComponentFixture<HostFixture>, expected: readonly string[]): void => {
  const paragraphs = [...(fixture.nativeElement as HTMLElement).querySelectorAll('p')].map(paragraph => paragraph.textContent);
  expect(paragraphs).toEqual(expected);
};
