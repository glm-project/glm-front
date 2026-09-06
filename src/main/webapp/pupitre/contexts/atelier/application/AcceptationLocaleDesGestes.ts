import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { FenetreOperateur, GestesDePointage } from '@/pupitre/contexts/atelier/domain/designation/FenetreOperateur';
import { GesteDAtelier } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { inject, Injectable } from '@angular/core';

@Injectable()
export class AcceptationLocaleDesGestes {
  private readonly authentication = inject(AuthenticationPort);
  private readonly journal = inject(JournauxDuPupitrePort);
  private saisie: Promise<void> = Promise.resolve();

  capture(
    fenetreInitiale: FenetreOperateur,
    gestes: GestesDePointage,
    fenetreCourante: () => FenetreOperateur,
  ): Promise<readonly GesteDAtelier[]> {
    const accepted = this.saisie.then(() => this.persist(fenetreInitiale, gestes, fenetreCourante));
    this.saisie = accepted.then(() => undefined).catch(() => undefined);
    return accepted;
  }

  drain(): Promise<void> {
    return this.saisie;
  }

  private async persist(
    fenetreInitiale: FenetreOperateur,
    gestes: GestesDePointage,
    fenetreCourante: () => FenetreOperateur,
  ): Promise<readonly GesteDAtelier[]> {
    await this.authentication.synchronizeSession();
    fenetreInitiale.assertEntreprise(this.authentication.currentTenant());
    const captured = fenetreCourante().capture(gestes);
    await this.journal.append(fenetreInitiale.journalScope(), captured);
    return captured;
  }
}
