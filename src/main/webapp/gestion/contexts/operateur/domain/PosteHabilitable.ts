import { PosteHabilitableId } from './PosteHabilitableId';

export interface DescriptionDePoste {
  readonly libelle: string;
  readonly nature: string;
}

const normalise = (value: string): string => value.trim().toLocaleLowerCase('fr');

export class PosteHabilitable {
  readonly libelle: string;
  readonly nature: string;

  constructor(
    readonly id: PosteHabilitableId,
    description: DescriptionDePoste,
  ) {
    this.libelle = description.libelle;
    this.nature = description.nature;
  }

  compare(other: PosteHabilitable): number {
    return this.libelle.localeCompare(other.libelle, 'fr');
  }

  correspondA(recherche: string): boolean {
    const terme = normalise(recherche);
    const libelleCorrespond = normalise(this.libelle).includes(terme);
    const natureCorrespond = normalise(this.nature).includes(terme);
    return libelleCorrespond || natureCorrespond;
  }
}
