import { BornesDuJour } from './BornesDuJour';
import { InstantDeLaJournee } from './InstantDeLaJournee';

const instant = (recu: string): InstantDeLaJournee => new InstantDeLaJournee(recu);

const MINUIT_DU_5 = instant('2026-10-05T00:00:00+02:00');
const MINUIT_DU_6 = instant('2026-10-06T00:00:00+02:00');
const MINUIT_DU_7 = instant('2026-10-07T00:00:00+02:00');

describe('BornesDuJour', () => {
  it('should keep the midnights it is given, the end of the next day included', () => {
    const bornes = new BornesDuJour({ debut: MINUIT_DU_5, fin: MINUIT_DU_6, finDuLendemain: MINUIT_DU_7 });

    expect([bornes.debut, bornes.fin, bornes.finDuLendemain]).toEqual([MINUIT_DU_5, MINUIT_DU_6, MINUIT_DU_7]);
  });

  it.each([
    { cas: 'the day ends before it starts', debut: MINUIT_DU_6, fin: MINUIT_DU_5, finDuLendemain: MINUIT_DU_7 },
    { cas: 'the day ends when it starts', debut: MINUIT_DU_5, fin: MINUIT_DU_5, finDuLendemain: MINUIT_DU_7 },
    { cas: 'the next day ends before the day does', debut: MINUIT_DU_5, fin: MINUIT_DU_6, finDuLendemain: MINUIT_DU_5 },
    { cas: 'the next day ends when the day does', debut: MINUIT_DU_5, fin: MINUIT_DU_6, finDuLendemain: MINUIT_DU_6 },
  ])('should refuse bornes where $cas', ({ debut, fin, finDuLendemain }) => {
    expect(() => new BornesDuJour({ debut, fin, finDuLendemain })).toThrow('Les bornes du jour reçues du serveur ne se suivent pas.');
  });
});
