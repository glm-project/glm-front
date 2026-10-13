import { Duree } from '../journee/Duree';
import { InstantDeLaJournee } from '../journee/InstantDeLaJournee';
import { IntervalleDAjout } from './IntervalleDAjout';

const instant = (recu: string): InstantDeLaJournee => new InstantDeLaJournee(recu);

const MIDI = instant('2026-10-05T12:00:00-03:00');

describe('Interval of an added activity', () => {
  it('should keep its start and its end and measure the time between them when the end follows the start', () => {
    const intervalle = IntervalleDAjout.entre(MIDI, instant('2026-10-05T14:30:00-03:00'));

    expect([intervalle?.debut, intervalle?.fin, intervalle?.duree()]).toEqual([
      MIDI,
      instant('2026-10-05T14:30:00-03:00'),
      new Duree('PT2H30M'),
    ]);
  });

  it.each([
    { cas: 'is the start', fin: '2026-10-05T12:00:00-03:00' },
    { cas: 'precedes the start', fin: '2026-10-05T11:59:00-03:00' },
  ])('should not exist when the end $cas', ({ fin }) => {
    expect(IntervalleDAjout.entre(MIDI, instant(fin))).toBeUndefined();
  });
});
