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

describe('Interval of an added activity cut at a midnight', () => {
  const MINUIT_DU_6 = instant('2026-10-06T00:00:00-03:00');

  const coupe = (debut: string, fin: string) => IntervalleDAjout.entre(instant(debut), instant(fin))?.coupeA(MINUIT_DU_6);

  it('should keep the whole duration before the midnight and nothing after it when it ends before it', () => {
    expect(coupe('2026-10-05T12:00:00-03:00', '2026-10-05T14:30:00-03:00')).toEqual({
      avant: new Duree('PT2H30M'),
      apres: undefined,
      finSurLeJour: instant('2026-10-05T14:30:00-03:00'),
    });
  });

  it('should keep nothing after the midnight when it ends on it', () => {
    expect(coupe('2026-10-05T22:00:00-03:00', '2026-10-06T00:00:00-03:00')).toEqual({
      avant: new Duree('PT2H'),
      apres: undefined,
      finSurLeJour: MINUIT_DU_6,
    });
  });

  it('should share its duration between the two sides of the midnight when it crosses it', () => {
    expect(coupe('2026-10-05T22:00:00-03:00', '2026-10-06T03:30:00-03:00')).toEqual({
      avant: new Duree('PT2H'),
      apres: new Duree('PT3H30M'),
      finSurLeJour: MINUIT_DU_6,
    });
  });

  it('should keep nothing before the midnight when it starts after it', () => {
    expect(coupe('2026-10-06T01:00:00-03:00', '2026-10-06T03:30:00-03:00')).toEqual({
      avant: new Duree('PT0S'),
      apres: new Duree('PT2H30M'),
      finSurLeJour: MINUIT_DU_6,
    });
  });
});
