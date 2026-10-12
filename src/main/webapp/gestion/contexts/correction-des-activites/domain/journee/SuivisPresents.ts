import { SuiviDAtelierId } from './SuiviDAtelierId';
import { SuiviPresent } from './SuiviPresent';

export class SuivisPresents {
  readonly suivis: readonly SuiviPresent[];

  constructor(suivis: readonly SuiviPresent[]) {
    this.suivis = [...suivis];
  }

  de(suivi: SuiviDAtelierId): SuiviPresent | undefined {
    return this.suivis.find(present => present.suivi.value === suivi.value);
  }
}
