export type EtatDAtelier = 'EN_ATTENTE' | 'EN_COURS' | 'INTERROMPU' | 'CLOTURE';
export const ETATS_DU_REFERENTIEL_DU_PUPITRE: readonly EtatDAtelier[] = ['EN_ATTENTE', 'EN_COURS', 'INTERROMPU'];
export type TypeDElement = 'ORDRE_DE_FABRICATION' | 'PRODUIT';
export type TypeDePointage = 'DEBUT' | 'NON_CONFORMITE' | 'FIN';
export type TypeDePresence = 'PAUSE' | 'REPRISE' | 'DEPART';

export interface OperateurDuPupitre {
  id: string;
  nom: string;
  prenom: string;
  matricule?: string;
  postes: { id: string; libelle: string }[];
}

export interface ActiviteDuPupitre {
  operateurId: string;
  categorie: 'TRAVAIL' | 'NON_CONFORMITE';
  depuis: string;
  posteId?: string;
}

export interface SuiviDuPupitre {
  id: string;
  nom: string;
  reference?: string;
  etat: EtatDAtelier;
  type: TypeDElement;
  activites: ActiviteDuPupitre[];
  evenements: string[];
}

export interface ReferentielDuPupitre {
  operateurs: OperateurDuPupitre[];
  suivis: SuiviDuPupitre[];
}

export interface IdentiteDuGeste {
  id: string;
  dateDeSurvenue: string;
}

export interface GesteDArrivee extends IdentiteDuGeste {
  nature: 'ARRIVEE';
  operateurId: string;
}

export interface GesteDePresence extends IdentiteDuGeste {
  nature: 'PRESENCE';
  operateurId: string;
  type: TypeDePresence;
  implicite: boolean;
}

export interface GesteDePointage extends IdentiteDuGeste {
  nature: 'POINTAGE';
  operateurId: string;
  suiviId: string;
  type: TypeDePointage;
  posteId?: string;
}

export type GesteDAtelier = GesteDArrivee | GesteDePresence | GesteDePointage;

export interface EvenementDuJournal {
  geste: GesteDAtelier;
  etat: 'EN_ATTENTE' | 'ACCEPTE' | 'REFUSE';
  refus?: { code: string; message: string };
}

export interface JournalDuPupitre {
  referentiel?: ReferentielDuPupitre;
  evenements: EvenementDuJournal[];
  connecte: boolean;
}

export const EMPTY_JOURNAL_DU_PUPITRE: JournalDuPupitre = { evenements: [], connecte: true };
