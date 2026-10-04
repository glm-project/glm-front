import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { findApiErrorIn } from '@/app/shared/api-client/infrastructure/secondary/findApiErrorIn';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { inject, Injectable } from '@angular/core';
import { ActeResolution, FaitPropose } from '../../domain/acte/ActeResolution';
import { PrevisualisationConflitPort, ResultatApercu } from '../../domain/acte/ConflitsActesPorts';
import { InstantPointage } from '../../domain/acte/InstantPointage';
import { ConflitsReadPort } from '../../domain/dossier/ConflitsReadPort';
import { AdresseDossier, FiltreConflits, LectureDossier, PAGE_SIZE_CONFLITS, PageConflits } from '../../domain/dossier/DossierConflit';
import { toDossier, toLigne, toPointage } from './DossierConflitHttp';

const toRestFait = (fait: FaitPropose): components['schemas']['RestFaitDeResolution'] => ({
  type: fait.type,
  intention: fait.intention,
  operateur: fait.operateur,
  instant: fait.instant,
  ...(fait.activiteVisee === '' ? {} : { activiteVisee: fait.activiteVisee }),
  ...(fait.poste === '' ? {} : { poste: fait.poste }),
});

const toRestActe = (acte: ActeResolution): components['schemas']['RestActeDeResolution'] =>
  acte.kind === 'ANNULATION' ? acte : { ...acte, fait: toRestFait(acte.fait) };

const echoRepresentsProposition = (echo: components['schemas']['RestActeDeResolution'], acte: ActeResolution): boolean => {
  if (echo.kind !== acte.kind) return false;
  if (acte.kind === 'ANNULATION') return echo.kind === 'ANNULATION' && echo.pointage === acte.pointage && echo.motif === acte.motif;
  if (acte.kind === 'CORRECTION')
    return (
      echo.kind === 'CORRECTION' && echo.pointage === acte.pointage && echo.motif === acte.motif && factEchoMatches(echo.fait, acte.fait)
    );
  return echo.kind === 'REGULARISATION' && factEchoMatches(echo.fait, acte.fait);
};

const factEchoMatches = (echo: components['schemas']['RestFaitDeResolution'], fait: FaitPropose): boolean =>
  echo.type === fait.type
  && echo.intention === fait.intention
  && (echo.activiteVisee ?? '') === fait.activiteVisee
  && echo.operateur === fait.operateur
  && (echo.poste ?? '') === fait.poste
  && new InstantPointage(echo.instant).compareTo(new InstantPointage(fait.instant)) === 0;

const previewMatchesRequest = (
  apercu: components['schemas']['RestApercuDeResolution'],
  request: { adresse: AdresseDossier; commande: string; version: number; acte: ActeResolution },
): boolean =>
  apercu.commande === request.commande
  && apercu.adresse.suivi === request.adresse.suivi.suivi
  && apercu.adresse.pointage === request.adresse.pointage.pointage
  && apercu.revision === request.version
  && apercu.reference !== ''
  && echoRepresentsProposition(apercu.acte, request.acte);

@Injectable()
export class HttpConflits extends ConflitsReadPort implements PrevisualisationConflitPort {
  private readonly api = inject(ApiClient);
  private readonly errors = inject(ErrorHandlerPort);

  async preview(adresse: AdresseDossier, version: number, acte: ActeResolution): Promise<ResultatApercu> {
    const commande = crypto.randomUUID();
    const apercu = await this.api.write('/api/atelier/suivis/{id}/conflits/{pointage}/apercus', {
      pathParams: { id: adresse.suivi.suivi, pointage: adresse.pointage.pointage },
      body: { commande, revision: version, acte: toRestActe(acte) },
    });
    if (!previewMatchesRequest(apercu, { adresse, commande, version, acte })) throw new Error('Réponse d’aperçu incohérente.');
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
