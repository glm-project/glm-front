import { PointageReleveId } from '@/gestion/contexts/releve-des-heures/domain/releve/PointageReleveId';
import { DureeTravaillee } from '../duree/DureeTravaillee';
import { ActiviteDuReleve } from '../element/ActiviteDuReleve';
import { ElementReleveId } from '../element/ElementReleveId';
import { IntervalleDActivite } from '../element/IntervalleDActivite';
import { PosteReleveId } from '../element/PosteReleveId';
import { JourCalendaire } from '../semaine/JourCalendaire';
import { ActiviteReleveId } from './ActiviteReleveId';
import { CibleDePointage } from './CibleDePointage';
import { InstantDeReleve } from './InstantDeReleve';
import { FicheDuJour, JourDeReleve } from './JourDeReleve';
import { PointageDElement } from './PointageDElement';
import { TypeDePointage } from './TypeDePointage';

const activiteFixture = (debut: InstantDeReleve, fin: InstantDeReleve | undefined): ActiviteDuReleve =>
  fin === undefined
    ? { id: new ActiviteReleveId('a'), debut, etat: 'EN_COURS' }
    : { id: new ActiviteReleveId('a'), debut, fin, etat: 'TERMINEE' };

const instantFixture = (heure: number, minute: number): InstantDeReleve =>
  new InstantDeReleve(new Date(2026, 8, 14, heure, minute).toISOString());

const pointageFixture = (type: TypeDePointage, heure: number, minute: number): PointageDElement =>
  new PointageDElement({
    id: new PointageReleveId('pointage-fixture'),
    type: type,
    instant: instantFixture(heure, minute),
    cible: new CibleDePointage(new ElementReleveId('element-1'), undefined),
  });

const intervalleFixture = (element: string, debut: [number, number], fin: [number, number], poste?: string): IntervalleDActivite =>
  new IntervalleDActivite({
    element: new ElementReleveId(element),
    poste: poste === undefined ? undefined : new PosteReleveId(poste),
    nature: undefined,
    categorie: 'TRAVAIL',
    debut: instantFixture(...debut),
    fin: instantFixture(...fin),
    activite: activiteFixture(instantFixture(...debut), instantFixture(...fin)),
  });

const pointageDElementFixture = (type: TypeDePointage, element: string, heure: number, minute: number, poste: string): PointageDElement =>
  new PointageDElement({
    id: new PointageReleveId('pointage-fixture'),
    type: type,
    instant: instantFixture(heure, minute),
    cible: new CibleDePointage(new ElementReleveId(element), new PosteReleveId(poste)),
  });

const ficheFixture = (fiche: Partial<FicheDuJour>): FicheDuJour => ({
  jour: new JourCalendaire('2026-09-14'),
  operationnelTotal: new DureeTravaillee('PT0S'),
  intervalles: [],
  pointages: [],
  ...fiche,
});

describe('JourDeReleve', () => {
  it('should keep a day carrying an activity without a clocking nonempty', () => {
    const intervalle = intervalleFixture('carter', [0, 0], [3, 0]);
    const jour = new JourDeReleve(ficheFixture({ intervalles: [intervalle] }));

    expect(jour.estVide()).toBe(false);
  });

  it('should keep its clockings independent of the list it was built from', () => {
    const pointages = [pointageFixture('DEBUT', 8, 2)];
    const jour = new JourDeReleve(ficheFixture({ pointages }));

    pointages.pop();

    expect(jour.pointages).toHaveLength(1);
  });

  it('should not report as empty a working day of zero duration, clocked without any interval', () => {
    const pointages = [pointageFixture('DEBUT', 8, 2), pointageFixture('FIN', 8, 2)];

    const jour = new JourDeReleve(ficheFixture({ pointages }));

    expect(jour.estVide()).toBe(false);
  });

  it('should hand back the clockings of an element apart from those of the other elements', () => {
    const carter = pointageDElementFixture('DEBUT', 'carter', 8, 0, 'dmu');
    const bride = pointageDElementFixture('DEBUT', 'bride', 9, 0, 'dmu');
    const jour = new JourDeReleve(ficheFixture({ pointages: [carter, bride] }));

    expect(jour.pointagesDe(new ElementReleveId('carter'))).toEqual([carter]);
  });

  it('should hand back the intervals of an element apart from those of the other elements', () => {
    const carter = intervalleFixture('carter', [8, 0], [12, 0]);
    const bride = intervalleFixture('bride', [9, 0], [11, 0]);
    const jour = new JourDeReleve(ficheFixture({ intervalles: [carter, bride] }));

    expect(jour.intervallesDe(new ElementReleveId('carter'))).toEqual([carter]);
  });
});
