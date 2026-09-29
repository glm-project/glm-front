import { SemaineISO } from '../semaine/SemaineISO';
import { OperateurReleveId } from './OperateurReleveId';
import { ReleveDesHeures } from './ReleveDesHeures';

export class DemandeDeReleve {
  constructor(
    readonly operateur: OperateurReleveId,
    readonly semaine: SemaineISO,
  ) {}

  estLaMeme(autre: DemandeDeReleve | undefined): boolean {
    return autre !== undefined && this.operateur.value === autre.operateur.value && this.semaine.estLaMeme(autre.semaine);
  }
}

export abstract class SyntheseDesHeuresPort {
  abstract synthese(demande: DemandeDeReleve): Promise<ReleveDesHeures | undefined>;
}
