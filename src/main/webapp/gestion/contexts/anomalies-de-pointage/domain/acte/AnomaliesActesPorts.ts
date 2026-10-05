import { AdresseDossier, DossierAnomalie } from '../dossier/DossierAnomalie';
import { ActeResolution } from './ActeResolution';
import { PropositionResolution } from './ResolutionDeLAnomalie';

export interface ApercuAnomalie extends PropositionResolution {
  readonly evaluation: string;
  readonly avant: DossierAnomalie;
  readonly apres: DossierAnomalie;
}

export type ResultatApercu =
  | { readonly kind: 'APERCU'; readonly apercu: ApercuAnomalie }
  | { readonly kind: 'REFUS'; readonly raison: string }
  | { readonly kind: 'CONCURRENCE' };

export type ResultatApplication =
  | { readonly kind: 'APPLIQUE'; readonly dossier: DossierAnomalie }
  | { readonly kind: 'CONCURRENCE' }
  | { readonly kind: 'ISSUE_INCONNUE' }
  | { readonly kind: 'REFUS'; readonly raison: string };

export type ResultatVerification =
  | { readonly kind: 'ATTESTE'; readonly dossier: DossierAnomalie }
  | { readonly kind: 'NON_ATTESTE' }
  | { readonly kind: 'REFUS'; readonly raison: string };

export abstract class PrevisualisationAnomaliePort {
  abstract preview(adresse: AdresseDossier, version: number, acte: ActeResolution): Promise<ResultatApercu>;
}

export abstract class ApplicationActePort {
  abstract apply(apercu: PropositionResolution): Promise<ResultatApplication>;
  abstract verify(apercu: PropositionResolution): Promise<ResultatVerification>;
}
