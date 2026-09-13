import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { inject } from '@angular/core';
import { DonneesDeSupervision, DonneesDeSupervisionPort } from '../../domain/DonneesDeSupervisionPort';

export class InMemoryDonneesDeSupervision extends DonneesDeSupervisionPort {
  private readonly errorHandler = inject(ErrorHandlerPort);
  private readonly donnees: DonneesDeSupervision | Error;

  constructor(donnees: DonneesDeSupervision | Error) {
    super();
    this.donnees =
      donnees instanceof Error
        ? donnees
        : {
            operateurs: [...donnees.operateurs],
            journees: [...donnees.journees],
            activites: [...donnees.activites],
          };
  }

  read(): Promise<DonneesDeSupervision> {
    if (this.donnees instanceof Error) {
      this.errorHandler.handleError(this.donnees);
      return Promise.reject(this.donnees);
    }
    return Promise.resolve(this.donnees);
  }
}
