import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { inject, Injectable } from '@angular/core';
import { DonneesDeSupervision, DonneesDeSupervisionPort } from '../../../domain/supervision/DonneesDeSupervisionPort';
import { toDonneesDeSupervision } from './toDonneesDeSupervision';

interface AcquisitionPage<T> {
  readonly content: readonly T[];
  readonly currentPage: number;
  readonly pageSize: number;
  readonly totalElementsCount: number;
}

const valueFrom = <T>(result: PromiseSettledResult<T>): T => {
  if (result.status === 'rejected') {
    throw result.reason;
  }
  return result.value;
};

const assertAcquisition = (complete: boolean): void => {
  if (!complete) {
    throw new Error('Incomplete supervision acquisition');
  }
};

@Injectable()
export class HttpDonneesDeSupervision extends DonneesDeSupervisionPort {
  private readonly authentication = inject(AuthenticationPort);
  private readonly api = inject(ApiClient);
  private readonly errors = inject(ErrorHandlerPort);

  private readonly pending = new Map<string | undefined, Promise<DonneesDeSupervision>>();

  override read(): Promise<DonneesDeSupervision> {
    const tenant = this.authentication.currentTenant();
    const pending = this.pending.get(tenant);
    if (pending !== undefined) {
      return pending;
    }
    const acquisition = this.acquire().finally(() => {
      this.pending.delete(tenant);
    });
    this.pending.set(tenant, acquisition);
    return acquisition;
  }

  private async acquire(): Promise<DonneesDeSupervision> {
    const tenant = this.authentication.currentTenant();
    try {
      const [operateurs, journees, suivis, postes] = await Promise.allSettled([
        this.readAll(tenant, page => this.api.read('/api/operateurs', { queryParams: { page, size: 100 } })),
        this.readAll(tenant, page => this.api.read('/api/atelier/journees', { queryParams: { page, size: 100, etat: 'PRESENT' } })),
        this.readAll(tenant, page =>
          this.api.read('/api/atelier/suivis', { queryParams: { page, size: 100, etats: ['EN_COURS'], inclureConflits: true } }),
        ),
        this.readAll(tenant, page => this.api.read('/api/postes-de-travail', { queryParams: { page, size: 100 } })),
      ]);
      this.assertTenant(tenant);
      const postesDeTravail = valueFrom(postes);
      return toDonneesDeSupervision({
        operateurs: valueFrom(operateurs),
        journees: valueFrom(journees),
        suivis: valueFrom(suivis),
        postes: postesDeTravail,
      });
    } catch (error) {
      this.errors.handleError(error);
      throw error;
    }
  }
  private async readAll<T extends { readonly id: string }>(
    tenant: string | undefined,
    readPage: (page: number) => Promise<AcquisitionPage<T>>,
  ): Promise<T[]> {
    this.assertTenant(tenant);
    const page = await readPage(0);
    this.assertTenant(tenant);
    assertAcquisition(page.currentPage === 0);
    assertAcquisition(page.pageSize > 0);
    assertAcquisition(page.totalElementsCount === 0 || page.content.length > 0);
    const elements = [...page.content];
    const pageCount = Math.ceil(page.totalElementsCount / page.pageSize);
    for (let index = 1; index < pageCount; index++) {
      const suivante = await readPage(index);
      this.assertTenant(tenant);
      assertAcquisition(suivante.currentPage === index);
      assertAcquisition(suivante.pageSize === page.pageSize);
      assertAcquisition(suivante.content.length > 0);
      assertAcquisition(suivante.totalElementsCount === page.totalElementsCount);
      elements.push(...suivante.content);
    }
    assertAcquisition(elements.length === page.totalElementsCount);
    assertAcquisition(new Set(elements.map(element => element.id)).size === elements.length);
    return elements;
  }

  private assertTenant(tenant: string | undefined): void {
    if (tenant !== this.authentication.currentTenant()) {
      throw new Error('Supervision company changed');
    }
  }
}
