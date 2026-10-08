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

const rangDans =
  (ordre: readonly string[]) =>
  (categorie: string): number => {
    const rang = ordre.indexOf(categorie);
    return rang === -1 ? ordre.length : rang;
  };

const comparerDans =
  (ordre: readonly string[]) =>
  (gauche: string, droite: string): number =>
    rangDans(ordre)(gauche) - rangDans(ordre)(droite) || gauche.localeCompare(droite);

export const zonesDePointage = (elements: readonly ElementCategorise[], ordre: readonly string[]): readonly ZoneDePointage[] =>
  [...new Set(elements.map(({ categorie }) => categorie))].sort(comparerDans(ordre)).map(categorie => ({
    categorie,
    elements: elements.filter(candidat => candidat.categorie === categorie).map(({ element }) => element),
  }));
