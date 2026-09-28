import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { findApiErrorIn } from '@/app/shared/api-client/infrastructure/secondary/findApiErrorIn';
import { required } from '@/app/shared/api-client/infrastructure/secondary/required';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { inject, Injectable } from '@angular/core';
import { DureeTravaillee } from '../../domain/duree/DureeTravaillee';
import { ElementDuReleve } from '../../domain/element/ElementDuReleve';
import { ElementReleveId } from '../../domain/element/ElementReleveId';
import { IntervalleDActivite } from '../../domain/element/IntervalleDActivite';
import { PosteDeLElement } from '../../domain/element/PosteDeLElement';
import { PosteReleveId } from '../../domain/element/PosteReleveId';
import { IdentiteOperateur } from '../../domain/releve/IdentiteOperateur';
import { InstantDeReleve } from '../../domain/releve/InstantDeReleve';
import { JourDeReleve } from '../../domain/releve/JourDeReleve';
import { PlageDeReleve } from '../../domain/releve/PlageDeReleve';
import { PointageDePresence } from '../../domain/releve/PointageDePresence';
import { ReleveDesHeures } from '../../domain/releve/ReleveDesHeures';
import { DemandeDeReleve, SyntheseDesHeuresPort } from '../../domain/releve/SyntheseDesHeuresPort';
import { JourCalendaire } from '../../domain/semaine/JourCalendaire';
import { SemaineISO } from '../../domain/semaine/SemaineISO';

type RestSynthese = components['schemas']['RestSyntheseDesHeures'];
type RestJour = components['schemas']['RestJourDeSynthese'];
type RestPointage = components['schemas']['RestPointageDeSyntheseDesHeures'];
type RestFeuille = components['schemas']['RestFeuilleDeTemps'];
type RestPlage = components['schemas']['RestPlage'];
type RestElement = components['schemas']['RestElementDeLaSynthese'];
type RestActivite = components['schemas']['RestActiviteDeLaFeuilleDeTemps'];
type RestPosteDeLElement = components['schemas']['RestPosteDeLElementDeLaSynthese'];

const SYNTHESE = '/api/syntheses-des-heures/{operateurId}';
const FEUILLE = '/api/feuilles-de-temps/{operateurId}';
const SYNTHESE_INTROUVABLE = 'urn:glm:erreur:synthese-des-heures:operateur-introuvable';
const FEUILLE_INTROUVABLE = 'urn:glm:erreur:feuille-de-temps:operateur-introuvable';

type RestJourDeFeuille = components['schemas']['RestJourDeLaSemaine'];
interface JourDeLaFeuille {
  readonly presence: readonly RestPlage[];
  readonly activites: readonly RestActivite[];
}

type FeuilleParJour = ReadonlyMap<string, JourDeLaFeuille>;

interface SemaineRendue {
  readonly annee?: number;
  readonly semaine?: number;
}

type RestPointageDePresence = RestPointage & { readonly type: 'ARRIVEE' | 'DEPART' };

const estDePresence = (pointage: RestPointage): pointage is RestPointageDePresence =>
  pointage.type !== 'DEBUT' && pointage.type !== 'NON_CONFORMITE' && pointage.type !== 'FIN';

const toPointage = (pointage: RestPointageDePresence): PointageDePresence =>
  new PointageDePresence(pointage.type, new InstantDeReleve(pointage.dateDeSurvenue));

const toPoste = ({ poste, nature }: RestPosteDeLElement): PosteDeLElement =>
  new PosteDeLElement(new PosteReleveId(poste.id), poste.libelle, nature);

const toElement = (element: RestElement): ElementDuReleve =>
  new ElementDuReleve({
    id: new ElementReleveId(element.id),
    type: element.type,
    nom: element.nom,
    reference: element.reference,
    description: element.description,
    duree: new DureeTravaillee(element.duree),
    dureeNonConformite: new DureeTravaillee(element.dureeNonConformite),
    postes: element.postes.map(toPoste),
  });

const toFin = (fin: string | undefined): InstantDeReleve | undefined => (fin === undefined ? undefined : new InstantDeReleve(fin));

const toPlage = (plage: RestPlage): PlageDeReleve =>
  new PlageDeReleve(new InstantDeReleve(required(plage.debut, 'plage.debut')), toFin(plage.fin), plage.presumee);

const toIntervalle = (activite: RestActivite): IntervalleDActivite =>
  new IntervalleDActivite({
    element: new ElementReleveId(activite.element),
    poste: activite.poste === undefined ? undefined : new PosteReleveId(activite.poste),
    nature: activite.nature,
    categorie: activite.categorie,
    debut: new InstantDeReleve(activite.debut),
    fin: toFin(activite.fin),
    presumee: activite.presumee,
  });

const feuilleParJourDe = (jours: readonly RestJourDeFeuille[]): FeuilleParJour =>
  new Map(
    jours.map(jour => [
      required(jour.jour, 'jourDeLaFeuille.jour'),
      { presence: required(jour.presence, 'jourDeLaFeuille.presence'), activites: jour.activites },
    ]),
  );

const neCorrespondPasUnAUn = (
  jours: readonly RestJour[],
  joursDeLaFeuille: readonly RestJourDeFeuille[],
  feuilles: FeuilleParJour,
): boolean => joursDeLaFeuille.length !== jours.length || feuilles.size !== jours.length;

const feuilleDu = (jour: string, feuilles: FeuilleParJour): JourDeLaFeuille => {
  const feuille = feuilles.get(jour);
  if (feuille === undefined) {
    throw new Error('La feuille de temps reçue du serveur ne porte pas les jours de la synthèse.');
  }
  return feuille;
};

const toJour = (jour: RestJour, feuilles: FeuilleParJour): JourDeReleve => {
  const date = required(jour.jour, 'jour.jour');
  const feuille = feuilleDu(date, feuilles);
  return new JourDeReleve({
    jour: new JourCalendaire(date),
    operationnelPointe: new DureeTravaillee(jour.dureeOperationnelle),
    operationnelPresume: new DureeTravaillee(jour.dureeOperationnellePresumee),
    intervalles: feuille.activites.map(toIntervalle),
    pointages: required(jour.pointages, 'jour.pointages').filter(estDePresence).map(toPointage),
    plages: feuille.presence.map(toPlage),
  });
};

const toJours = (synthese: RestSynthese, feuille: RestFeuille): readonly JourDeReleve[] => {
  const jours = required(synthese.jours, 'synthese.jours');
  const joursDeLaFeuille = required(feuille.jours, 'feuille.jours');
  const feuilles = feuilleParJourDe(joursDeLaFeuille);
  if (neCorrespondPasUnAUn(jours, joursDeLaFeuille, feuilles)) {
    throw new Error('La feuille de temps reçue du serveur ne porte pas les jours de la synthèse.');
  }
  return jours.map(jour => toJour(jour, feuilles));
};

const toIdentite = (synthese: RestSynthese): IdentiteOperateur => {
  const operateur = required(synthese.operateur, 'synthese.operateur');
  return new IdentiteOperateur(operateur.nom, operateur.prenom);
};

const verifieLaSemaine = (document: SemaineRendue, source: string, demandee: SemaineISO): void => {
  const rendue = new SemaineISO(required(document.annee, `${source}.annee`), required(document.semaine, `${source}.semaine`));
  if (!rendue.estLaMeme(demandee)) {
    throw new Error('La semaine reçue du serveur n’est pas celle demandée.');
  }
};

const toReleve = (synthese: RestSynthese, feuille: RestFeuille, demandee: SemaineISO): ReleveDesHeures => {
  verifieLaSemaine(synthese, 'synthese', demandee);
  verifieLaSemaine(feuille, 'feuille', demandee);
  return new ReleveDesHeures(demandee, {
    operateur: toIdentite(synthese),
    elements: synthese.elements.map(toElement),
    jours: toJours(synthese, feuille),
    presencePointee: new DureeTravaillee(required(synthese.dureeTotale, 'synthese.dureeTotale')),
    presencePresumee: new DureeTravaillee(required(synthese.dureePresumeeTotale, 'synthese.dureePresumeeTotale')),
    operationnelPointe: new DureeTravaillee(synthese.dureeOperationnelleTotale),
    operationnelPresume: new DureeTravaillee(synthese.dureeOperationnellePresumeeTotale),
  });
};

const estIntrouvable = (lecture: PromiseSettledResult<unknown>, urn: string): boolean =>
  lecture.status === 'rejected' && findApiErrorIn(lecture.reason)?.urn === urn;

const operateurIntrouvable = (synthese: PromiseSettledResult<RestSynthese>, feuille: PromiseSettledResult<RestFeuille>): boolean =>
  estIntrouvable(synthese, SYNTHESE_INTROUVABLE) || estIntrouvable(feuille, FEUILLE_INTROUVABLE);

const documentDe = <T>(lecture: PromiseSettledResult<T>): T => {
  if (lecture.status === 'rejected') {
    throw lecture.reason;
  }
  return lecture.value;
};

@Injectable()
export class HttpSyntheseDesHeures extends SyntheseDesHeuresPort {
  private readonly api = inject(ApiClient);
  private readonly errors = inject(ErrorHandlerPort);

  override async synthese(demande: DemandeDeReleve): Promise<ReleveDesHeures | undefined> {
    const [synthese, feuille] = await Promise.allSettled([this.readSynthese(demande), this.readFeuille(demande)]);
    if (operateurIntrouvable(synthese, feuille)) {
      return undefined;
    }
    try {
      return toReleve(documentDe(synthese), documentDe(feuille), demande.semaine);
    } catch (failure) {
      this.errors.handleError(failure);
      throw failure;
    }
  }

  private readSynthese(demande: DemandeDeReleve): Promise<RestSynthese> {
    return this.api.read(SYNTHESE, {
      pathParams: { operateurId: demande.operateur.value },
      queryParams: { annee: demande.semaine.annee, semaine: demande.semaine.numero },
    });
  }

  private readFeuille(demande: DemandeDeReleve): Promise<RestFeuille> {
    return this.api.read(FEUILLE, {
      pathParams: { operateurId: demande.operateur.value },
      queryParams: { annee: demande.semaine.annee, semaine: demande.semaine.numero },
    });
  }
}
