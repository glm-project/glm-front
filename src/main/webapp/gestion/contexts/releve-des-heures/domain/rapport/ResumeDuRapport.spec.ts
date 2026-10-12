import { DureeTravaillee } from '../duree/DureeTravaillee';
import { ResumeDuRapport } from './ResumeDuRapport';

describe('ResumeDuRapport', () => {
  it.each([
    [-1, 0],
    [1.5, 0],
    [0, -1],
  ])('should refuse %s days with clockings and %s automatic ends', (jours, finsAutomatiques) => {
    expect(() => new ResumeDuRapport({ tempsPointe: new DureeTravaillee('PT0S'), joursAvecPointage: jours, finsAutomatiques })).toThrow(
      'Le résumé reçu du serveur porte un compte invalide.',
    );
  });

  it('should keep the clocked time and the counts it received', () => {
    const resume = new ResumeDuRapport({ tempsPointe: new DureeTravaillee('PT47H45M'), joursAvecPointage: 6, finsAutomatiques: 1 });

    expect([resume.tempsPointe.minutes, resume.joursAvecPointage, resume.finsAutomatiques]).toEqual([2865, 6, 1]);
  });
});
