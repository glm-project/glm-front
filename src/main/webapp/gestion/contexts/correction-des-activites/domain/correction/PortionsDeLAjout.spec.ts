import { Duree } from '../journee/Duree';
import { InstantDeLaJournee } from '../journee/InstantDeLaJournee';
import { JourACorriger } from '../journee/JourACorriger';
import { IntervalleDAjout } from './IntervalleDAjout';
import { PortionsDeLAjout } from './PortionsDeLAjout';

const instant = (recu: string): InstantDeLaJournee => new InstantDeLaJournee(recu);

const LUNDI = new JourACorriger('2026-10-05');
const MARDI = new JourACorriger('2026-10-06');
const MINUIT_DU_6 = instant('2026-10-06T00:00:00-03:00');

const portions = (debut: string, fin: string): PortionsDeLAjout => {
  const intervalle = IntervalleDAjout.entre(instant(debut), instant(fin));
  if (intervalle === undefined) {
    throw new Error('Intervalle semé incohérent');
  }
  return new PortionsDeLAjout(intervalle, LUNDI, MINUIT_DU_6);
};

describe('Portions of an added activity', () => {
  it('should count the whole activity on the day displayed and nothing on the next day when it ends before midnight', () => {
    const duJour = portions('2026-10-05T12:00:00-03:00', '2026-10-05T14:30:00-03:00');

    expect(duJour.duJourAffiche).toEqual({ jour: LUNDI, duree: new Duree('PT2H30M') });
    expect(duJour.duLendemain).toBeUndefined();
    expect(duJour.finSurLeJourAffiche).toEqual(instant('2026-10-05T14:30:00-03:00'));
  });

  it('should count one portion on each day, cut at the end of the day displayed, when it crosses midnight', () => {
    const aCheval = portions('2026-10-05T22:00:00-03:00', '2026-10-06T03:30:00-03:00');

    expect(aCheval.duJourAffiche).toEqual({ jour: LUNDI, duree: new Duree('PT2H') });
    expect(aCheval.duLendemain).toEqual({ jour: MARDI, duree: new Duree('PT3H30M') });
    expect(aCheval.finSurLeJourAffiche).toEqual(MINUIT_DU_6);
  });

  it('should count nothing on the next day when it ends exactly at midnight', () => {
    expect(portions('2026-10-05T22:00:00-03:00', '2026-10-06T00:00:00-03:00').duLendemain).toBeUndefined();
  });
});
