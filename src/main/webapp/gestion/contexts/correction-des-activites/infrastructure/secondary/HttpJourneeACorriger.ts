import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { findApiErrorIn } from '@/app/shared/api-client/infrastructure/secondary/findApiErrorIn';
import { required } from '@/app/shared/api-client/infrastructure/secondary/required';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { inject, Injectable } from '@angular/core';
import { ActiviteDeLaJournee } from '../../domain/journee/ActiviteDeLaJournee';
import { ActiviteDeLaJourneeId } from '../../domain/journee/ActiviteDeLaJourneeId';
import { BornesDuJour } from '../../domain/journee/BornesDuJour';
import { CategorieDElement } from '../../domain/journee/CategorieDElement';
import { ChoixDAjout } from '../../domain/journee/ChoixDAjout';
import { Duree } from '../../domain/journee/Duree';
import { ElementDeLaJournee } from '../../domain/journee/ElementDeLaJournee';
import { ElementDeLaJourneeId } from '../../domain/journee/ElementDeLaJourneeId';
import { EtatDActivite } from '../../domain/journee/EtatDActivite';
import { InstantDeLaJournee } from '../../domain/journee/InstantDeLaJournee';
import { JourACorriger } from '../../domain/journee/JourACorriger';
import { JourneeACorriger } from '../../domain/journee/JourneeACorriger';
import { JourneeACorrigerPort } from '../../domain/journee/JourneeACorrigerPort';
import { OperateurDeLaJournee } from '../../domain/journee/OperateurDeLaJournee';
import { OperateurDeLaJourneeId } from '../../domain/journee/OperateurDeLaJourneeId';
import { PortionDeJour } from '../../domain/journee/PortionDeJour';
import { PosteDeLaJournee } from '../../domain/journee/PosteDeLaJournee';
import { PosteDeLaJourneeId } from '../../domain/journee/PosteDeLaJourneeId';
import { SuiviDAtelierId } from '../../domain/journee/SuiviDAtelierId';
import { SuiviPresent } from '../../domain/journee/SuiviPresent';
import { SuivisPresents } from '../../domain/journee/SuivisPresents';

type RestJournee = components['schemas']['RestJourneeACorriger'];
type RestActivite = components['schemas']['RestActiviteDeLaJournee'];
type RestElement = components['schemas']['RestElementDeLaJournee'];
type RestPoste = components['schemas']['RestPosteDeLaJournee'];
type RestSuiviPresent = components['schemas']['RestSuiviPresent'];
type RestPortion = components['schemas']['RestPortionDeJour'];

const OPERATEUR_INTROUVABLE = 'urn:glm:erreur:atelier:operateur-introuvable';

const estOperateurIntrouvable = (failure: unknown): boolean => findApiErrorIn(failure)?.urn === OPERATEUR_INTROUVABLE;

const toInstant = (instant: string): InstantDeLaJournee => new InstantDeLaJournee(instant);

const toElement = (element: RestElement): ElementDeLaJournee =>
  new ElementDeLaJournee({
    id: new ElementDeLaJourneeId(element.id),
    categorie: new CategorieDElement(element.categorie),
    nom: element.nom,
    reference: element.reference,
    description: element.description,
  });

const toPoste = (poste: RestPoste): PosteDeLaJournee => new PosteDeLaJournee(new PosteDeLaJourneeId(poste.id), poste.libelle, poste.nature);

const toSuiviPresent = (suivi: RestSuiviPresent): SuiviPresent =>
  new SuiviPresent({
    suivi: new SuiviDAtelierId(suivi.suivi),
    element: toElement(suivi.element),
    engageLe: toInstant(suivi.engageLe),
    clotureLe: suivi.clotureLe === undefined ? undefined : toInstant(suivi.clotureLe),
  });

const toPortion = (portion: RestPortion): PortionDeJour => new PortionDeJour(new JourACorriger(portion.jour), new Duree(portion.duree));

const toEtat = (activite: RestActivite): EtatDActivite => {
  switch (activite.etat) {
    case 'TERMINEE':
    case 'TERMINEE_AUTOMATIQUEMENT':
      return {
        kind: activite.etat,
        fin: toInstant(required(activite.fin, 'activite.fin')),
        dureeSurLeJour: new Duree(required(activite.dureeSurLeJour, 'activite.dureeSurLeJour')),
      };
    case 'EN_COURS':
      return { kind: activite.etat };
  }
};

const toActivite = (activite: RestActivite): ActiviteDeLaJournee =>
  new ActiviteDeLaJournee({
    id: new ActiviteDeLaJourneeId(activite.id),
    suivi: new SuiviDAtelierId(activite.suivi),
    element: toElement(activite.element),
    poste: activite.poste === undefined ? undefined : toPoste(activite.poste),
    categorie: activite.categorie,
    debut: toInstant(activite.debut),
    etat: toEtat(activite),
    autresJours: activite.autresJours.map(toPortion),
  });

const toJournee = (journee: RestJournee): JourneeACorriger => {
  const suivisPresents = new SuivisPresents(journee.choix.suivis.map(toSuiviPresent));
  return new JourneeACorriger({
    operateur: new OperateurDeLaJournee(new OperateurDeLaJourneeId(journee.operateur.id), journee.operateur.nom, journee.operateur.prenom),
    jour: new JourACorriger(journee.jour),
    bornes: new BornesDuJour({
      debut: toInstant(journee.bornes.debut),
      fin: toInstant(journee.bornes.fin),
    }),
    dureeOperationnelle: new Duree(journee.dureeOperationnelle),
    activites: journee.activites.map(toActivite),
    choix: new ChoixDAjout({ suivis: suivisPresents, postes: journee.choix.postes.map(toPoste) }),
  });
};

@Injectable()
export class HttpJourneeACorriger extends JourneeACorrigerPort {
  private readonly api = inject(ApiClient);
  private readonly errors = inject(ErrorHandlerPort);

  override async lire(operateur: OperateurDeLaJourneeId, jour: JourACorriger): Promise<JourneeACorriger | undefined> {
    try {
      const journee = await this.api.read('/api/atelier/operateurs/{operateurId}/journees/{jour}', {
        pathParams: { operateurId: operateur.value, jour: jour.value },
      });
      return toJournee(journee);
    } catch (failure: unknown) {
      if (estOperateurIntrouvable(failure)) {
        return undefined;
      }
      this.errors.handleError(failure);
      throw failure;
    }
  }
}
