import { DureeTravaillee } from '../duree/DureeTravaillee';
import { ResumeDuRapport } from './ResumeDuRapport';

describe('ResumeDuRapport', () => {
  it.each([-1, 1.5])('should refuse %s days with clockings', jours => {
    expect(() => new ResumeDuRapport({ tempsPointe: new DureeTravaillee('PT0S'), joursAvecPointage: jours })).toThrow(
      'Le résumé reçu du serveur porte un compte invalide.',
    );
  });

  it('should keep the clocked time and the days it received', () => {
    const resume = new ResumeDuRapport({ tempsPointe: new DureeTravaillee('PT47H45M'), joursAvecPointage: 6 });

    expect([resume.tempsPointe.minutes, resume.joursAvecPointage]).toEqual([2865, 6]);
  });
});
