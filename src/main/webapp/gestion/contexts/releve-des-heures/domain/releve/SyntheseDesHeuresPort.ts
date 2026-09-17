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
  /** Rend `undefined` quand le référentiel ne connaît pas cet opérateur : c'est une réponse, pas une panne. */
  abstract synthese(demande: DemandeDeReleve): Promise<ReleveDesHeures | undefined>;
}
