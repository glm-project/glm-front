import { DureeTravaillee } from './duree/DureeTravaillee';
import { TotalDeDuree } from './duree/TotalDeDuree';
import { JourDePointages } from './JourDePointages';
import { LigneDePointage } from './LigneDePointage';
import { PointagesDeLaSemaine } from './PointagesDeLaSemaine';
import { JourCalendaire } from './semaine/JourCalendaire';
import { SemaineISO } from './semaine/SemaineISO';

const SEMAINE = new SemaineISO(2026, 41);

const ligne = new LigneDePointage(
  { element: '204', poste: 'Tour', categorie: 'TRAVAIL', debut: new Date(2026, 9, 5, 7) },
  { etat: 'EN_COURS' },
);

const joursDe = (semaine: SemaineISO, rangsPointes: readonly number[] = []): readonly JourDePointages[] =>
  semaine
    .jours()
    .map(
      (jour: JourCalendaire, rang) =>
        new JourDePointages(jour, TotalDeDuree.complet(new DureeTravaillee('PT0S')), rangsPointes.includes(rang) ? [ligne] : []),
    );

describe('PointagesDeLaSemaine', () => {
  it('should offer only the clocked days, from Monday to Sunday', () => {
    const pointages = new PointagesDeLaSemaine(SEMAINE, TotalDeDuree.incomplet(), joursDe(SEMAINE, [0, 4]));

    expect(pointages.joursPointes().map(jour => jour.jour.value)).toEqual(['2026-10-05', '2026-10-09']);
  });

  it.each([
    ['2026-10-08', '2026-10-08'],
    ['2026-10-20', '2026-10-06'],
  ])('should show by default today when the week holds it, else its first clocked day (today %s)', (aujourdhui, attendu) => {
    const pointages = new PointagesDeLaSemaine(SEMAINE, TotalDeDuree.incomplet(), joursDe(SEMAINE, [1, 3]));

    expect(pointages.jourParDefaut(new JourCalendaire(aujourdhui))?.jour.value).toBe(attendu);
  });

  it('should show no day by default for a past week without any clocking', () => {
    const pointages = new PointagesDeLaSemaine(SEMAINE, TotalDeDuree.incomplet(), joursDe(SEMAINE));

    expect(pointages.jourParDefaut(new JourCalendaire('2026-10-20'))).toBeUndefined();
  });

  it.each<[string, readonly JourDePointages[]]>([
    ['six days', joursDe(SEMAINE).slice(1)],
    ['days in another order', [...joursDe(SEMAINE)].reverse()],
    ['the days of another week', joursDe(new SemaineISO(2026, 40))],
  ])('should refuse %s', (_cas, jours) => {
    const construction = (): PointagesDeLaSemaine => new PointagesDeLaSemaine(SEMAINE, TotalDeDuree.incomplet(), jours);

    expect(construction).toThrow('Les jours reçus ne sont pas les sept jours de la semaine 41 de 2026.');
  });
});
