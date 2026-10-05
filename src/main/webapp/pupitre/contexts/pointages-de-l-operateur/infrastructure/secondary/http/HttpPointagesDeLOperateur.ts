import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { required } from '@/app/shared/api-client/infrastructure/secondary/required';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { inject, Injectable } from '@angular/core';
import { DemandeDePointages } from '../../../domain/DemandeDePointages';
import { DureeTravaillee } from '../../../domain/duree/DureeTravaillee';
import { TotalDeDuree } from '../../../domain/duree/TotalDeDuree';
import { InstantDEvaluation } from '../../../domain/InstantDEvaluation';
import { JourDePointages } from '../../../domain/JourDePointages';
import { PointagesDeLaSemaine } from '../../../domain/PointagesDeLaSemaine';
import { PointagesDeLOperateurPort } from '../../../domain/PointagesDeLOperateurPort';
import { JourCalendaire } from '../../../domain/semaine/JourCalendaire';
import { SemaineISO } from '../../../domain/semaine/SemaineISO';

type RestSynthese = components['schemas']['RestSyntheseDesHeures'];
type RestDuree = components['schemas']['RestDureeDeSynthese'];
type RestJour = components['schemas']['RestJourDeSynthese'];

const SYNTHESE = '/api/syntheses-des-heures/{operateurId}';

const toTotal = (duree: RestDuree): TotalDeDuree =>
  duree.complete ? TotalDeDuree.complet(new DureeTravaillee(required(duree.valeur, 'duree.valeur'))) : TotalDeDuree.incomplet();

const toJour = (jour: RestJour): JourDePointages =>
  new JourDePointages(new JourCalendaire(required(jour.jour, 'jour')), toTotal(jour.dureeOperationnelle), jour.pointages?.length ?? 0);

const verifieLEvaluation = (recue: string, demandee: InstantDEvaluation): void => {
  if (!new InstantDEvaluation(recue).estLeMeme(demandee)) {
    throw new Error(`Le serveur a évalué les pointages à ${recue}, pas à l’instant demandé.`);
  }
};

const verifieLaSemaine = (synthese: RestSynthese, demandee: SemaineISO): void => {
  const recue = new SemaineISO(required(synthese.annee, 'annee'), required(synthese.semaine, 'semaine'));
  if (!recue.estLaMeme(demandee)) {
    throw new Error(`Le serveur a rendu la semaine ${String(recue.numero)} de ${String(recue.annee)} au lieu de celle demandée.`);
  }
};

const toSemaine = (synthese: RestSynthese, demande: DemandeDePointages, evaluation: InstantDEvaluation): PointagesDeLaSemaine => {
  verifieLEvaluation(synthese.evaluation, evaluation);
  verifieLaSemaine(synthese, demande.semaine);
  return new PointagesDeLaSemaine(
    demande.semaine,
    toTotal(synthese.dureeOperationnelleTotale),
    required(synthese.jours, 'jours').map(toJour),
  );
};

@Injectable()
export class HttpPointagesDeLOperateur extends PointagesDeLOperateurPort {
  private readonly api = inject(ApiClient);
  private readonly errors = inject(ErrorHandlerPort);

  override async semaine(demande: DemandeDePointages): Promise<PointagesDeLaSemaine> {
    const evaluation = new Date().toISOString();
    try {
      const synthese = await this.api.read(SYNTHESE, {
        pathParams: { operateurId: demande.operateur.value },
        queryParams: { annee: demande.semaine.annee, semaine: demande.semaine.numero, evaluation },
      });
      return toSemaine(synthese, demande, new InstantDEvaluation(evaluation));
    } catch (failure: unknown) {
      this.errors.handleError(failure);
      throw failure;
    }
  }
}
