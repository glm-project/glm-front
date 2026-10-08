import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { findApiErrorIn } from '@/app/shared/api-client/infrastructure/secondary/findApiErrorIn';
import { required } from '@/app/shared/api-client/infrastructure/secondary/required';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { PAGE_SIZE } from '@/app/shared/pagination/infrastructure/secondary/buildPageFrom';
import { inject, Injectable } from '@angular/core';
import { DureeTravaillee } from '../../domain/duree/DureeTravaillee';
import { TotalDeDuree } from '../../domain/duree/TotalDeDuree';
import { ActiviteDuReleve } from '../../domain/element/ActiviteDuReleve';
import { CategorieDElement } from '../../domain/element/CategorieDElement';
import { ElementDuReleve } from '../../domain/element/ElementDuReleve';
import { ElementReleveId } from '../../domain/element/ElementReleveId';
import { IntervalleDActivite } from '../../domain/element/IntervalleDActivite';
import { PosteDeLElement } from '../../domain/element/PosteDeLElement';
import { PosteReleveId } from '../../domain/element/PosteReleveId';
import { ActiviteReleveId } from '../../domain/releve/ActiviteReleveId';
import { CibleDePointage } from '../../domain/releve/CibleDePointage';
import { IdentiteOperateur } from '../../domain/releve/IdentiteOperateur';
import { InstantDeReleve } from '../../domain/releve/InstantDeReleve';
import { JourDeReleve } from '../../domain/releve/JourDeReleve';
import { OperateurDuReleve } from '../../domain/releve/OperateurDuReleve';
import { OperateurReleveId } from '../../domain/releve/OperateurReleveId';
import { PointageDElement } from '../../domain/releve/PointageDElement';
import { PointageDeReleve } from '../../domain/releve/PointageDeReleve';
import { PointageReleveId } from '../../domain/releve/PointageReleveId';
import { ReleveDesHeures } from '../../domain/releve/ReleveDesHeures';
import { SequenceEnConflit } from '../../domain/releve/SequenceEnConflit';
import { DemandeDeReleve, SyntheseDesHeuresPort } from '../../domain/releve/SyntheseDesHeuresPort';
import { JourCalendaire } from '../../domain/semaine/JourCalendaire';
import { SemaineISO } from '../../domain/semaine/SemaineISO';

type RestSynthese = components['schemas']['RestSyntheseDesHeures'];
type RestJour = components['schemas']['RestJourDeSynthese'];
type RestPointage = components['schemas']['RestPointageDeSyntheseDesHeures'];
type RestFeuille = components['schemas']['RestFeuilleDeTemps'];
type RestElement = components['schemas']['RestElementDeLaSynthese'];
type RestActivite = components['schemas']['RestActiviteDeLaFeuilleDeTemps'];
type RestPosteDeLElement = components['schemas']['RestPosteDeLElementDeLaSynthese'];

const SYNTHESE = '/api/syntheses-des-heures/{operateurId}';
const FEUILLE = '/api/feuilles-de-temps/{operateurId}';
const SYNTHESE_INTROUVABLE = 'urn:glm:erreur:synthese-des-heures:operateur-introuvable';
const FEUILLE_INTROUVABLE = 'urn:glm:erreur:feuille-de-temps:operateur-introuvable';

type RestJourDeFeuille = components['schemas']['RestJourDeLaSemaine'];
interface JourDeLaFeuille {
  readonly activites: readonly RestActivite[];
}

type FeuilleParJour = ReadonlyMap<string, JourDeLaFeuille>;

interface SemaineRendue {
  readonly annee?: number;
  readonly semaine?: number;
}

const toCible = (pointage: RestPointage): CibleDePointage =>
  new CibleDePointage(new ElementReleveId(pointage.element), pointage.poste === undefined ? undefined : new PosteReleveId(pointage.poste));

const toPointage = (pointage: RestPointage): PointageDeReleve =>
  new PointageDElement({
    id: new PointageReleveId(pointage.id),
    type: pointage.type,
    instant: new InstantDeReleve(pointage.dateDeSurvenue),
    cible: toCible(pointage),
    intention:
      pointage.intention === 'OUVERTURE'
        ? { type: 'OUVERTURE' }
        : { type: pointage.intention, activiteVisee: new ActiviteReleveId(required(pointage.cible, 'pointage.cible')) },
  });

const toTotal = (duree: components['schemas']['RestDureeDeSynthese']): TotalDeDuree =>
  duree.complete ? TotalDeDuree.complet(new DureeTravaillee(required(duree.valeur, 'duree.valeur'))) : TotalDeDuree.incomplet();

const toPoste = ({ poste, nature }: RestPosteDeLElement): PosteDeLElement =>
  new PosteDeLElement(new PosteReleveId(poste.id), poste.libelle, nature);

const CATEGORIE_DU_TYPE = { ORDRE_DE_FABRICATION: 'OF', PRODUIT: 'MOULE' } as const;

const toElement = (element: RestElement): ElementDuReleve =>
  new ElementDuReleve({
    id: new ElementReleveId(element.id),
    categorie: new CategorieDElement(CATEGORIE_DU_TYPE[element.type]),
    nom: element.nom,
    reference: element.reference,
    description: element.description,
    duree: toTotal(element.duree),
    dureeNonConformite: toTotal(element.dureeNonConformite),
    postes: element.postes.map(toPoste),
  });

const toFin = (fin: string | undefined): InstantDeReleve | undefined => (fin === undefined ? undefined : new InstantDeReleve(fin));

const toActivite = (activite: components['schemas']['RestActiviteInterpreteeDeLaFeuilleDeTemps']): ActiviteDuReleve => {
  const commun = { id: new ActiviteReleveId(activite.id), debut: new InstantDeReleve(activite.debut) };
  switch (activite.etat) {
    case 'TERMINEE':
    case 'TERMINEE_AUTOMATIQUEMENT':
      return { ...commun, etat: activite.etat, fin: new InstantDeReleve(required(activite.fin, 'activite.fin')) };
    case 'EN_COURS':
      return { ...commun, etat: activite.etat };
    case 'A_RESOUDRE':
      return { ...commun, etat: activite.etat, finAuPlusTard: toFin(activite.finAuPlusTard) };
  }
};

const toConflit = (conflit: components['schemas']['RestConflitDeSynthese']): SequenceEnConflit =>
  new SequenceEnConflit(
    new CibleDePointage(new ElementReleveId(conflit.element), conflit.poste === undefined ? undefined : new PosteReleveId(conflit.poste)),
    conflit.activites.map(id => new ActiviteReleveId(id)),
    conflit.pointages.map(id => new PointageReleveId(id)),
  );

const toIntervalle = (activite: RestActivite): IntervalleDActivite =>
  new IntervalleDActivite({
    element: new ElementReleveId(activite.element),
    poste: activite.poste === undefined ? undefined : new PosteReleveId(activite.poste),
    nature: activite.nature,
    categorie: activite.categorie,
    debut: new InstantDeReleve(activite.debut),
    fin: toFin(activite.fin),
    activite: toActivite(activite.activite),
  });

const feuilleParJourDe = (jours: readonly RestJourDeFeuille[]): FeuilleParJour =>
  new Map(jours.map(jour => [required(jour.jour, 'jourDeLaFeuille.jour'), { activites: jour.activites }]));

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
    operationnelTotal: toTotal(jour.dureeOperationnelle),
    intervalles: feuille.activites.map(toIntervalle),
    pointages: required(jour.pointages, 'jour.pointages').map(toPointage),
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
    operationnelTotal: toTotal(synthese.dureeOperationnelleTotale),
    conflits: synthese.conflits.map(toConflit),
  });
};

const verifieEvaluation = (echo: string, attendue: InstantDeReleve): void => {
  if (!new InstantDeReleve(echo).estLeMeme(attendue)) {
    throw new Error('Les rapports reçus du serveur ne portent pas l’instant d’évaluation demandé.');
  }
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

const pageIncoherente = (response: components['schemas']['PageRestOperateur'], page: number): boolean =>
  response.currentPage !== page || response.pageSize !== PAGE_SIZE;

const totalIncoherent = (attendu: number | undefined, recu: number): boolean =>
  (attendu !== undefined && attendu !== recu) || !Number.isSafeInteger(recu) || recu < 0;

const verifyOperateursPage = (
  response: components['schemas']['PageRestOperateur'],
  page: number,
  total: number | undefined,
  acquired: number,
): void => {
  if (pageIncoherente(response, page)) {
    throw new Error('La collection des opérateurs est incohérente.');
  }
  if (totalIncoherent(total, response.totalElementsCount)) {
    throw new Error('Le nombre des opérateurs est incohérent pendant la lecture.');
  }
  if (response.content.length !== Math.min(PAGE_SIZE, response.totalElementsCount - acquired)) {
    throw new Error('La collection des opérateurs est tronquée.');
  }
};

@Injectable()
export class HttpSyntheseDesHeures extends SyntheseDesHeuresPort {
  private readonly api = inject(ApiClient);
  private readonly errors = inject(ErrorHandlerPort);

  override async operateurs(): Promise<readonly OperateurDuReleve[]> {
    try {
      const operateurs: OperateurDuReleve[] = [];
      let page = 0;
      let total: number | undefined;
      do {
        const response = await this.api.read('/api/operateurs', { queryParams: { page, size: PAGE_SIZE } });
        verifyOperateursPage(response, page, total, operateurs.length);
        total = response.totalElementsCount;
        operateurs.push(
          ...response.content.map(operateur => ({
            id: new OperateurReleveId(operateur.id),
            identite: new IdentiteOperateur(operateur.nom, operateur.prenom),
          })),
        );
        page += 1;
      } while (operateurs.length < total);
      if (new Set(operateurs.map(operateur => operateur.id.value)).size !== operateurs.length) {
        throw new Error('La collection des opérateurs contient une identité dupliquée.');
      }
      return operateurs;
    } catch (failure) {
      this.errors.handleError(failure);
      throw failure;
    }
  }

  override async synthese(demande: DemandeDeReleve): Promise<ReleveDesHeures | undefined> {
    const evaluation = new Date().toISOString();
    const [synthese, feuille] = await Promise.allSettled([this.readSynthese(demande, evaluation), this.readFeuille(demande, evaluation)]);
    if (operateurIntrouvable(synthese, feuille)) {
      return undefined;
    }
    try {
      const documentDeSynthese = documentDe(synthese);
      const documentDeFeuille = documentDe(feuille);
      const instant = new InstantDeReleve(evaluation);
      verifieEvaluation(documentDeSynthese.evaluation, instant);
      verifieEvaluation(documentDeFeuille.evaluation, instant);
      return toReleve(documentDeSynthese, documentDeFeuille, demande.semaine);
    } catch (failure) {
      this.errors.handleError(failure);
      throw failure;
    }
  }

  private readSynthese(demande: DemandeDeReleve, evaluation: string): Promise<RestSynthese> {
    return this.api.read(SYNTHESE, {
      pathParams: { operateurId: demande.operateur.value },
      queryParams: { annee: demande.semaine.annee, semaine: demande.semaine.numero, evaluation },
    });
  }

  private readFeuille(demande: DemandeDeReleve, evaluation: string): Promise<RestFeuille> {
    return this.api.read(FEUILLE, {
      pathParams: { operateurId: demande.operateur.value },
      queryParams: { annee: demande.semaine.annee, semaine: demande.semaine.numero, evaluation },
    });
  }
}
