const UN_CHIFFRE = /^\d$/;
const LONGUEUR_MAX = 6;

export class Identifiant {
  private constructor(private readonly valeur: string) {}

  static empty(): Identifiant {
    return new Identifiant('');
  }

  static accepts(caractere: string): boolean {
    return UN_CHIFFRE.test(caractere);
  }

  afterDigit(digit: string): Identifiant {
    if (this.valeur.length >= LONGUEUR_MAX) return this;
    return new Identifiant(`${this.valeur}${digit}`);
  }

  afterErasing(): Identifiant {
    return new Identifiant(this.valeur.slice(0, -1));
  }

  isEmpty(): boolean {
    return this.valeur.length === 0;
  }

  identifies(candidat: string | undefined): boolean {
    return this.valeur === candidat;
  }

  equals(other: Identifiant | undefined): boolean {
    return this.valeur === other?.valeur;
  }

  toString(): string {
    return this.valeur;
  }
}
