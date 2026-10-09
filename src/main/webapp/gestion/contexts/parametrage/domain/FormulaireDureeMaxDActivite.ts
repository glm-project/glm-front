import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { DureeMaxDActivite } from './DureeMaxDActivite';

const ENTIER = /^\d+$/;

export class FormulaireDureeMaxDActivite {
  private constructor(readonly saisie: string) {}

  static vide(): FormulaireDureeMaxDActivite {
    return new FormulaireDureeMaxDActivite('');
  }

  static depuis(duree: DureeMaxDActivite): FormulaireDureeMaxDActivite {
    return new FormulaireDureeMaxDActivite(String(duree.heures));
  }

  avecSaisie(saisie: string): FormulaireDureeMaxDActivite {
    return new FormulaireDureeMaxDActivite(saisie);
  }

  erreur(): string | undefined {
    const saisie = this.saisie.trim();
    if (!ENTIER.test(saisie)) return 'Saisissez un nombre entier d’heures.';
    return DureeMaxDActivite.erreur(Number(saisie));
  }

  produireDuree(): Result<DureeMaxDActivite, string> {
    const erreur = this.erreur();
    return erreur === undefined ? ok(new DureeMaxDActivite(Number(this.saisie.trim()))) : err(erreur);
  }
}
