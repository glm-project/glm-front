import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Injectable } from '@angular/core';

@Injectable()
export class ConsoleErrorHandler extends ErrorHandlerPort {
  // Temporaire le temps de trouver une solution définitive pour la gestion des erreurs.
  override handleError(failure: unknown): void {
    console.error(failure);
  }
}
