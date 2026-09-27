export class Montant {
  constructor(readonly euros: number) {
    const erreur = Montant.erreur(euros);
    if (erreur !== undefined) {
      throw new Error(erreur);
    }
  }

  static erreur(euros: number): string | undefined {
    if (!Number.isFinite(euros)) {
      return Montant.messageDeRefus(euros);
    }
    if (euros < 0) {
      return Montant.messageDeRefus(euros);
    }
    return undefined;
  }

  private static messageDeRefus(euros: number): string {
    return `Le montant « ${String(euros)} » reçu du serveur n’est pas un montant en euros.`;
  }
}
