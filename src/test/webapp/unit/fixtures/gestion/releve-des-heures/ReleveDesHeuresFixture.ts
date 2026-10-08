import { DureeTravaillee } from '@/gestion/contexts/releve-des-heures/domain/duree/DureeTravaillee';
import { TotalDeDuree } from '@/gestion/contexts/releve-des-heures/domain/duree/TotalDeDuree';
import { ActiviteDuReleve } from '@/gestion/contexts/releve-des-heures/domain/element/ActiviteDuReleve';
import { CategorieDActivite } from '@/gestion/contexts/releve-des-heures/domain/element/CategorieDActivite';
import { CategorieDElement } from '@/gestion/contexts/releve-des-heures/domain/element/CategorieDElement';
import { ElementDuReleve } from '@/gestion/contexts/releve-des-heures/domain/element/ElementDuReleve';
import { ElementReleveId } from '@/gestion/contexts/releve-des-heures/domain/element/ElementReleveId';
import { IntervalleDActivite } from '@/gestion/contexts/releve-des-heures/domain/element/IntervalleDActivite';
import { PosteDeLElement } from '@/gestion/contexts/releve-des-heures/domain/element/PosteDeLElement';
import { PosteReleveId } from '@/gestion/contexts/releve-des-heures/domain/element/PosteReleveId';
import { ActiviteReleveId } from '@/gestion/contexts/releve-des-heures/domain/releve/ActiviteReleveId';
import { CibleDePointage } from '@/gestion/contexts/releve-des-heures/domain/releve/CibleDePointage';
import { IdentiteOperateur } from '@/gestion/contexts/releve-des-heures/domain/releve/IdentiteOperateur';
import { InstantDeReleve } from '@/gestion/contexts/releve-des-heures/domain/releve/InstantDeReleve';
import { JourDeReleve } from '@/gestion/contexts/releve-des-heures/domain/releve/JourDeReleve';
import { PointageDElement } from '@/gestion/contexts/releve-des-heures/domain/releve/PointageDElement';
import { PointageReleveId } from '@/gestion/contexts/releve-des-heures/domain/releve/PointageReleveId';
import { ReleveDesHeures } from '@/gestion/contexts/releve-des-heures/domain/releve/ReleveDesHeures';
import { TypeDePointage } from '@/gestion/contexts/releve-des-heures/domain/releve/TypeDePointage';
import { JourCalendaire } from '@/gestion/contexts/releve-des-heures/domain/semaine/JourCalendaire';
import { SemaineISO } from '@/gestion/contexts/releve-des-heures/domain/semaine/SemaineISO';

export const OPERATEUR = 'op-1';
export const SEMAINE_EN_COURS = new SemaineISO(2026, 38);
export type Heure = readonly [number, number];

export const instantFixture = (rang: number, [heure, minute]: Heure): InstantDeReleve =>
  new InstantDeReleve(new Date(2026, 8, 14 + rang, heure, minute).toISOString());

export const totalFixture = (valeur: string | false = 'PT0S'): TotalDeDuree =>
  valeur === false ? TotalDeDuree.incomplet() : TotalDeDuree.complet(new DureeTravaillee(valeur));

export const activiteFixture = (debut: InstantDeReleve, fin: InstantDeReleve | undefined, id = 'activite-fixture'): ActiviteDuReleve =>
  fin === undefined
    ? { id: new ActiviteReleveId(id), debut, etat: 'EN_COURS' }
    : { id: new ActiviteReleveId(id), debut, etat: 'TERMINEE', fin };

export interface IntervalleFixture {
  readonly element?: string;
  readonly poste?: string;
  readonly categorie?: CategorieDActivite;
  readonly debut: Heure;
  readonly fin?: Heure;
  readonly activite?: ActiviteDuReleve;
}

export interface PointageDElementFixture {
  readonly id?: string;
  readonly type: TypeDePointage;
  readonly heure: Heure;
  readonly element?: string;
  readonly poste?: string;
}

export interface JourFixture {
  readonly intervalles?: readonly IntervalleFixture[];
  readonly pointagesDElement?: readonly PointageDElementFixture[];
  readonly operationnelle?: string | false;
  readonly journal?: readonly PointageDElementFixture[];
}

const instantDuJourFixture = (jour: JourCalendaire, [heure, minute]: Heure): InstantDeReleve =>
  new InstantDeReleve(new Date(`${jour.value}T${String(heure).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`).toISOString());

export const pointageFixture = (rang: number, pointage: PointageDElementFixture, jour?: JourCalendaire): PointageDElement =>
  new PointageDElement({
    id: new PointageReleveId(pointage.id ?? `${pointage.element ?? 'element-1'}:${String(rang)}:${pointage.heure.join(':')}`),
    type: pointage.type,
    instant: jour === undefined ? instantFixture(rang, pointage.heure) : instantDuJourFixture(jour, pointage.heure),
    cible: new CibleDePointage(
      new ElementReleveId(pointage.element ?? 'element-1'),
      pointage.poste === undefined ? undefined : new PosteReleveId(pointage.poste),
    ),
  });

export const jourFixture = (jour: JourCalendaire, rang: number, fiche: JourFixture): JourDeReleve =>
  new JourDeReleve({
    jour,
    operationnelTotal: totalFixture(fiche.operationnelle),
    intervalles: (fiche.intervalles ?? []).map(intervalle => {
      const debut = instantDuJourFixture(jour, intervalle.debut);
      const fin = intervalle.fin === undefined ? undefined : instantDuJourFixture(jour, intervalle.fin);
      return new IntervalleDActivite({
        element: new ElementReleveId(intervalle.element ?? 'element-1'),
        poste: intervalle.poste === undefined ? undefined : new PosteReleveId(intervalle.poste),
        nature: undefined,
        categorie: intervalle.categorie ?? 'TRAVAIL',
        debut,
        fin,
        activite: intervalle.activite ?? activiteFixture(debut, fin),
      });
    }),
    pointages: (fiche.journal ?? fiche.pointagesDElement ?? []).map(pointage => pointageFixture(rang, pointage, jour)),
  });

export interface TotauxFixture {
  readonly operationnelle?: string | false;
}

export interface ElementFixture {
  readonly id?: string;
  readonly categorie?: string;
  readonly nom?: string;
  readonly reference?: string;
  readonly description?: string;
  readonly postes?: readonly (readonly [string, string | undefined, string?])[];
  readonly duree?: string | false;
  readonly dureeNonConformite?: string | false;
}

export const elementFixture = (fiche: ElementFixture = {}): ElementDuReleve =>
  new ElementDuReleve({
    id: new ElementReleveId(fiche.id ?? 'element-1'),
    categorie: new CategorieDElement(fiche.categorie ?? 'MOULE'),
    nom: fiche.nom ?? 'PRD-2026-000015',
    reference: fiche.reference,
    description: fiche.description,
    duree: totalFixture(fiche.duree),
    dureeNonConformite: totalFixture(fiche.dureeNonConformite),
    postes: (fiche.postes ?? []).map(
      ([libelle, nature, id], rang) => new PosteDeLElement(new PosteReleveId(id ?? `poste-${String(rang)}`), libelle, nature),
    ),
  });

export const releveFixture = (
  semaine: SemaineISO,
  jours: Readonly<Record<number, JourFixture>>,
  totaux: TotauxFixture = {},
  elements: readonly ElementDuReleve[] = [elementFixture()],
): ReleveDesHeures =>
  new ReleveDesHeures(semaine, {
    elements,
    operateur: new IdentiteOperateur('Dupont', 'Jean'),
    operationnelTotal: totalFixture(totaux.operationnelle),
    jours: semaine.jours().map((jour, rang) => jourFixture(jour, rang, jours[rang] ?? {})),
  });

export const jourTravailleFixture: JourFixture = {
  pointagesDElement: [
    { type: 'DEBUT', heure: [8, 2] },
    { type: 'FIN', heure: [12, 0] },
    { type: 'DEBUT', heure: [13, 0] },
    { type: 'FIN', heure: [17, 32] },
  ],
  intervalles: [
    { debut: [8, 2], fin: [12, 0] },
    { debut: [13, 0], fin: [17, 32] },
  ],
};
