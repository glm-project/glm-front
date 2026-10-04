import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { findApiErrorIn } from '@/app/shared/api-client/infrastructure/secondary/findApiErrorIn';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { inject, Injectable } from '@angular/core';
import { ActeResolution } from '../../domain/acte/ActeResolution';
import { PrevisualisationConflitPort, ResultatApercu } from '../../domain/acte/ConflitsActesPorts';
import { ConflitsReadPort } from '../../domain/dossier/ConflitsReadPort';
import { AdresseDossier, FiltreConflits, LectureDossier, PAGE_SIZE_CONFLITS, PageConflits } from '../../domain/dossier/DossierConflit';
import { toDossier, toLigne, toPointage } from './DossierConflitHttp';

@Injectable()
export class HttpConflits extends ConflitsReadPort implements PrevisualisationConflitPort {
  private readonly api = inject(ApiClient);
  private readonly errors = inject(ErrorHandlerPort);

  async preview(adresse: AdresseDossier, version: number, acte: ActeResolution): Promise<ResultatApercu> {
    const commande = crypto.randomUUID();
    const apercu = await this.api.write('/api/atelier/suivis/{id}/conflits/{pointage}/apercus', {
      pathParams: { id: adresse.suivi.suivi, pointage: adresse.pointage.pointage },
      body: { commande, revision: version, acte },
    });
    return {
      kind: 'APERCU',
      apercu: {
        adresse,
        commande: apercu.commande,
        reference: apercu.reference,
        version: apercu.revision,
        acte,
        avant: toDossier(apercu.avant, apercu.avant.perimetre),
        apres: toDossier(apercu.apres, apercu.apres.perimetre),
      },
    };
  }

  override async list(filtre: FiltreConflits): Promise<PageConflits> {
    try {
      const page = await this.api.read('/api/atelier/conflits', {
        queryParams: { operateur: filtre.operateur, element: filtre.element, page: filtre.page - 1, size: PAGE_SIZE_CONFLITS },
      });
      if (!page.complete) throw new Error('Lecture des conflits incomplète.');
      return { lignes: page.lignes.map(toLigne), total: page.total, complete: page.complete };
    } catch (failure: unknown) {
      this.errors.handleError(failure);
      throw failure;
    }
  }

  override async read(adresse: AdresseDossier): Promise<LectureDossier> {
    try {
      const dossier = await this.api.read('/api/atelier/suivis/{id}/conflits/{pointage}', {
        pathParams: { id: adresse.suivi.suivi, pointage: adresse.pointage.pointage },
      });
      if (dossier.kind === 'EN_CONFLIT') return { kind: 'DOSSIER', dossier: toDossier(dossier) };
      return { kind: dossier.kind, journal: dossier.suivi.journal.map(toPointage) };
    } catch (failure: unknown) {
      if (findApiErrorIn(failure)?.urn === 'urn:glm:erreur:atelier:suivi-d-atelier-introuvable') {
        return { kind: 'INTROUVABLE', journal: [] };
      }
      this.errors.handleError(failure);
      throw failure;
    }
  }
}
