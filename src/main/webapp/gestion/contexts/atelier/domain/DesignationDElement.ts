const nettoie = (valeur: string | undefined): string => valeur?.trim() ?? '';

export class DesignationDElement {
  readonly value: string;

  constructor(reference: string | undefined, nom: string) {
    const preferee = nettoie(reference);
    const repli = nettoie(nom);
    const valeur = preferee === '' ? repli : preferee;
    if (valeur === '') {
      throw new Error('Un élément se désigne par sa référence ou, à défaut, par son nom.');
    }
    this.value = valeur;
  }
}
