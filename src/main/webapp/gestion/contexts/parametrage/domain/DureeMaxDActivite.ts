const MINIMUM = 1;
const MAXIMUM = 24;
const HEURES_PAR_JOUR = 24;

export interface ArretDUneActivite {
  readonly heure: number;
  readonly lendemain: boolean;
}

export class DureeMaxDActivite {
  constructor(readonly heures: number) {
    const erreur = DureeMaxDActivite.erreur(heures);
    if (erreur !== undefined) {
      throw new Error(erreur);
    }
  }

  static erreur(heures: number): string | undefined {
    if (!Number.isInteger(heures)) return 'Saisissez un nombre entier d’heures.';
    if (heures < MINIMUM) return 'La durée doit être d’au moins 1 h.';
    if (heures > MAXIMUM) return 'La durée ne peut pas dépasser 24 h.';
    return undefined;
  }

  arretDUneActiviteCommenceeA(heureDeDebut: number): ArretDUneActivite {
    const arret = heureDeDebut + this.heures;
    return { heure: arret % HEURES_PAR_JOUR, lendemain: arret >= HEURES_PAR_JOUR };
  }
}
