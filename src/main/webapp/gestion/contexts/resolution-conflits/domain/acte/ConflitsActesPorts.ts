import { AdresseDossier, DossierConflit } from '../dossier/DossierConflit';
import { ActeResolution } from './ActeResolution';
import { ReferenceApercu } from './ResolutionDuConflit';

export interface ApercuConflit extends ReferenceApercu {
  readonly acte: ActeResolution;
  readonly avant: DossierConflit;
  readonly apres: DossierConflit;
}

export type ResultatApercu =
  | { readonly kind: 'APERCU'; readonly apercu: ApercuConflit }
  | { readonly kind: 'REFUS' | 'LIMITATION'; readonly raison: string }
  | { readonly kind: 'CONCURRENCE' };

export type ResultatApplication =
  | { readonly kind: 'APPLIQUE'; readonly dossier: DossierConflit }
  | { readonly kind: 'CONCURRENCE' }
  | { readonly kind: 'ISSUE_INCONNUE' }
  | { readonly kind: 'ECHEC_CERTAIN' }
  | { readonly kind: 'REFUS'; readonly raison: string };

export type ResultatVerification =
  | { readonly kind: 'ATTESTE'; readonly dossier: DossierConflit }
  | { readonly kind: 'NON_ATTESTE' }
  | { readonly kind: 'REFUS'; readonly raison: string };

export abstract class PrevisualisationConflitPort {
  abstract preview(adresse: AdresseDossier, version: number, acte: ActeResolution): Promise<ResultatApercu>;
}

export abstract class ApplicationActePort {
  abstract apply(apercu: ReferenceApercu): Promise<ResultatApplication>;
  abstract verify(apercu: ReferenceApercu): Promise<ResultatVerification>;
}
