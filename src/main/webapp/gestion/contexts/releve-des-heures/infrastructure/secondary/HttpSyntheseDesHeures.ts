import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { findApiErrorIn } from '@/app/shared/api-client/infrastructure/secondary/findApiErrorIn';
import { required } from '@/app/shared/api-client/infrastructure/secondary/required';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { inject, Injectable } from '@angular/core';
import { DureeTravaillee } from '../../domain/duree/DureeTravaillee';
import { IdentiteOperateur } from '../../domain/releve/IdentiteOperateur';
import { InstantDeReleve } from '../../domain/releve/InstantDeReleve';
import { JourDeReleve } from '../../domain/releve/JourDeReleve';
import { PointageDeReleve } from '../../domain/releve/PointageDeReleve';
import { ReleveDesHeures } from '../../domain/releve/ReleveDesHeures';
import { DemandeDeReleve, SyntheseDesHeuresPort } from '../../domain/releve/SyntheseDesHeuresPort';
import { JourCalendaire } from '../../domain/semaine/JourCalendaire';
import { SemaineISO } from '../../domain/semaine/SemaineISO';

type RestSynthese = components['schemas']['RestSyntheseDesHeures'];
type RestJour = components['schemas']['RestJourDeSynthese'];
type RestPointage = components['schemas']['RestPointageDeSyntheseDesHeures'];

const ROUTE = '/api/syntheses-des-heures/{operateurId}';
const OPERATEUR_INTROUVABLE = 'urn:glm:erreur:synthese-des-heures:operateur-introuvable';

const toPointage = (pointage: RestPointage): PointageDeReleve =>
  new PointageDeReleve(pointage.type, new InstantDeReleve(pointage.dateDeSurvenue));

const toJour = (jour: RestJour): JourDeReleve =>
  new JourDeReleve(
    new JourCalendaire(required(jour.jour, 'jour.jour')),
    new DureeTravaillee(required(jour.duree, 'jour.duree')),
    required(jour.pointages, 'jour.pointages').map(toPointage),
  );

const toIdentite = (synthese: RestSynthese): IdentiteOperateur => {
  const operateur = required(synthese.operateur, 'synthese.operateur');
  return new IdentiteOperateur(operateur.nom, operateur.prenom);
};

/**
 * Le back accepte en silence la semaine 53 d'une année qui n'en a que 52 et rend alors la première semaine de
 * l'année suivante. `SemaineISO` rend le cas inatteignable depuis cet écran ; cette vérification le rend
 * inatteignable tout court.
 */
const verifieLaSemaine = (synthese: RestSynthese, demandee: SemaineISO): void => {
  const rendue = new SemaineISO(required(synthese.annee, 'synthese.annee'), required(synthese.semaine, 'synthese.semaine'));
  if (!rendue.estLaMeme(demandee)) {
    throw new Error('La semaine reçue du serveur n’est pas celle demandée.');
  }
};

const toReleve = (synthese: RestSynthese, demandee: SemaineISO): ReleveDesHeures => {
  verifieLaSemaine(synthese, demandee);
  return new ReleveDesHeures(demandee, {
    operateur: toIdentite(synthese),
    jours: required(synthese.jours, 'synthese.jours').map(toJour),
    total: new DureeTravaillee(required(synthese.dureeTotale, 'synthese.dureeTotale')),
  });
};

@Injectable()
export class HttpSyntheseDesHeures extends SyntheseDesHeuresPort {
  private readonly api = inject(ApiClient);
  private readonly errors = inject(ErrorHandlerPort);

  override async synthese(demande: DemandeDeReleve): Promise<ReleveDesHeures | undefined> {
    try {
      const response = await this.api.read(ROUTE, {
        pathParams: { operateurId: demande.operateur.value },
        queryParams: { annee: demande.semaine.annee, semaine: demande.semaine.numero },
      });
      return toReleve(response, demande.semaine);
    } catch (failure) {
      if (findApiErrorIn(failure)?.urn === OPERATEUR_INTROUVABLE) {
        return undefined;
      }
      this.errors.handleError(failure);
      throw failure;
    }
  }
}
