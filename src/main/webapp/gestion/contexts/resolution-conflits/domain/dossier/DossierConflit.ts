import { FaitPropose } from '../acte/ActeResolution';
import { SaisieActe } from '../acte/SaisieActe';
import { ActiviteConflitId } from './ActiviteConflitId';
import { ElementConflitId } from './ElementConflitId';
import { PointageConflitId } from './PointageConflitId';
import { SuiviConflitId } from './SuiviConflitId';

export const PAGE_SIZE_CONFLITS = 5;

export interface AdresseDossier {
  readonly suivi: SuiviConflitId;
  readonly pointage: PointageConflitId;
}

export interface PointageConflit {
  readonly id: PointageConflitId;
  readonly fait: FaitPropose;
  readonly activiteCreee?: ActiviteConflitId;
  readonly auteur: string;
  readonly enregistre: string;
  readonly regularisation: boolean;
  readonly annulation?: { readonly motif: string; readonly auteur: string; readonly instant: string };
  readonly remplace?: PointageConflitId;
}

export interface ActiviteConflit {
  readonly id: ActiviteConflitId;
  readonly libelle: string;
  readonly etat: 'A_RESOUDRE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE' | 'REMPLACEE' | 'ECHUE';
  readonly temps: string;
}

export interface ChoixGuide {
  readonly id: string;
  readonly libelle: string;
  readonly explication: string;
  readonly saisie: SaisieActe;
}

export interface LigneConflit {
  readonly adresse: AdresseDossier;
  readonly element: ElementConflitId;
  readonly designation: string;
  readonly operateur: string;
  readonly poste: string;
  readonly date: string;
  readonly explication: string;
  readonly nombrePointages: number;
}

export interface DossierConflit {
  readonly ligne: LigneConflit;
  readonly version: number;
  readonly cloture: boolean;
  readonly engagement: string;
  readonly finCloture?: string;
  readonly journal: readonly PointageConflit[];
  readonly activites: readonly ActiviteConflit[];
  readonly choix: readonly ChoixGuide[];
  readonly enConflit: boolean;
  readonly consequences: readonly string[];
  readonly continuations: readonly LigneConflit[];
}

export type LectureDossier =
  | { readonly kind: 'DOSSIER'; readonly dossier: DossierConflit }
  | { readonly kind: 'INTROUVABLE' | 'ANCRE_ANNULEE' | 'HORS_CONFLIT'; readonly journal: readonly PointageConflit[] };

export interface PageConflits {
  readonly lignes: readonly LigneConflit[];
  readonly total: number;
  readonly complete: boolean;
}

export interface FiltreConflits {
  readonly operateur: string;
  readonly element: string;
  readonly page: number;
}
