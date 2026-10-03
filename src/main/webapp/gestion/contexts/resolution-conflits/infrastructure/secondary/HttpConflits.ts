import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { findApiErrorIn } from '@/app/shared/api-client/infrastructure/secondary/findApiErrorIn';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { inject, Injectable } from '@angular/core';
import { ActiviteConflitId } from '../../domain/dossier/ActiviteConflitId';
import { ConflitsReadPort } from '../../domain/dossier/ConflitsReadPort';
import {
  ActiviteConflit,
  AdresseDossier,
  DiagnosticConflit,
  DossierConflit,
  FiltreConflits,
  LectureDossier,
  PAGE_SIZE_CONFLITS,
  PageConflits,
  PointageConflit,
} from '../../domain/dossier/DossierConflit';
import { ElementConflitId } from '../../domain/dossier/ElementConflitId';
import { PointageConflitId } from '../../domain/dossier/PointageConflitId';
import { SuiviConflitId } from '../../domain/dossier/SuiviConflitId';

const toLigne = (ligne: components['schemas']['RestConflitEnListe']) => ({
  adresse: {
    suivi: new SuiviConflitId(ligne.adresse.suivi),
    pointage: new PointageConflitId(ligne.adresse.pointage),
  },
  element: new ElementConflitId(ligne.elementId),
  designation: ligne.designation,
  operateur: ligne.operateur === undefined ? '' : `${ligne.operateur.prenom} ${ligne.operateur.nom}`,
  operateurId: ligne.operateurId,
  poste: ligne.poste?.libelle ?? '',
  ...(ligne.posteId === undefined ? {} : { posteId: ligne.posteId }),
  date: ligne.datePremierPointage,
  explication: '',
  nombrePointages: ligne.nombrePointages,
});

const toPointage = (pointage: components['schemas']['RestEvenementDAtelier']): PointageConflit => ({
  id: new PointageConflitId(pointage.id),
  fait: {
    type: pointage.type,
    intention: pointage.intention,
    activiteVisee: pointage.cible ?? '',
    operateur: pointage.operateurId,
    poste: pointage.posteId ?? '',
    instant: pointage.dateDeSurvenue,
  },
  auteur: pointage.auteur,
  enregistre: pointage.dateDEnregistrement,
  regularisation: pointage.estUneRegularisation,
  ...(pointage.activite === undefined ? {} : { activiteCreee: new ActiviteConflitId(pointage.activite) }),
  ...(pointage.remplace === undefined ? {} : { remplace: new PointageConflitId(pointage.remplace) }),
  ...(pointage.annulation === undefined
    ? {}
    : {
        annulation: {
          motif: pointage.annulation.motif,
          auteur: pointage.annulation.auteur,
          instant: pointage.annulation.date,
        },
      }),
});

const toActivite = (activite: components['schemas']['RestActiviteDuDossier']): ActiviteConflit => ({
  id: new ActiviteConflitId(activite.activite),
  libelle: '',
  etat: activite.etat,
  temps: '',
  periode: {
    categorie: activite.categorie,
    debut: activite.debut,
    ...(activite.fin === undefined ? {} : { fin: activite.fin }),
    ...(activite.duree === undefined ? {} : { duree: activite.duree }),
  },
});

const toDiagnostic = (diagnostic: components['schemas']['RestDiagnosticDeConflit']): DiagnosticConflit => ({
  pointage: new PointageConflitId(diagnostic.pointage),
  raison: diagnostic.raison,
  cible: {
    activite: new ActiviteConflitId(diagnostic.cible.activite),
    ...(diagnostic.cible.ouvrant === undefined ? {} : { ouvrant: new PointageConflitId(diagnostic.cible.ouvrant) }),
    ...(diagnostic.cible.termineePar === undefined ? {} : { termineePar: new PointageConflitId(diagnostic.cible.termineePar) }),
  },
});

const toDossier = (dossier: components['schemas']['RestDossierConflit']): DossierConflit => {
  const sequence = dossier.sequence;
  if (sequence === undefined) throw new Error('Séquence du dossier absente.');
  return {
    ligne: toLigne({
      ...sequence,
      adresse: dossier.adresse,
      revision: dossier.revision,
      elementId: dossier.suivi.element,
      designation: dossier.suivi.nom,
    }),
    version: dossier.revision,
    enConflit: dossier.kind === 'EN_CONFLIT',
    cloture: dossier.suivi.clotureLe !== undefined,
    ...(dossier.suivi.clotureLe === undefined ? {} : { finCloture: dossier.suivi.clotureLe }),
    engagement: dossier.suivi.engageLe,
    journal: dossier.suivi.journal.map(toPointage),
    activites: dossier.activites.map(toActivite),
    diagnostics: dossier.diagnostics.map(toDiagnostic),
    choix: [],
    consequences: [],
    continuations: [],
  };
};

@Injectable()
export class HttpConflits extends ConflitsReadPort {
  private readonly api = inject(ApiClient);
  private readonly errors = inject(ErrorHandlerPort);

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
