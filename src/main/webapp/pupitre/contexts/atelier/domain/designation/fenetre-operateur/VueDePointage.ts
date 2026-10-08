import { NumeroDElement } from '../NumeroDElement';

export interface ActiviteDePointage {
  readonly categorie: 'TRAVAIL' | 'NON_CONFORMITE';
  readonly dureeMs: number;
}

export class ElementDePointage {
  constructor(
    readonly id: string,
    readonly numero: NumeroDElement,
    private readonly activite: ActiviteDePointage | undefined,
  ) {}

  isActive(): boolean {
    return this.activite !== undefined;
  }

  isNonConforme(): boolean {
    return this.activite?.categorie === 'NON_CONFORMITE';
  }

  dureeMs(): number {
    return this.activite?.dureeMs ?? 0;
  }
}

export interface ZoneDePointage {
  readonly categorie: string;
  readonly elements: readonly ElementDePointage[];
}

export interface ElementCategorise {
  readonly element: ElementDePointage;
  readonly categorie: string;
}

export interface VueDePointage {
  readonly conflits: readonly { readonly id: string; readonly numero: NumeroDElement }[];
  readonly zones: readonly ZoneDePointage[];
}

export const zonesDePointage = (elements: readonly ElementCategorise[]): readonly ZoneDePointage[] =>
  [...new Set(elements.map(({ categorie }) => categorie))]
    .sort((gauche, droite) => gauche.localeCompare(droite))
    .map(categorie => ({
      categorie,
      elements: elements.filter(candidat => candidat.categorie === categorie).map(({ element }) => element),
    }));
