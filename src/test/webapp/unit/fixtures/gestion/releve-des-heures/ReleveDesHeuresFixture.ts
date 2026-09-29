import { DureeTravaillee } from '@/gestion/contexts/releve-des-heures/domain/duree/DureeTravaillee';
import { CategorieDActivite } from '@/gestion/contexts/releve-des-heures/domain/element/CategorieDActivite';
import { ElementDuReleve } from '@/gestion/contexts/releve-des-heures/domain/element/ElementDuReleve';
import { ElementReleveId } from '@/gestion/contexts/releve-des-heures/domain/element/ElementReleveId';
import { IntervalleDActivite } from '@/gestion/contexts/releve-des-heures/domain/element/IntervalleDActivite';
import { PosteDeLElement } from '@/gestion/contexts/releve-des-heures/domain/element/PosteDeLElement';
import { PosteReleveId } from '@/gestion/contexts/releve-des-heures/domain/element/PosteReleveId';
import { TypeDElement } from '@/gestion/contexts/releve-des-heures/domain/element/TypeDElement';
import { IdentiteOperateur } from '@/gestion/contexts/releve-des-heures/domain/releve/IdentiteOperateur';
import { InstantDeReleve } from '@/gestion/contexts/releve-des-heures/domain/releve/InstantDeReleve';
import { JourDeReleve } from '@/gestion/contexts/releve-des-heures/domain/releve/JourDeReleve';
import { PlageDeReleve } from '@/gestion/contexts/releve-des-heures/domain/releve/PlageDeReleve';
import { PointageDElement } from '@/gestion/contexts/releve-des-heures/domain/releve/PointageDElement';
import { PointageDePresence } from '@/gestion/contexts/releve-des-heures/domain/releve/PointageDePresence';
import { PointageDeReleve } from '@/gestion/contexts/releve-des-heures/domain/releve/PointageDeReleve';
import { ReleveDesHeures } from '@/gestion/contexts/releve-des-heures/domain/releve/ReleveDesHeures';
import { TypeDePointageDElement, TypeDePointageDePresence } from '@/gestion/contexts/releve-des-heures/domain/releve/TypeDePointage';
import { JourCalendaire } from '@/gestion/contexts/releve-des-heures/domain/semaine/JourCalendaire';
import { SemaineISO } from '@/gestion/contexts/releve-des-heures/domain/semaine/SemaineISO';

export const OPERATEUR = 'op-1';
export const SEMAINE_EN_COURS = new SemaineISO(2026, 38);

export type Heure = readonly [number, number];

export const instantFixture = (rang: number, [heure, minute]: Heure): InstantDeReleve =>
  new InstantDeReleve(new Date(2026, 8, 14 + rang, heure, minute).toISOString());

export interface IntervalleFixture {
  readonly element?: string;
  readonly poste?: string;
  readonly categorie?: CategorieDActivite;
  readonly debut: Heure;
  readonly fin?: Heure;
  readonly presumee?: boolean;
}

export interface PointageDElementFixture {
  readonly type: TypeDePointageDElement;
  readonly heure: Heure;
  readonly element?: string;
  readonly poste?: string;
}

export type PointageDePresenceFixture = readonly [TypeDePointageDePresence, Heure];

export interface JourFixture {
  readonly intervalles?: readonly IntervalleFixture[];
  readonly pointagesDElement?: readonly PointageDElementFixture[];
  readonly operationnelle?: string;
  readonly operationnellePresumee?: string;
  readonly pointages?: readonly PointageDePresenceFixture[];
  readonly journal?: readonly (PointageDePresenceFixture | PointageDElementFixture)[];
  readonly plages?: readonly (readonly [Heure, Heure | undefined, boolean?])[];
}

export const pointageFixture = (rang: number, pointage: PointageDePresenceFixture | PointageDElementFixture): PointageDeReleve => {
  if ('type' in pointage) {
    return new PointageDElement(pointage.type, instantFixture(rang, pointage.heure), {
      element: new ElementReleveId(pointage.element ?? 'element-1'),
      poste: pointage.poste === undefined ? undefined : new PosteReleveId(pointage.poste),
    });
  }
  const [type, heure] = pointage;
  return new PointageDePresence(type, instantFixture(rang, heure));
};

export const jourFixture = (jour: JourCalendaire, rang: number, fiche: JourFixture): JourDeReleve =>
  new JourDeReleve({
    jour,
    operationnelPointe: new DureeTravaillee(fiche.operationnelle ?? 'PT0S'),
    operationnelPresume: new DureeTravaillee(fiche.operationnellePresumee ?? 'PT0S'),
    intervalles: (fiche.intervalles ?? []).map(
      intervalle =>
        new IntervalleDActivite({
          element: new ElementReleveId(intervalle.element ?? 'element-1'),
          poste: intervalle.poste === undefined ? undefined : new PosteReleveId(intervalle.poste),
          nature: undefined,
          categorie: intervalle.categorie ?? 'TRAVAIL',
          debut: instantFixture(rang, intervalle.debut),
          fin: intervalle.fin === undefined ? undefined : instantFixture(rang, intervalle.fin),
          presumee: intervalle.presumee ?? false,
        }),
    ),
    pointages: (fiche.journal ?? [...(fiche.pointages ?? []), ...(fiche.pointagesDElement ?? [])]).map(pointage =>
      pointageFixture(rang, pointage),
    ),
    plages: (fiche.plages ?? []).map(
      ([debut, fin, presumee]) =>
        new PlageDeReleve(instantFixture(rang, debut), fin === undefined ? undefined : instantFixture(rang, fin), presumee ?? false),
    ),
  });

export interface TotauxFixture {
  readonly presencePresumee?: string;
  readonly operationnelle?: string;
  readonly operationnellePresumee?: string;
}

export interface ElementFixture {
  readonly id?: string;
  readonly type?: TypeDElement;
  readonly nom?: string;
  readonly reference?: string;
  readonly description?: string;
  readonly postes?: readonly (readonly [string, string | undefined, string?])[];
  readonly duree?: string;
  readonly dureeNonConformite?: string;
  readonly dureePresumee?: string;
}

export const elementFixture = (fiche: ElementFixture = {}): ElementDuReleve =>
  new ElementDuReleve({
    id: new ElementReleveId(fiche.id ?? 'element-1'),
    type: fiche.type ?? 'PRODUIT',
    nom: fiche.nom ?? 'PRD-2026-000015',
    reference: fiche.reference,
    description: fiche.description,
    duree: new DureeTravaillee(fiche.duree ?? 'PT0S'),
    dureeNonConformite: new DureeTravaillee(fiche.dureeNonConformite ?? 'PT0S'),
    dureePresumee: new DureeTravaillee(fiche.dureePresumee ?? 'PT0S'),
    postes: (fiche.postes ?? []).map(
      ([libelle, nature, id], rang) => new PosteDeLElement(new PosteReleveId(id ?? `poste-${String(rang)}`), libelle, nature),
    ),
  });

export const releveFixture = (
  semaine: SemaineISO,
  jours: Readonly<Record<number, JourFixture>>,
  totaux: TotauxFixture = {},
  elements: readonly ElementDuReleve[] = [],
): ReleveDesHeures =>
  new ReleveDesHeures(semaine, {
    elements,
    operateur: new IdentiteOperateur('Dupont', 'Jean'),
    presencePointee: new DureeTravaillee('PT7H30M'),
    presencePresumee: new DureeTravaillee(totaux.presencePresumee ?? 'PT0S'),
    operationnelPointe: new DureeTravaillee(totaux.operationnelle ?? 'PT0S'),
    operationnelPresume: new DureeTravaillee(totaux.operationnellePresumee ?? 'PT0S'),
    jours: semaine.jours().map((jour, rang) => jourFixture(jour, rang, jours[rang] ?? {})),
  });

export const jourTravailleFixture: JourFixture = {
  pointages: [
    ['ARRIVEE', [8, 2]],
    ['DEPART', [12, 0]],
    ['ARRIVEE', [13, 0]],
    ['DEPART', [17, 32]],
  ],
  plages: [
    [
      [8, 2],
      [12, 0],
    ],
    [
      [13, 0],
      [17, 32],
    ],
  ],
};

export const jourAbandonneFixture: JourFixture = {
  pointages: [['ARRIVEE', [10, 20]]],
  plages: [[[10, 20], [15, 40], true]],
};
