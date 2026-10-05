import { FaitPropose } from '../acte/ActeResolution';
import { SaisieActe } from '../acte/SaisieActe';
import { ActiviteAnomalieId } from './ActiviteAnomalieId';
import { ElementAnomalieId } from './ElementAnomalieId';
import { PointageAnomalieId } from './PointageAnomalieId';
import { SuiviAnomalieId } from './SuiviAnomalieId';

export const PAGE_SIZE_ANOMALIES = 5;

export interface AdresseDossier {
  readonly suivi: SuiviAnomalieId;
  readonly pointage: PointageAnomalieId;
}

export interface PointageAnomalie {
  readonly id: PointageAnomalieId;
  readonly fait: FaitPropose;
  readonly activiteCreee?: ActiviteAnomalieId;
  readonly auteur: string;
  readonly enregistre: string;
  readonly regularisation: boolean;
  readonly annulation?: { readonly motif: string; readonly auteur: string; readonly instant: string };
  readonly remplace?: PointageAnomalieId;
}

export interface ActiviteAnomalie {
  readonly id: ActiviteAnomalieId;
  readonly libelle: string;
  readonly etat: 'A_RESOUDRE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE' | 'REMPLACEE' | 'ECHUE';
  readonly temps: string;
  readonly periode?: {
    readonly categorie: 'TRAVAIL' | 'NON_CONFORMITE';
    readonly debut: string;
    readonly fin?: string;
    readonly duree?: string;
  };
}

export interface DiagnosticConflit {
  readonly pointage: PointageAnomalieId;
  readonly raison:
    | 'CIBLE_REMPLACEE'
    | 'CIBLE_DEJA_TERMINEE'
    | 'GESTE_AVANT_OUVERTURE'
    | 'OUVRANT_ANNULE'
    | 'TRANSITION_MEME_CATEGORIE'
    | 'CIBLE_ECHUE_AVEC_AUTRE_ACTIVITE'
    | 'CONTRADICTION_REGULARISATION';
  readonly cible: {
    readonly activite: ActiviteAnomalieId;
    readonly ouvrant?: PointageAnomalieId;
    readonly termineePar?: PointageAnomalieId;
  };
}

export interface ChoixGuide {
  readonly id: string;
  readonly code?: 'RATTACHER_FIN_A_ACTIVITE_REMPLACANTE' | 'ANNULER_TRANSITION';
  readonly libelle: string;
  readonly explication: string;
  readonly saisie: SaisieActe;
}

export interface LigneConflit {
  readonly adresse: AdresseDossier;
  readonly element: ElementAnomalieId;
  readonly designation: string;
  readonly operateur: string;
  readonly operateurId?: string;
  readonly poste: string;
  readonly posteId?: string;
  readonly date: string;
  readonly explication: string;
  readonly nombrePointages: number;
}

export interface DossierAnomalie {
  readonly ligne: LigneConflit;
  readonly version: number;
  readonly cloture: boolean;
  readonly engagement: string;
  readonly finCloture?: string;
  readonly journal: readonly PointageAnomalie[];
  readonly activites: readonly ActiviteAnomalie[];
  readonly choix: readonly ChoixGuide[];
  readonly enConflit: boolean;
  readonly consequences: readonly string[];
  readonly continuations: readonly LigneConflit[];
  readonly diagnostics?: readonly DiagnosticConflit[];
}

export type LectureDossier =
  | { readonly kind: 'DOSSIER'; readonly dossier: DossierAnomalie }
  | { readonly kind: 'INTROUVABLE' | 'ANCRE_ANNULEE' | 'HORS_CONFLIT'; readonly journal: readonly PointageAnomalie[] };

export interface PageAnomalies {
  readonly lignes: readonly LigneConflit[];
  readonly total: number;
  readonly complete: boolean;
}

export interface FiltreAnomalies {
  readonly operateur: string;
  readonly element: string;
  readonly page: number;
}
