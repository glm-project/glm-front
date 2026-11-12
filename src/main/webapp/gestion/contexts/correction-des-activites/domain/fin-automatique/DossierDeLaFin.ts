import { ActiviteDeLaJourneeId } from '../journee/ActiviteDeLaJourneeId';
import { CategorieDActivite } from '../journee/CategorieDActivite';
import { PointageDuDossierId } from './PointageDuDossierId';

export type TypeDePointage = 'DEBUT' | 'NON_CONFORMITE' | 'FIN';

export interface PointageDuDossier {
  readonly id: PointageDuDossierId;
  readonly fait: { readonly type: TypeDePointage; readonly instant: string };
}

export interface ActiviteEchue {
  readonly id: ActiviteDeLaJourneeId;
  readonly ouvrant: PointageDuDossierId;
  readonly categorie: CategorieDActivite;
  readonly debut: string;
  readonly echeance: string;
}

export interface DossierDeLaFin {
  readonly journal: readonly PointageDuDossier[];
  readonly activite: ActiviteEchue;
  readonly borneDeFin?: string;
}

export type LectureDuDossierDeLaFin = { readonly kind: 'DOSSIER'; readonly dossier: DossierDeLaFin } | { readonly kind: 'INTROUVABLE' };
