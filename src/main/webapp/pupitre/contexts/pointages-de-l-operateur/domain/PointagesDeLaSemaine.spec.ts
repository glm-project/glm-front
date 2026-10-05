import { DureeTravaillee } from './duree/DureeTravaillee';
import { TotalDeDuree } from './duree/TotalDeDuree';
import { JourDePointages } from './JourDePointages';
import { PointagesDeLaSemaine } from './PointagesDeLaSemaine';
import { JourCalendaire } from './semaine/JourCalendaire';
import { SemaineISO } from './semaine/SemaineISO';

const SEMAINE = new SemaineISO(2026, 41);

const joursDe = (semaine: SemaineISO, pointagesParRang: readonly number[] = []): readonly JourDePointages[] =>
  semaine
    .jours()
    .map(
      (jour: JourCalendaire, rang) =>
        new JourDePointages(jour, TotalDeDuree.complet(new DureeTravaillee('PT0S')), pointagesParRang[rang] ?? 0),
    );

describe('PointagesDeLaSemaine', () => {
  it('should offer only the clocked days, from Monday to Sunday', () => {
    const pointages = new PointagesDeLaSemaine(SEMAINE, TotalDeDuree.incomplet(), joursDe(SEMAINE, [1, 0, 0, 0, 2]));

    expect(pointages.joursPointes().map(jour => jour.jour.value)).toEqual(['2026-10-05', '2026-10-09']);
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
