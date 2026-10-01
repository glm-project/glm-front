const CHIFFRES = /^\d{1,6}$/;
const LONGUEUR_MAX = 6;

export class Identifiant {
  readonly value: string;

  constructor(value: string) {
    const erreur = Identifiant.erreur(value);
    if (erreur !== undefined) {
      throw new Error(erreur);
    }
    this.value = value.trim();
  }

  static erreur(value: string): string | undefined {
    return CHIFFRES.test(value.trim()) ? undefined : "L'identifiant contient de 1 à 6 chiffres.";
  }

  static saisie(frappe: string): string {
    return frappe.replace(/\D/g, '').slice(0, LONGUEUR_MAX);
  }
}
