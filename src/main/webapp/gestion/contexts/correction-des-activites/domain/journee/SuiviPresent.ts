import { ElementDeLaJournee } from './ElementDeLaJournee';
import { InstantDeLaJournee } from './InstantDeLaJournee';
import { SuiviDAtelierId } from './SuiviDAtelierId';

export interface FicheDeSuiviPresent {
  readonly suivi: SuiviDAtelierId;
  readonly element: ElementDeLaJournee;
  readonly engageLe: InstantDeLaJournee;
  readonly clotureLe: InstantDeLaJournee | undefined;
}

export class SuiviPresent {
  readonly suivi: SuiviDAtelierId;
  readonly element: ElementDeLaJournee;
  readonly engageLe: InstantDeLaJournee;
  readonly clotureLe: InstantDeLaJournee | undefined;

  constructor(fiche: FicheDeSuiviPresent) {
    this.suivi = fiche.suivi;
    this.element = fiche.element;
    this.engageLe = fiche.engageLe;
    this.clotureLe = fiche.clotureLe;
  }
}
