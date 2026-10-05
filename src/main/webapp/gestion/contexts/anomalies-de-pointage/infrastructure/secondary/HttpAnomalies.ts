import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ApiError, findApiErrorIn } from '@/app/shared/api-client/infrastructure/secondary/findApiErrorIn';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { inject, Injectable } from '@angular/core';
import { ActeResolution, FaitPropose } from '../../domain/acte/ActeResolution';
import {
  ApplicationActePort,
  PrevisualisationAnomaliePort,
  ResultatApercu,
  ResultatApplication,
  ResultatVerification,
} from '../../domain/acte/AnomaliesActesPorts';
import { InstantPointage } from '../../domain/acte/InstantPointage';
import { PropositionResolution } from '../../domain/acte/ResolutionDeLAnomalie';
import { AnomaliesReadPort } from '../../domain/dossier/AnomaliesReadPort';
import { AdresseDossier, FiltreAnomalies, LectureDossier, PAGE_SIZE_ANOMALIES, PageAnomalies } from '../../domain/dossier/DossierAnomalie';
import { toDossier, toDossierDansPerimetre, toLigne, toPointage } from './DossierAnomalieHttp';

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
  && apercu.empreinteConsequences !== ''
  && (request.acte.kind === 'ANNULATION' ? apercu.evenement === undefined : apercu.evenement !== undefined)
  && apercu.apres.adresse.suivi === request.adresse.suivi.suivi
  && apercu.apres.adresse.pointage === request.adresse.pointage.pointage
  && new InstantPointage(apercu.avant.evaluation).compareTo(new InstantPointage(apercu.evaluation)) === 0
  && new InstantPointage(apercu.apres.evaluation).compareTo(new InstantPointage(apercu.evaluation)) === 0
  && echoRepresentsProposition(apercu.acte, request.acte);

const receiptMatchesProposition = (recu: components['schemas']['RestRecuDActe'], proposition: PropositionResolution): boolean =>
  recu.commande === proposition.commande
  && recu.adresse.suivi === proposition.adresse.suivi.suivi
  && recu.adresse.pointage === proposition.adresse.pointage.pointage
  && recu.revisionDeDepart === proposition.version
  && echoRepresentsProposition(recu.acte, proposition.acte)
  && recu.evenementCree === proposition.evenement;

const canonicalReceiptMatchesProposition = (
  confirmation: components['schemas']['RestConfirmationEnregistree'],
  proposition: PropositionResolution,
): boolean =>
  receiptMatchesProposition(confirmation.recu, proposition)
  && confirmation.dossier.adresse.suivi === proposition.adresse.suivi.suivi
  && confirmation.dossier.adresse.pointage === proposition.adresse.pointage.pointage
  && confirmation.dossier.revision >= confirmation.recu.revisionEnregistree;

const isConcurrentRefusal = (urn: string | undefined): boolean =>
  urn === 'urn:glm:erreur:atelier:apercu-obsolete' || urn === 'urn:glm:erreur:atelier:saisie-concurrente';

const knownActRefusals = new Set(
  [
    'proposition-invalide',
    'confirmation-reutilisee',
    'suivi-d-atelier-introuvable',
    'suivi-d-atelier-cloture',
    'evenement-d-atelier-introuvable',
    'operateur-introuvable',
    'poste-de-travail-introuvable',
    'activite-visee-introuvable',
    'operateur-non-habilite',
    'activite-visee-incoherente',
    'evenement-deja-annule',
    'evenement-anterieur-a-l-engagement',
    'identifiant-evenement-reutilise',
    'date-de-survenue-future',
  ].map(code => `urn:glm:erreur:atelier:${code}`),
);

const isKnownActRefusal = (erreur: ApiError | undefined): erreur is ApiError => erreur !== undefined && knownActRefusals.has(erreur.urn);

const toActRefusal = (failure: unknown): { kind: 'CONCURRENCE' } | { kind: 'REFUS'; raison: string } => {
  const erreur = findApiErrorIn(failure);
  if (isConcurrentRefusal(erreur?.urn)) return { kind: 'CONCURRENCE' };
  if (isKnownActRefusal(erreur)) return { kind: 'REFUS', raison: erreur.message };
  throw failure;
};

@Injectable()
export class HttpAnomalies extends AnomaliesReadPort implements PrevisualisationAnomaliePort, ApplicationActePort {
  private readonly api = inject(ApiClient);
  private readonly errors = inject(ErrorHandlerPort);

  async apply(proposition: PropositionResolution): Promise<ResultatApplication> {
    try {
      const resultat = await this.api.write('/api/atelier/suivis/{suivi}/confirmations-de-resolution', {
        pathParams: { suivi: proposition.adresse.suivi.suivi },
        body: {
          commande: proposition.commande,
          adresse: { suivi: proposition.adresse.suivi.suivi, pointage: proposition.adresse.pointage.pointage },
          revision: proposition.version,
          acte: toRestActe(proposition.acte),
          empreinteConsequences: proposition.empreinteConsequences,
          ...(proposition.evenement === undefined ? {} : { evenement: proposition.evenement }),
        },
      });
      if (resultat.kind === 'NON_ATTESTEE') return { kind: 'ISSUE_INCONNUE' };
      if (!canonicalReceiptMatchesProposition(resultat, proposition)) throw new Error('Reçu de confirmation incohérent.');
      return { kind: 'APPLIQUE', dossier: toDossierDansPerimetre(resultat.dossier) };
    } catch (failure: unknown) {
      return toActRefusal(failure);
    }
  }

  async verify(proposition: PropositionResolution): Promise<ResultatVerification> {
    try {
      const resultat = await this.api.read('/api/atelier/suivis/{suivi}/confirmations-de-resolution/{commande}', {
        pathParams: { suivi: proposition.adresse.suivi.suivi, commande: proposition.commande },
      });
      if (resultat.kind === 'NON_ATTESTEE') return { kind: 'NON_ATTESTE' };
      if (!canonicalReceiptMatchesProposition(resultat, proposition)) throw new Error('Reçu de confirmation incohérent.');
      return { kind: 'ATTESTE', dossier: toDossierDansPerimetre(resultat.dossier) };
    } catch (failure: unknown) {
      const erreur = findApiErrorIn(failure);
      if (erreur?.urn === 'urn:glm:erreur:atelier:suivi-d-atelier-introuvable') return { kind: 'REFUS', raison: erreur.message };
      throw failure;
    }
  }

  async preview(adresse: AdresseDossier, version: number, acte: ActeResolution): Promise<ResultatApercu> {
    try {
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
          empreinteConsequences: apercu.empreinteConsequences,
          evaluation: apercu.evaluation,
          ...(apercu.evenement === undefined ? {} : { evenement: apercu.evenement }),
          version: apercu.revision,
          acte,
          avant: toDossierDansPerimetre(apercu.avant),
          apres: toDossierDansPerimetre(apercu.apres),
        },
      };
    } catch (failure: unknown) {
      return toActRefusal(failure);
    }
  }

  override async list(filtre: FiltreAnomalies): Promise<PageAnomalies> {
    try {
      const page = await this.api.read('/api/atelier/conflits', {
        queryParams: { operateur: filtre.operateur, element: filtre.element, page: filtre.page - 1, size: PAGE_SIZE_ANOMALIES },
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
