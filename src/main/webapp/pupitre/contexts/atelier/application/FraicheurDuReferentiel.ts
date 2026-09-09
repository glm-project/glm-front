import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { inject, Injectable } from '@angular/core';
import { Entreprise } from '../domain/journal-du-pupitre/Entreprise';
import { JournalDuPupitre } from '../domain/journal-du-pupitre/JournalDuPupitre';
import { EtatHorsLigneDuPupitre } from './EtatHorsLigneDuPupitre';

export type ApplicationDuReferentiel = (entreprise: Entreprise | undefined, state: JournalDuPupitre) => void;

@Injectable()
export class FraicheurDuReferentiel {
  private readonly etatHorsLigne = inject(EtatHorsLigneDuPupitre);
  private readonly errorHandler = inject(ErrorHandlerPort);

  refresh(apply: ApplicationDuReferentiel): Promise<void> {
    return this.etatHorsLigne.refresh('SYNCHRONIZE', apply);
  }

  push(apply: ApplicationDuReferentiel): void {
    this.observe(this.refresh(apply));
  }

  private observe(operation: Promise<void>): void {
    void operation.catch((failure: unknown) => {
      this.errorHandler.handleError(failure);
    });
  }
}
