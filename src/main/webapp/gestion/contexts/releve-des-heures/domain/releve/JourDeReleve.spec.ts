import { DureeTravaillee } from '../duree/DureeTravaillee';
import { ElementReleveId } from '../element/ElementReleveId';
import { IntervalleDActivite } from '../element/IntervalleDActivite';
import { PosteReleveId } from '../element/PosteReleveId';
import { JourCalendaire } from '../semaine/JourCalendaire';
import { InstantDeReleve } from './InstantDeReleve';
import { FicheDuJour, JourDeReleve } from './JourDeReleve';
import { PlageDeReleve } from './PlageDeReleve';
import { PointageDElement } from './PointageDElement';
import { PointageDePresence } from './PointageDePresence';
import { TypeDePointageDElement, TypeDePointageDePresence } from './TypeDePointage';

const instantFixture = (heure: number, minute: number): InstantDeReleve =>
  new InstantDeReleve(new Date(2026, 8, 14, heure, minute).toISOString());

const pointageFixture = (type: TypeDePointageDePresence, heure: number, minute: number): PointageDePresence =>
  new PointageDePresence(type, instantFixture(heure, minute));

const intervalleFixture = (element: string, debut: [number, number], fin: [number, number], poste?: string): IntervalleDActivite =>
  new IntervalleDActivite({
    element: new ElementReleveId(element),
    poste: poste === undefined ? undefined : new PosteReleveId(poste),
    nature: undefined,
    categorie: 'TRAVAIL',
    debut: instantFixture(...debut),
    fin: instantFixture(...fin),
    presumee: false,
  });

const pointageDElementFixture = (
  type: TypeDePointageDElement,
  element: string,
  heure: number,
  minute: number,
  poste: string,
): PointageDElement =>
  new PointageDElement(type, instantFixture(heure, minute), { element: new ElementReleveId(element), poste: new PosteReleveId(poste) });

const finPointeeFixture = (element: string, heure: number, minute: number, poste: string): PointageDElement =>
  pointageDElementFixture('FIN', element, heure, minute, poste);

const ficheFixture = (fiche: Partial<FicheDuJour>): FicheDuJour => ({
  jour: new JourCalendaire('2026-09-14'),
  operationnelPointe: new DureeTravaillee('PT0S'),
  operationnelPresume: new DureeTravaillee('PT0S'),
  intervalles: [],
  pointages: [],
  plages: [],
  ...fiche,
});

describe('JourDeReleve', () => {
  it('should keep its clockings independent of the list it was built from', () => {
    const pointages = [pointageFixture('ARRIVEE', 8, 2)];
    const jour = new JourDeReleve(ficheFixture({ pointages }));

    pointages.pop();

    expect(jour.pointages).toHaveLength(1);
  });

  it('should report a day carrying neither clocking nor interval as empty', () => {
    const jour = new JourDeReleve(ficheFixture({}));

    expect(jour.estVide()).toBe(true);
  });

  it('should not report as empty a day that a presence covers without any clocking', () => {
    const plage = new PlageDeReleve(instantFixture(0, 0), instantFixture(23, 59), false);

    const jour = new JourDeReleve(ficheFixture({ plages: [plage] }));

    expect(jour.estVide()).toBe(false);
  });

  it('should not report as empty a working day of zero duration, clocked without any interval', () => {
    const pointages = [pointageFixture('ARRIVEE', 8, 2), pointageFixture('DEPART', 8, 2)];

    const jour = new JourDeReleve(ficheFixture({ pointages }));

    expect(jour.estVide()).toBe(false);
  });

  it('should tell an interval no clocking of the day opened, cut at midnight by the server, as coming from the day before', () => {
    const plage = new PlageDeReleve(instantFixture(0, 0), instantFixture(7, 5), false);
    const jour = new JourDeReleve(ficheFixture({ pointages: [pointageFixture('DEPART', 7, 5)], plages: [plage] }));

    expect(jour.vientDeLaVeille(plage)).toBe(true);
  });

  it('should tell a presence cut at midnight by the server as coming from the day before, an element being clocked at that very instant', () => {
    const plage = new PlageDeReleve(instantFixture(0, 0), instantFixture(7, 5), false);
    const debutPointe = pointageDElementFixture('DEBUT', 'carter', 0, 0, 'dmu');
    const jour = new JourDeReleve(ficheFixture({ pointages: [debutPointe, pointageFixture('DEPART', 7, 5)], plages: [plage] }));

    expect(jour.vientDeLaVeille(plage)).toBe(true);
  });

  it('should not take an interval opened by an arrival in the first minute after midnight for one coming from the day before', () => {
    const arrivee = new InstantDeReleve(new Date(2026, 8, 14, 0, 0, 40).toISOString());
    const plage = new PlageDeReleve(arrivee, instantFixture(8, 0), false);
    const jour = new JourDeReleve(ficheFixture({ pointages: [new PointageDePresence('ARRIVEE', arrivee)], plages: [plage] }));

    expect(jour.vientDeLaVeille(plage)).toBe(false);
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

  describe('effect of a clocking', () => {
    const depart = pointageFixture('DEPART', 16, 0);

    const clotures = (jour: JourDeReleve, pointage: PointageDePresence | PointageDElement): string[] =>
      jour.effetDe(pointage).clotures.map(cible => `${cible.element.value}/${cible.poste?.value ?? '-'}`);

    it('should close the element whose interval ends at a departure that no clocked end finishes', () => {
      const jour = new JourDeReleve(
        ficheFixture({ pointages: [depart], intervalles: [intervalleFixture('carter', [8, 0], [16, 0], 'dmu')] }),
      );

      expect(clotures(jour, depart)).toEqual(['carter/dmu']);
    });

    it('should close no element at a departure when a clocked end finishes its interval at that instant', () => {
      const fin = finPointeeFixture('carter', 16, 0, 'dmu');
      const jour = new JourDeReleve(
        ficheFixture({ pointages: [fin, depart], intervalles: [intervalleFixture('carter', [8, 0], [16, 0], 'dmu')] }),
      );

      expect(clotures(jour, depart)).toEqual([]);
    });

    it('should close no element at a departure no interval ends, the departure of an abandoned working day', () => {
      const jour = new JourDeReleve(
        ficheFixture({ pointages: [depart], intervalles: [intervalleFixture('carter', [8, 0], [15, 0], 'dmu')] }),
      );

      expect(clotures(jour, depart)).toEqual([]);
    });

    it('should close every workstation an element was worked from that the departure stopped', () => {
      const jour = new JourDeReleve(
        ficheFixture({
          pointages: [depart],
          intervalles: [intervalleFixture('carter', [8, 0], [16, 0], 'dmu'), intervalleFixture('carter', [10, 0], [16, 0], 'mazak')],
        }),
      );

      expect(clotures(jour, depart)).toEqual(['carter/dmu', 'carter/mazak']);
    });

    it('should give an arrival no effect, even at the instant an interval ends', () => {
      const arrivee = pointageFixture('ARRIVEE', 16, 0);
      const jour = new JourDeReleve(
        ficheFixture({ pointages: [arrivee], intervalles: [intervalleFixture('carter', [8, 0], [16, 0], 'dmu')] }),
      );

      expect(clotures(jour, arrivee)).toEqual([]);
    });

    it('should give a non-conformity clocking no effect, even at the instant an interval ends', () => {
      const nonConformite = pointageDElementFixture('NON_CONFORMITE', 'carter', 16, 0, 'dmu');
      const jour = new JourDeReleve(
        ficheFixture({ pointages: [nonConformite], intervalles: [intervalleFixture('carter', [8, 0], [16, 0], 'dmu')] }),
      );

      expect(clotures(jour, nonConformite)).toEqual([]);
    });

    it('should still close the element at a departure when only a non-conformity is clocked at that instant', () => {
      const nonConformite = pointageDElementFixture('NON_CONFORMITE', 'carter', 16, 0, 'dmu');
      const jour = new JourDeReleve(
        ficheFixture({ pointages: [nonConformite, depart], intervalles: [intervalleFixture('carter', [8, 0], [16, 0], 'dmu')] }),
      );

      expect(clotures(jour, depart)).toEqual(['carter/dmu']);
    });

    it('should still close the element at a departure when the end clocked at that instant is another element’s', () => {
      const jour = new JourDeReleve(
        ficheFixture({
          pointages: [finPointeeFixture('bride', 16, 0, 'dmu'), depart],
          intervalles: [intervalleFixture('carter', [8, 0], [16, 0], 'dmu')],
        }),
      );

      expect(clotures(jour, depart)).toEqual(['carter/dmu']);
    });

    it('should still close the element at a departure when the end clocked at that instant is from another workstation', () => {
      const jour = new JourDeReleve(
        ficheFixture({
          pointages: [finPointeeFixture('carter', 16, 0, 'mazak'), depart],
          intervalles: [intervalleFixture('carter', [8, 0], [16, 0], 'dmu')],
        }),
      );

      expect(clotures(jour, depart)).toEqual(['carter/dmu']);
    });

    it('should still close the element at a departure when its end was clocked at another instant', () => {
      const jour = new JourDeReleve(
        ficheFixture({
          pointages: [finPointeeFixture('carter', 15, 0, 'dmu'), depart],
          intervalles: [intervalleFixture('carter', [8, 0], [16, 0], 'dmu')],
        }),
      );

      expect(clotures(jour, depart)).toEqual(['carter/dmu']);
    });

    it('should close a workstation of an element once when several of its intervals end at the departure', () => {
      const jour = new JourDeReleve(
        ficheFixture({
          pointages: [depart],
          intervalles: [intervalleFixture('carter', [8, 0], [16, 0], 'dmu'), intervalleFixture('carter', [12, 0], [16, 0], 'dmu')],
        }),
      );

      expect(clotures(jour, depart)).toEqual(['carter/dmu']);
    });

    it('should give a clocked end no effect', () => {
      const fin = finPointeeFixture('carter', 16, 0, 'dmu');
      const jour = new JourDeReleve(ficheFixture({ pointages: [fin], intervalles: [intervalleFixture('carter', [8, 0], [16, 0], 'dmu')] }));

      expect(clotures(jour, fin)).toEqual([]);
    });
  });
});
