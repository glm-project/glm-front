import { DureeTravaillee } from '../duree/DureeTravaillee';
import { ResumeDuRapport } from './ResumeDuRapport';

describe('ResumeDuRapport', () => {
  it.each([
    [-1, 0, 0],
    [1.5, 0, 0],
    [0, -1, 0],
    [0, 0, 2.5],
  ])('should refuse %s days with clockings, %s automatic ends and %s clockings', (jours, finsAutomatiques, pointages) => {
    expect(
      () => new ResumeDuRapport({ tempsPointe: new DureeTravaillee('PT0S'), joursAvecPointage: jours, pointages, finsAutomatiques }),
    ).toThrow('Le résumé reçu du serveur porte un compte invalide.');
  });

  it('should keep the clocked time and the counts it received', () => {
    const resume = new ResumeDuRapport({
      tempsPointe: new DureeTravaillee('PT47H45M'),
      joursAvecPointage: 6,
      pointages: 23,
      finsAutomatiques: 1,
    });

    expect([resume.tempsPointe.minutes, resume.joursAvecPointage, resume.pointages, resume.finsAutomatiques]).toEqual([2865, 6, 23, 1]);
  });
});
