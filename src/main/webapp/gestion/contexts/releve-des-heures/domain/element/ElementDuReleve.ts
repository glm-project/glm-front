import { DureeTravaillee } from '../duree/DureeTravaillee';
import { ElementReleveId } from './ElementReleveId';
import { PosteDeLElement } from './PosteDeLElement';
import { PosteReleveId } from './PosteReleveId';
import { TypeDElement } from './TypeDElement';

export interface FicheDElement {
  readonly id: ElementReleveId;
  readonly type: TypeDElement;
  readonly nom: string;
  readonly reference: string | undefined;
  readonly description: string | undefined;
  readonly duree: DureeTravaillee;
  readonly dureeNonConformite: DureeTravaillee;
  readonly dureePresumee: DureeTravaillee;
  readonly postes: readonly PosteDeLElement[];
}

export class ElementDuReleve {
  readonly id: ElementReleveId;
  readonly type: TypeDElement;
  readonly description: string | undefined;
  readonly duree: DureeTravaillee;
  readonly dureeNonConformite: DureeTravaillee;
  readonly dureePresumee: DureeTravaillee;
  readonly postes: readonly PosteDeLElement[];
  private readonly nom: string;
  private readonly reference: string | undefined;

  constructor(fiche: FicheDElement) {
    this.id = fiche.id;
    this.type = fiche.type;
    this.nom = fiche.nom;
    this.reference = fiche.reference;
    this.description = fiche.description;
    this.duree = fiche.duree;
    this.dureeNonConformite = fiche.dureeNonConformite;
    this.dureePresumee = fiche.dureePresumee;
    this.postes = [...fiche.postes];
  }

  numero(): string {
    return this.reference ?? this.nom;
  }

  porte(poste: PosteReleveId): boolean {
    return this.postes.some(candidat => candidat.id.value === poste.value);
  }

  libelleDuPoste(poste: PosteReleveId | undefined): string | undefined {
    return this.postes.find(candidat => candidat.id.value === poste?.value)?.libelle;
  }
}
