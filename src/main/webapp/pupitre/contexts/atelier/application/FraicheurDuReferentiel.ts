import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { inject, Injectable } from '@angular/core';
import { Identifiant } from '../domain/designation/Identifiant';
import { Entreprise } from '../domain/journal-du-pupitre/Entreprise';
import { JournalDuPupitre } from '../domain/journal-du-pupitre/JournalDuPupitre';
import { EtatHorsLigneDuPupitre } from './EtatHorsLigneDuPupitre';

export type ApplicationDuReferentiel = (entreprise: Entreprise | undefined, state: JournalDuPupitre) => void;

@Injectable()
export class FraicheurDuReferentiel {
  private readonly etatHorsLigne = inject(EtatHorsLigneDuPupitre);
  private readonly errorHandler = inject(ErrorHandlerPort);
  private identifiantRetenu: Identifiant | undefined;

  refresh(apply: ApplicationDuReferentiel): Promise<void> {
    return this.etatHorsLigne.refresh('SYNCHRONIZE', apply);
  }

  push(apply: ApplicationDuReferentiel): void {
    this.errorHandler.observe(this.refresh(apply));
  }

  pushForUnknown(code: Identifiant, apply: ApplicationDuReferentiel): void {
    if (code.equals(this.identifiantRetenu)) return;
    this.identifiantRetenu = code;
    this.push(apply);
  }

  release(): void {
    this.identifiantRetenu = undefined;
  }
}
