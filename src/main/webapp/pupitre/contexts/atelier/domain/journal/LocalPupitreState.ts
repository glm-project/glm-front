import { TypeDePresence } from '../journee-de-travail/TypeDePresence';
import { EtatDAtelier } from '../suivi-d-atelier/EtatDAtelier';
import { TypeDElement } from '../suivi-d-atelier/TypeDElement';
import { TypeDePointage } from '../suivi-d-atelier/TypeDePointage';

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

export interface LocalArrivee extends IdentiteDuGeste {
  nature: 'ARRIVEE';
  operateurId: string;
}

export interface LocalPresence extends IdentiteDuGeste {
  nature: 'PRESENCE';
  operateurId: string;
  type: TypeDePresence;
  implicite: boolean;
}

export interface LocalPointage extends IdentiteDuGeste {
  nature: 'POINTAGE';
  operateurId: string;
  suiviId: string;
  type: TypeDePointage;
  posteId?: string;
}

export type LocalGeste = LocalArrivee | LocalPresence | LocalPointage;

export interface LocalEvent {
  geste: LocalGeste;
  etat: 'EN_ATTENTE' | 'ACCEPTE' | 'REFUSE';
  refus?: { code: string; message: string };
}

export interface LocalPupitreState {
  referentiel?: ReferentielDuPupitre;
  evenements: LocalEvent[];
  connecte: boolean;
}

export const EMPTY_PUPITRE: LocalPupitreState = { evenements: [], connecte: true };
