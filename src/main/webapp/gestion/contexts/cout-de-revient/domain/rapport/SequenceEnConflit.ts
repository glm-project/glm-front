import { ElementChiffreId } from '../element/ElementChiffreId';

export interface FicheDeSequence {
  readonly element: ElementChiffreId;
  readonly operateur: string;
  readonly poste: string | undefined;
  readonly activites: readonly string[];
  readonly pointages: readonly string[];
}

export class SequenceEnConflit {
  readonly element: ElementChiffreId;
  readonly operateur: string;
  readonly poste: string | undefined;
  readonly activites: readonly string[];
  readonly pointages: readonly string[];

  constructor(fiche: FicheDeSequence) {
    this.element = fiche.element;
    this.operateur = fiche.operateur;
    this.poste = fiche.poste;
    this.activites = [...fiche.activites];
    this.pointages = [...fiche.pointages];
  }
}
