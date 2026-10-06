import { AdresseDossier, DossierAnomalie } from '../dossier/DossierAnomalie';
import { ActeResolution } from './ActeResolution';
import { PropositionResolution } from './ResolutionDeLAnomalie';

export const CODES_REFUS_ACTE = [
  'proposition-invalide',
  'confirmation-reutilisee',
  'suivi-d-atelier-introuvable',
  'suivi-d-atelier-cloture',
  'evenement-d-atelier-introuvable',
  'operateur-introuvable',
  'poste-de-travail-introuvable',
  'activite-visee-introuvable',
  'operateur-non-habilite',
  'activite-visee-incoherente',
  'evenement-deja-annule',
  'evenement-anterieur-a-l-engagement',
  'identifiant-evenement-reutilise',
  'date-de-survenue-future',
] as const;

export type CodeRefusActe = (typeof CODES_REFUS_ACTE)[number];

export interface RefusActe {
  readonly kind: 'REFUS';
  readonly code: CodeRefusActe;
}

export interface ApercuAnomalie extends PropositionResolution {
  readonly evaluation: string;
  readonly avant: DossierAnomalie;
  readonly apres: DossierAnomalie;
}

export type ResultatApercu = { readonly kind: 'APERCU'; readonly apercu: ApercuAnomalie } | RefusActe | { readonly kind: 'CONCURRENCE' };

export type ResultatApplication =
  | { readonly kind: 'APPLIQUE'; readonly dossier: DossierAnomalie }
  | { readonly kind: 'CONCURRENCE' }
  | { readonly kind: 'ISSUE_INCONNUE' }
  | RefusActe;

export type ResultatVerification =
  { readonly kind: 'ATTESTE'; readonly dossier: DossierAnomalie } | { readonly kind: 'NON_ATTESTE' } | RefusActe;

export abstract class PrevisualisationAnomaliePort {
  abstract preview(adresse: AdresseDossier, version: number, acte: ActeResolution): Promise<ResultatApercu>;
}

export abstract class ApplicationActePort {
  abstract apply(apercu: PropositionResolution): Promise<ResultatApplication>;
  abstract verify(apercu: PropositionResolution): Promise<ResultatVerification>;
}
