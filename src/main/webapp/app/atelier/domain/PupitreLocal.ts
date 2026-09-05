import { EtatDAtelier } from './EtatDAtelier';
import { TypeDElement } from './TypeDElement';
import { TypeDePointage } from './TypeDePointage';
import { TypeDePresence } from './TypeDePresence';

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

export interface ArriveeLocale extends IdentiteDuGeste {
  nature: 'ARRIVEE';
  operateurId: string;
}

export interface PresenceLocale extends IdentiteDuGeste {
  nature: 'PRESENCE';
  operateurId: string;
  type: TypeDePresence;
  implicite: boolean;
}

export interface PointageLocal extends IdentiteDuGeste {
  nature: 'POINTAGE';
  operateurId: string;
  suiviId: string;
  type: TypeDePointage;
  posteId?: string;
}

export type GesteLocal = ArriveeLocale | PresenceLocale | PointageLocal;

export interface EvenementLocal {
  geste: GesteLocal;
  etat: 'EN_ATTENTE' | 'ACCEPTE' | 'REFUSE';
  refus?: { code: string; message: string };
}

export interface PupitreLocal {
  referentiel?: ReferentielDuPupitre;
  evenements: EvenementLocal[];
  connecte: boolean;
}

export const PUPITRE_VIDE: PupitreLocal = { evenements: [], connecte: true };
