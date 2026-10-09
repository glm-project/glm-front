import { ActiviteAnomalieId } from './ActiviteAnomalieId';
import { ElementAnomalieId } from './ElementAnomalieId';
import { OperateurAnomalieId } from './OperateurAnomalieId';
import { PointageAnomalieId } from './PointageAnomalieId';
import { SuiviAnomalieId } from './SuiviAnomalieId';

export const PAGE_SIZE_ANOMALIES = 5;

export type TypePointage = 'DEBUT' | 'NON_CONFORMITE' | 'FIN';

export interface AdresseDossier {
  readonly suivi: SuiviAnomalieId;
  readonly pointage: PointageAnomalieId;
}

export interface FaitDePointage {
  readonly type: TypePointage;
  readonly operateur: string;
  readonly instant: string;
}

export interface PointageAnomalie {
  readonly id: PointageAnomalieId;
  readonly fait: FaitDePointage;
  readonly operateurNom: string;
}

export interface ActiviteEchue {
  readonly id: ActiviteAnomalieId;
  readonly ouvrant: PointageAnomalieId;
  readonly categorie: 'TRAVAIL' | 'NON_CONFORMITE';
  readonly debut: string;
  readonly echeance: string;
}

export interface LigneFinAutomatique {
  readonly adresse: AdresseDossier;
  readonly element: ElementAnomalieId;
  readonly designation: string;
  readonly operateur: string;
  readonly poste: string;
  readonly posteId?: string;
  readonly debut: string;
  readonly echeance: string;
}

export interface DossierAnomalie {
  readonly designation: string;
  readonly operateur: OperateurAnomalieId;
  readonly operateurNom: string;
  readonly posteLibelle: string;
  readonly posteId?: string;
  readonly journal: readonly PointageAnomalie[];
  readonly activite: ActiviteEchue;
  readonly borneDeFin?: string;
}

export type LectureDossier = { readonly kind: 'DOSSIER'; readonly dossier: DossierAnomalie } | { readonly kind: 'INTROUVABLE' };

export interface PageAnomalies {
  readonly lignes: readonly LigneFinAutomatique[];
  readonly total: number;
}

export interface FiltreAnomalies {
  readonly operateur: string;
  readonly element: string;
  readonly page: number;
}
