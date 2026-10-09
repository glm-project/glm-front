import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { findApiErrorIn } from '@/app/shared/api-client/infrastructure/secondary/findApiErrorIn';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { buildPageFrom } from '@/app/shared/pagination/infrastructure/secondary/buildPageFrom';
import { collectAllPages } from '@/app/shared/pagination/infrastructure/secondary/collectAllPages';
import { inject, Injectable } from '@angular/core';
import { AnomaliesReadPort } from '../../domain/dossier/AnomaliesReadPort';
import { AdresseDossier, FiltreAnomalies, LectureDossier, PAGE_SIZE_ANOMALIES, PageAnomalies } from '../../domain/dossier/DossierAnomalie';
import { ElementAnomalie } from '../../domain/dossier/ElementAnomalie';
import { OperateurAnomalie } from '../../domain/dossier/OperateurAnomalie';
import { toDossier } from './DossierAnomalieHttp';
import { toPageAnomalies } from './ListeAnomaliesHttp';
import { toElementAnomalie, toOperateurAnomalie } from './ReferentielAnomaliesHttp';

const PERIODE_DEPUIS_TOUJOURS = { debut: '1970-01-01T00:00:00Z', fin: '2999-12-31T23:59:59Z' };

const URN_DOSSIER_INTROUVABLE = [
  'urn:glm:erreur:atelier:suivi-d-atelier-introuvable',
  'urn:glm:erreur:atelier:fin-automatique-introuvable',
];

@Injectable()
export class HttpAnomalies extends AnomaliesReadPort {
  private readonly api = inject(ApiClient);
  private readonly errors = inject(ErrorHandlerPort);

  override async list(filtre: FiltreAnomalies): Promise<PageAnomalies> {
    try {
      const page = await this.api.read('/api/atelier/anomalies', {
        queryParams: {
          operateur: filtre.operateur,
          element: filtre.element,
          page: filtre.page - 1,
          size: PAGE_SIZE_ANOMALIES,
        },
      });
      return toPageAnomalies(page);
    } catch (failure: unknown) {
      this.errors.handleError(failure);
      throw failure;
    }
  }

  override async read(adresse: AdresseDossier): Promise<LectureDossier> {
    try {
      const dossier = await this.api.read('/api/atelier/suivis/{id}/anomalies/{pointage}', {
        pathParams: { id: adresse.suivi.suivi, pointage: adresse.pointage.pointage },
      });
      return { kind: 'DOSSIER', dossier: toDossier(dossier) };
    } catch (failure: unknown) {
      if (URN_DOSSIER_INTROUVABLE.includes(findApiErrorIn(failure)?.urn ?? '')) {
        return { kind: 'INTROUVABLE' };
      }
      this.errors.handleError(failure);
      throw failure;
    }
  }

  override async operateurs(): Promise<readonly OperateurAnomalie[]> {
    try {
      return await this.readOperateurs();
    } catch (failure: unknown) {
      this.errors.handleError(failure);
      throw failure;
    }
  }

  private readOperateurs(): Promise<readonly OperateurAnomalie[]> {
    return collectAllPages(
      async (page, size) =>
        buildPageFrom(await this.api.read('/api/operateurs', { queryParams: { page, size } }), toOperateurAnomalie, {
          page,
          taille: size,
        }),
      operateur => operateur.id.operateur,
    );
  }

  override async elements(): Promise<readonly ElementAnomalie[]> {
    try {
      return await collectAllPages(
        async (page, size) =>
          buildPageFrom(
            await this.api.read('/api/elements-de-fabrication', { queryParams: { ...PERIODE_DEPUIS_TOUJOURS, page, size } }),
            toElementAnomalie,
            { page, taille: size },
          ),
        element => element.id.element,
      );
    } catch (failure: unknown) {
      this.errors.handleError(failure);
      throw failure;
    }
  }
}
