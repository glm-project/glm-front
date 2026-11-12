import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { findApiErrorIn } from '@/app/shared/api-client/infrastructure/secondary/findApiErrorIn';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { inject, Injectable } from '@angular/core';
import { DossierDeLaFin, LectureDuDossierDeLaFin, PointageDuDossier, TypeDePointage } from '../../domain/fin-automatique/DossierDeLaFin';
import { DossierDeLaFinPort } from '../../domain/fin-automatique/DossierDeLaFinPort';
import { PointageDuDossierId } from '../../domain/fin-automatique/PointageDuDossierId';
import { ActiviteDeLaJourneeId } from '../../domain/journee/ActiviteDeLaJourneeId';
import { SuiviDAtelierId } from '../../domain/journee/SuiviDAtelierId';

type RestDossier = components['schemas']['RestDossierAnomalie'];
type RestEvenement = components['schemas']['RestEvenementDAtelier'];
type RestPointage = RestEvenement & { readonly type: TypeDePointage };

const URN_DOSSIER_INTROUVABLE = [
  'urn:glm:erreur:atelier:suivi-d-atelier-introuvable',
  'urn:glm:erreur:atelier:fin-automatique-introuvable',
];

const estUnPointage = (evenement: RestEvenement): evenement is RestPointage =>
  evenement.type !== 'RETRAIT' && evenement.type !== 'CHANGEMENT_DE_POSTE';

const toPointage = (pointage: RestPointage): PointageDuDossier => ({
  id: new PointageDuDossierId(pointage.id),
  fait: { type: pointage.type, instant: pointage.dateDeSurvenue },
});

const toDossier = (dossier: RestDossier): DossierDeLaFin => ({
  journal: dossier.pointages.filter(estUnPointage).map(toPointage),
  activite: {
    id: new ActiviteDeLaJourneeId(dossier.activite.activite),
    ouvrant: new PointageDuDossierId(dossier.activite.evenement),
    categorie: dossier.activite.categorie,
    debut: dossier.activite.debut,
    echeance: dossier.activite.fin,
  },
  ...(dossier.borneDeFin === undefined ? {} : { borneDeFin: dossier.borneDeFin }),
});

@Injectable()
export class HttpDossierDeLaFin extends DossierDeLaFinPort {
  private readonly api = inject(ApiClient);
  private readonly errors = inject(ErrorHandlerPort);

  override async lire(suivi: SuiviDAtelierId, activite: ActiviteDeLaJourneeId): Promise<LectureDuDossierDeLaFin> {
    try {
      const dossier = await this.api.read('/api/atelier/suivis/{id}/anomalies/{pointage}', {
        pathParams: { id: suivi.value, pointage: activite.value },
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
}
