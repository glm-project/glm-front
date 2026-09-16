import { PosteHabilitableId } from './PosteHabilitableId';

export interface DescriptionDePoste {
  readonly libelle: string;
  readonly nature: string;
}

const RECHERCHE = new Intl.Collator('fr', { sensitivity: 'base', usage: 'search' });

const departsPossibles = (valeur: string, terme: string): number[] =>
  Array.from({ length: Math.max(valeur.length - terme.length + 1, 0) }, (_, index) => index);

const contient = (valeur: string, terme: string): boolean =>
  departsPossibles(valeur, terme).some(index => RECHERCHE.compare(valeur.slice(index, index + terme.length), terme) === 0);

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
    const terme = recherche.trim();
    const libelleCorrespond = contient(this.libelle, terme);
    const natureCorrespond = contient(this.nature, terme);
    return libelleCorrespond || natureCorrespond;
  }
}
