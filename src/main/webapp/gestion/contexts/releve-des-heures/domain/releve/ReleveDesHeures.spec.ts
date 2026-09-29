import { DureeTravaillee } from '../duree/DureeTravaillee';
import { ElementDuReleve } from '../element/ElementDuReleve';
import { ElementReleveId } from '../element/ElementReleveId';
import { IntervalleDActivite } from '../element/IntervalleDActivite';
import { PosteDeLElement } from '../element/PosteDeLElement';
import { PosteReleveId } from '../element/PosteReleveId';
import { JourCalendaire } from '../semaine/JourCalendaire';
import { SemaineISO } from '../semaine/SemaineISO';
import { IdentiteOperateur } from './IdentiteOperateur';
import { InstantDeReleve } from './InstantDeReleve';
import { JourDeReleve } from './JourDeReleve';
import { FicheDuReleve, ReleveDesHeures } from './ReleveDesHeures';

const SEMAINE = new SemaineISO(2026, 38);

const jourFixture = (jour: string): JourDeReleve =>
  new JourDeReleve({
    jour: new JourCalendaire(jour),
    operationnelPointe: new DureeTravaillee('PT0S'),
    operationnelPresume: new DureeTravaillee('PT0S'),
    intervalles: [],
    pointages: [],
    plages: [],
  });

const semaineCompleteFixture = (): readonly JourDeReleve[] => SEMAINE.jours().map(jour => jourFixture(jour.value));

const ficheFixture = (jours: readonly JourDeReleve[]): FicheDuReleve => ({
  operateur: new IdentiteOperateur('Dupont', 'Jean'),
  elements: [],
  jours,
  presencePointee: new DureeTravaillee('PT38H'),
  presencePresumee: new DureeTravaillee('PT5H20M'),
  operationnelPointe: new DureeTravaillee('PT57H30M'),
  operationnelPresume: new DureeTravaillee('PT0S'),
});

describe('ReleveDesHeures', () => {
  it('should carry the seven days the week covers', () => {
    const releve = new ReleveDesHeures(SEMAINE, ficheFixture(semaineCompleteFixture()));

    expect(releve.jours.map(jour => jour.jour.value)).toEqual([
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
      '2026-09-17',
      '2026-09-18',
      '2026-09-19',
      '2026-09-20',
    ]);
  });

  it('should carry the clocked week total the server computed', () => {
    const releve = new ReleveDesHeures(SEMAINE, ficheFixture(semaineCompleteFixture()));

    expect(releve.presencePointee).toMatchObject({ heures: 38, minutesRestantes: 0 });
  });

  it('should carry the presumed week total the server computed, without adding the days up', () => {
    const releve = new ReleveDesHeures(SEMAINE, ficheFixture(semaineCompleteFixture()));

    expect(releve.presencePresumee).toMatchObject({ heures: 5, minutesRestantes: 20 });
  });

  it('should carry the operator the report resolved', () => {
    const releve = new ReleveDesHeures(SEMAINE, ficheFixture(semaineCompleteFixture()));

    expect(releve.operateur).toMatchObject({ nom: 'Dupont', prenom: 'Jean' });
  });

  it('should refuse a report that does not cover seven days', () => {
    const jours = semaineCompleteFixture().slice(0, 6);

    expect(() => new ReleveDesHeures(SEMAINE, ficheFixture(jours))).toThrow(
      'Le relevé reçu du serveur ne couvre pas les sept jours de la semaine demandée.',
    );
  });

  it('should refuse a report carrying more days than the week has', () => {
    const jours = [...semaineCompleteFixture(), jourFixture('2026-09-21')];

    expect(() => new ReleveDesHeures(SEMAINE, ficheFixture(jours))).toThrow(
      'Le relevé reçu du serveur ne couvre pas les sept jours de la semaine demandée.',
    );
  });

  it('should refuse a report carrying a day outside the week', () => {
    const jours = [...semaineCompleteFixture().slice(0, 6), jourFixture('2026-09-27')];

    expect(() => new ReleveDesHeures(SEMAINE, ficheFixture(jours))).toThrow(
      'Le relevé reçu du serveur ne couvre pas les sept jours de la semaine demandée.',
    );
  });

  it('should refuse a report whose days are out of calendar order', () => {
    const jours = [
      jourFixture('2026-09-15'),
      jourFixture('2026-09-14'),
      jourFixture('2026-09-16'),
      jourFixture('2026-09-17'),
      jourFixture('2026-09-18'),
      jourFixture('2026-09-19'),
      jourFixture('2026-09-20'),
    ];

    expect(() => new ReleveDesHeures(SEMAINE, ficheFixture(jours))).toThrow(
      'Le relevé reçu du serveur ne couvre pas les sept jours de la semaine demandée.',
    );
  });

  it('should keep its days independent of the list it was built from', () => {
    const jours = [...semaineCompleteFixture()];
    const releve = new ReleveDesHeures(SEMAINE, ficheFixture(jours));

    jours.pop();

    expect(releve.jours).toHaveLength(7);
  });

  describe('element worked from two workstations at once', () => {
    const elementFixture = (id: string): ElementDuReleve =>
      new ElementDuReleve({
        id: new ElementReleveId(id),
        type: 'PRODUIT',
        nom: id,
        reference: undefined,
        description: undefined,
        duree: new DureeTravaillee('PT0S'),
        dureeNonConformite: new DureeTravaillee('PT0S'),
        dureePresumee: new DureeTravaillee('PT0S'),
        postes: [
          new PosteDeLElement(new PosteReleveId('dmu'), 'DMU 50', 'Fraisage'),
          new PosteDeLElement(new PosteReleveId('mazak'), 'Mazak QT-200', 'Tournage'),
        ],
      });

    const intervalleFixture = (element: string, poste: string, debut: string, fin: string | undefined): IntervalleDActivite =>
      new IntervalleDActivite({
        element: new ElementReleveId(element),
        poste: new PosteReleveId(poste),
        nature: undefined,
        categorie: 'TRAVAIL',
        debut: new InstantDeReleve(`2026-09-14T${debut}:00Z`),
        fin: fin === undefined ? undefined : new InstantDeReleve(`2026-09-14T${fin}:00Z`),
        presumee: false,
      });

    const releveDes = (intervalles: readonly IntervalleDActivite[]): ReleveDesHeures => {
      const jourAvecIntervalles = new JourDeReleve({
        jour: new JourCalendaire('2026-09-14'),
        operationnelPointe: new DureeTravaillee('PT0S'),
        operationnelPresume: new DureeTravaillee('PT0S'),
        intervalles,
        pointages: [],
        plages: [],
      });
      return new ReleveDesHeures(SEMAINE, {
        ...ficheFixture([jourAvecIntervalles, ...semaineCompleteFixture().slice(1)]),
        elements: [elementFixture('carter'), elementFixture('bride')],
      });
    };

    it('should tell an element two of whose intervals overlap on two workstations', () => {
      const releve = releveDes([
        intervalleFixture('carter', 'dmu', '08:00', '12:00'),
        intervalleFixture('carter', 'mazak', '10:00', '14:00'),
      ]);

      expect(releve.travailleEnParallele(elementFixture('carter'))).toBe(true);
    });

    it('should not tell an element worked from two workstations one after the other', () => {
      const releve = releveDes([
        intervalleFixture('carter', 'dmu', '08:00', '12:00'),
        intervalleFixture('carter', 'mazak', '12:00', '14:00'),
      ]);

      expect(releve.travailleEnParallele(elementFixture('carter'))).toBe(false);
    });

    it('should not tell an element because another element is worked at the same time', () => {
      const releve = releveDes([
        intervalleFixture('carter', 'dmu', '08:00', '12:00'),
        intervalleFixture('bride', 'mazak', '10:00', '14:00'),
      ]);

      expect(releve.travailleEnParallele(elementFixture('carter'))).toBe(false);
    });

    it('should tell an element worked from two workstations that are both still in progress', () => {
      const releve = releveDes([
        intervalleFixture('carter', 'dmu', '08:00', undefined),
        intervalleFixture('carter', 'mazak', '10:00', undefined),
      ]);

      expect(releve.travailleEnParallele(elementFixture('carter'))).toBe(true);
    });
  });
});
