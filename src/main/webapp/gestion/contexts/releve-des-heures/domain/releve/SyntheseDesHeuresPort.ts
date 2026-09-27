import { SemaineISO } from '../semaine/SemaineISO';
import { OperateurReleveId } from './OperateurReleveId';
import { ReleveDesHeures } from './ReleveDesHeures';

export class DemandeDeReleve {
  constructor(
    readonly operateur: OperateurReleveId,
    readonly semaine: SemaineISO,
  ) {}
}

export abstract class SyntheseDesHeuresPort {
  abstract synthese(demande: DemandeDeReleve): Promise<ReleveDesHeures | undefined>;
}
