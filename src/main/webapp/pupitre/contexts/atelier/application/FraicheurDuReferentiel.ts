import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { inject, Injectable } from '@angular/core';
import { Matricule } from '../domain/designation/Matricule';
import { Entreprise } from '../domain/journal-du-pupitre/Entreprise';
import { JournalDuPupitre } from '../domain/journal-du-pupitre/JournalDuPupitre';
import { EtatHorsLigneDuPupitre } from './EtatHorsLigneDuPupitre';

export type ApplicationDuReferentiel = (entreprise: Entreprise | undefined, state: JournalDuPupitre) => void;

@Injectable()
export class FraicheurDuReferentiel {
  private readonly etatHorsLigne = inject(EtatHorsLigneDuPupitre);
  private readonly errorHandler = inject(ErrorHandlerPort);
  private matriculeRetenu: string | undefined;

  refresh(apply: ApplicationDuReferentiel): Promise<void> {
    return this.etatHorsLigne.refresh('SYNCHRONIZE', apply);
  }

  push(apply: ApplicationDuReferentiel): void {
    this.observe(this.refresh(apply));
  }

  pushForUnknown(code: Matricule, apply: ApplicationDuReferentiel): void {
    if (code.identifies(this.matriculeRetenu)) return;
    this.matriculeRetenu = code.toString();
    this.push(apply);
  }

  release(): void {
    this.matriculeRetenu = undefined;
  }

  private observe(operation: Promise<void>): void {
    void operation.catch((failure: unknown) => {
      this.errorHandler.handleError(failure);
    });
  }
}
