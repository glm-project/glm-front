import { BornesDuJour } from './BornesDuJour';
import { InstantDeLaJournee } from './InstantDeLaJournee';

const instant = (recu: string): InstantDeLaJournee => new InstantDeLaJournee(recu);

const MINUIT_DU_5 = instant('2026-10-05T00:00:00+02:00');
const MINUIT_DU_6 = instant('2026-10-06T00:00:00+02:00');

describe('BornesDuJour', () => {
  it('should keep the midnights it is given', () => {
    const bornes = new BornesDuJour({ debut: MINUIT_DU_5, fin: MINUIT_DU_6 });

    expect([bornes.debut, bornes.fin]).toEqual([MINUIT_DU_5, MINUIT_DU_6]);
  });

  it.each([
    { cas: 'the day ends before it starts', debut: MINUIT_DU_6, fin: MINUIT_DU_5 },
    { cas: 'the day ends when it starts', debut: MINUIT_DU_5, fin: MINUIT_DU_5 },
  ])('should refuse bornes where $cas', ({ debut, fin }) => {
    expect(() => new BornesDuJour({ debut, fin })).toThrow('Les bornes du jour reçues du serveur ne se suivent pas.');
  });
});
