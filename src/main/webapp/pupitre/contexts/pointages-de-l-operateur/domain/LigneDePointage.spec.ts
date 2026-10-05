import { EtatDeLigne, LigneDePointage } from './LigneDePointage';

const activite = { element: '204', poste: 'Tour', categorie: 'TRAVAIL', debut: new Date(2026, 9, 8, 7, 2) } as const;

const dureeLue = (ligne: LigneDePointage): { heures: number; minutesRestantes: number } | undefined => {
  const duree = ligne.duree();
  return duree && { heures: duree.heures, minutesRestantes: duree.minutesRestantes };
};

describe('LigneDePointage', () => {
  it.each<[EtatDeLigne, { heures: number; minutesRestantes: number } | undefined]>([
    [
      { etat: 'TERMINEE', fin: new Date(2026, 9, 8, 9, 40, 59) },
      { heures: 2, minutesRestantes: 38 },
    ],
    [
      { etat: 'TERMINEE_AUTOMATIQUEMENT', fin: new Date(2026, 9, 8, 20, 2) },
      { heures: 13, minutesRestantes: 0 },
    ],
    [{ etat: 'EN_COURS' }, undefined],
    [{ etat: 'A_RESOUDRE' }, undefined],
  ])('should give a duration only to a finished portion (%o)', (etat, attendu) => {
    const ligne = new LigneDePointage(activite, etat);

    expect(dureeLue(ligne)).toEqual(attendu);
  });

  it('should refuse a portion ending before it starts', () => {
    const construction = (): LigneDePointage => new LigneDePointage(activite, { etat: 'TERMINEE', fin: new Date(2026, 9, 8, 7, 1) });

    expect(construction).toThrow('Le pointage de 204 finit avant de commencer.');
  });
});
