import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { inject, Injectable } from '@angular/core';
import { Instant } from '../../../domain/instant/Instant';
import { DonneesDeSupervision, DonneesDeSupervisionPort } from '../../../domain/supervision/DonneesDeSupervisionPort';

@Injectable()
export class HttpDonneesDeSupervision extends DonneesDeSupervisionPort {
  private readonly api = inject(ApiClient);

  override async read(): Promise<DonneesDeSupervision> {
    const response = await this.api.read('/api/atelier/supervision', {});
    return { evaluation: new Instant(response.evaluation), operateurs: [], activites: [], sequencesEnConflit: [] };
  }
}
