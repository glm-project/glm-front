import { TotalDeDuree } from '@/gestion/contexts/releve-des-heures/domain/duree/TotalDeDuree';
import { PointageReleveId } from '@/gestion/contexts/releve-des-heures/domain/releve/PointageReleveId';
import { DureeTravaillee } from '../duree/DureeTravaillee';
import { ActiviteDuReleve } from '../element/ActiviteDuReleve';
import { ElementDuReleve } from '../element/ElementDuReleve';
import { ElementReleveId } from '../element/ElementReleveId';
import { IntervalleDActivite } from '../element/IntervalleDActivite';
import { PosteDeLElement } from '../element/PosteDeLElement';
import { PosteReleveId } from '../element/PosteReleveId';
import { JourCalendaire } from '../semaine/JourCalendaire';
import { SemaineISO } from '../semaine/SemaineISO';
import { ActiviteReleveId } from './ActiviteReleveId';
import { CibleDePointage } from './CibleDePointage';
import { IdentiteOperateur } from './IdentiteOperateur';
import { InstantDeReleve } from './InstantDeReleve';
import { JourDeReleve } from './JourDeReleve';
import { IntentionDePointage, PointageDElement } from './PointageDElement';
import { FicheDuReleve, ReleveDesHeures } from './ReleveDesHeures';

const intentionFixture = (type: string): IntentionDePointage =>
  type === 'FIN' ? { type: 'FIN', activiteVisee: new ActiviteReleveId('a') } : { type: 'OUVERTURE' };

const activiteFixture = (debut: InstantDeReleve, fin: InstantDeReleve | undefined): ActiviteDuReleve =>
  fin === undefined
    ? { id: new ActiviteReleveId('a'), debut, etat: 'EN_COURS' }
    : { id: new ActiviteReleveId('a'), debut, fin, etat: 'TERMINEE' };

const SEMAINE = new SemaineISO(2026, 38);

const jourFixture = (jour: string): JourDeReleve =>
  new JourDeReleve({
    jour: new JourCalendaire(jour),
    operationnelTotal: TotalDeDuree.complet(new DureeTravaillee('PT0S')),
    intervalles: [],
    pointages: [],
  });

const semaineCompleteFixture = (): readonly JourDeReleve[] => SEMAINE.jours().map(jour => jourFixture(jour.value));

const ficheFixture = (jours: readonly JourDeReleve[]): FicheDuReleve => ({
  operateur: new IdentiteOperateur('Dupont', 'Jean'),
  elements: [],
  jours,
  operationnelTotal: TotalDeDuree.complet(new DureeTravaillee('PT57H30M')),
  conflits: [],
});

const instantDe = (heure: string): InstantDeReleve => new InstantDeReleve(`2026-09-14T${heure}:00Z`);

const elementFixture = (id: string): ElementDuReleve =>
  new ElementDuReleve({
    id: new ElementReleveId(id),
    type: 'PRODUIT',
    nom: id,
    reference: undefined,
    description: undefined,
    duree: TotalDeDuree.complet(new DureeTravaillee('PT0S')),
    dureeNonConformite: TotalDeDuree.complet(new DureeTravaillee('PT0S')),
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
    debut: instantDe(debut),
    fin: fin === undefined ? undefined : instantDe(fin),
    activite: activiteFixture(instantDe(debut), fin === undefined ? undefined : instantDe(fin)),
  });

const pointageDElementFixture = (element: string, poste: string): PointageDElement =>
  new PointageDElement({
    id: new PointageReleveId('pointage-fixture'),
    type: 'DEBUT',
    instant: instantDe('08:00'),
    cible: new CibleDePointage(new ElementReleveId(element), new PosteReleveId(poste)),
    intention: intentionFixture('DEBUT'),
  });

const releveDes = (lundi: {
  readonly intervalles?: readonly IntervalleDActivite[];
  readonly pointages?: readonly PointageDElement[];
}): ReleveDesHeures => {
  const jourAvecFaits = new JourDeReleve({
    jour: new JourCalendaire('2026-09-14'),
    operationnelTotal: TotalDeDuree.complet(new DureeTravaillee('PT0S')),
    intervalles: lundi.intervalles ?? [],
    pointages: lundi.pointages ?? [],
  });
  return new ReleveDesHeures(SEMAINE, {
    ...ficheFixture([jourAvecFaits, ...semaineCompleteFixture().slice(1)]),
    elements: [elementFixture('carter'), elementFixture('bride')],
    conflits: [],
  });
};

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

  it('should carry the operational week total the server computed', () => {
    const releve = new ReleveDesHeures(SEMAINE, ficheFixture(semaineCompleteFixture()));

    expect(releve.operationnelTotal.snapshot()).toMatchObject({ complete: true, valeur: { heures: 57, minutesRestantes: 30 } });
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
    it('should tell an element two of whose intervals overlap on two workstations', () => {
      const releve = releveDes({
        intervalles: [intervalleFixture('carter', 'dmu', '08:00', '12:00'), intervalleFixture('carter', 'mazak', '10:00', '14:00')],
      });

      expect(releve.travailleEnParallele(elementFixture('carter'))).toBe(true);
    });

    it('should not tell an element worked from two workstations one after the other', () => {
      const releve = releveDes({
        intervalles: [intervalleFixture('carter', 'dmu', '08:00', '12:00'), intervalleFixture('carter', 'mazak', '12:00', '14:00')],
      });

      expect(releve.travailleEnParallele(elementFixture('carter'))).toBe(false);
    });

    it('should not tell an element because another element is worked at the same time', () => {
      const releve = releveDes({
        intervalles: [intervalleFixture('carter', 'dmu', '08:00', '12:00'), intervalleFixture('bride', 'mazak', '10:00', '14:00')],
      });

      expect(releve.travailleEnParallele(elementFixture('carter'))).toBe(false);
    });

    it('should tell an element worked from two workstations that are both still in progress', () => {
      const releve = releveDes({
        intervalles: [intervalleFixture('carter', 'dmu', '08:00', undefined), intervalleFixture('carter', 'mazak', '10:00', undefined)],
      });

      expect(releve.travailleEnParallele(elementFixture('carter'))).toBe(true);
    });
  });

  describe('references to elements and workstations', () => {
    const ELEMENT_ABSENT = 'Le relevé reçu du serveur désigne un élément que sa synthèse ne porte pas.';
    const POSTE_NON_PORTE = 'Le relevé reçu du serveur désigne un poste que son élément ne porte pas.';

    it.each([
      ['an interval', { intervalles: [intervalleFixture('fantome', 'dmu', '08:00', '12:00')] }],
      ['a clocking', { pointages: [pointageDElementFixture('fantome', 'dmu')] }],
    ] as const)('should refuse a report whose %s names an element it does not carry', (_cas, jour) => {
      expect(() => releveDes(jour)).toThrow(ELEMENT_ABSENT);
    });

    it.each([
      ['an interval', { intervalles: [intervalleFixture('carter', 'inconnu', '08:00', '12:00')] }],
      ['a clocking', { pointages: [pointageDElementFixture('carter', 'inconnu')] }],
    ] as const)('should refuse a report whose %s names a workstation its element does not carry', (_cas, jour) => {
      expect(() => releveDes(jour)).toThrow(POSTE_NON_PORTE);
    });

    it('should accept a report whose clocking names no workstation', () => {
      expect(() =>
        releveDes({
          pointages: [
            new PointageDElement({
              id: new PointageReleveId('pointage-fixture'),
              type: 'DEBUT',
              instant: instantDe('08:00'),
              cible: new CibleDePointage(new ElementReleveId('carter'), undefined),
              intention: intentionFixture('DEBUT'),
            }),
          ],
        }),
      ).not.toThrow();
    });
  });
});
