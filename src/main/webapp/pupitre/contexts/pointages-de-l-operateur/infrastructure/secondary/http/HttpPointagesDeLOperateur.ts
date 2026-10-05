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
import { EtatDeLigne, LigneDePointage } from '../../../domain/LigneDePointage';
import { PointagesDeLaSemaine } from '../../../domain/PointagesDeLaSemaine';
import { PointagesDeLOperateurPort } from '../../../domain/PointagesDeLOperateurPort';
import { JourCalendaire } from '../../../domain/semaine/JourCalendaire';
import { SemaineISO } from '../../../domain/semaine/SemaineISO';

type RestSynthese = components['schemas']['RestSyntheseDesHeures'];
type RestFeuille = components['schemas']['RestFeuilleDeTemps'];
type RestDuree = components['schemas']['RestDureeDeSynthese'];
type RestActivite = components['schemas']['RestActiviteDeLaFeuilleDeTemps'];

const SYNTHESE = '/api/syntheses-des-heures/{operateurId}';
const FEUILLE = '/api/feuilles-de-temps/{operateurId}';

interface Libelles {
  readonly elements: ReadonlyMap<string, string>;
  readonly postes: ReadonlyMap<string, string>;
}

const toTotal = (duree: RestDuree): TotalDeDuree =>
  duree.complete ? TotalDeDuree.complet(new DureeTravaillee(required(duree.valeur, 'duree.valeur'))) : TotalDeDuree.incomplet();

const libellesDe = (synthese: RestSynthese): Libelles => ({
  elements: new Map(synthese.elements.map(element => [element.id, element.reference ?? element.nom])),
  postes: new Map(synthese.elements.flatMap(element => element.postes.map(({ poste }) => [poste.id, poste.libelle] as const))),
});

const libelleDe = (libelles: ReadonlyMap<string, string>, id: string, nature: string): string => {
  const libelle = libelles.get(id);
  if (libelle === undefined) {
    throw new Error(`La feuille de temps cite ${nature} ${id}, absent de la synthèse des heures.`);
  }
  return libelle;
};

const toEtat = (activite: RestActivite): EtatDeLigne => {
  const etat = activite.activite.etat;
  return etat === 'TERMINEE' || etat === 'TERMINEE_AUTOMATIQUEMENT' ? { etat, fin: new Date(required(activite.fin, 'fin')) } : { etat };
};

const toLigne = (activite: RestActivite, libelles: Libelles): LigneDePointage =>
  new LigneDePointage(
    {
      element: libelleDe(libelles.elements, activite.element, 'l’élément'),
      poste: activite.poste === undefined ? undefined : libelleDe(libelles.postes, activite.poste, 'le poste'),
      categorie: activite.categorie,
      debut: new Date(activite.debut),
    },
    toEtat(activite),
  );

const verifieLEvaluation = (recue: string, demandee: InstantDEvaluation): void => {
  if (!new InstantDEvaluation(recue).estLeMeme(demandee)) {
    throw new Error(`Le serveur a évalué les pointages à ${recue}, pas à l’instant demandé.`);
  }
};

const verifieLaSemaine = (lecture: RestSynthese | RestFeuille, demandee: SemaineISO): void => {
  const recue = new SemaineISO(required(lecture.annee, 'annee'), required(lecture.semaine, 'semaine'));
  if (!recue.estLaMeme(demandee)) {
    throw new Error(`Le serveur a rendu la semaine ${String(recue.numero)} de ${String(recue.annee)} au lieu de celle demandée.`);
  }
};

const verifieLaLecture = (lecture: RestSynthese | RestFeuille, demande: DemandeDePointages, evaluation: InstantDEvaluation): void => {
  verifieLEvaluation(lecture.evaluation, evaluation);
  verifieLaSemaine(lecture, demande.semaine);
};

const activitesParJour = (feuille: RestFeuille): ReadonlyMap<string, readonly RestActivite[]> =>
  new Map(required(feuille.jours, 'jours').map(jour => [required(jour.jour, 'jour'), jour.activites] as const));

const toSemaine = (synthese: RestSynthese, feuille: RestFeuille, demande: DemandeDePointages): PointagesDeLaSemaine => {
  const libelles = libellesDe(synthese);
  const activites = activitesParJour(feuille);
  const jours = required(synthese.jours, 'jours').map(jour => {
    const date = required(jour.jour, 'jour');
    const lignes = (activites.get(date) ?? []).map(activite => toLigne(activite, libelles));
    return new JourDePointages(new JourCalendaire(date), toTotal(jour.dureeOperationnelle), lignes);
  });
  return new PointagesDeLaSemaine(demande.semaine, toTotal(synthese.dureeOperationnelleTotale), jours);
};

@Injectable()
export class HttpPointagesDeLOperateur extends PointagesDeLOperateurPort {
  private readonly api = inject(ApiClient);
  private readonly errors = inject(ErrorHandlerPort);

  override async semaine(demande: DemandeDePointages): Promise<PointagesDeLaSemaine> {
    const evaluation = new Date().toISOString();
    try {
      const [synthese, feuille] = await Promise.all([this.readSynthese(demande, evaluation), this.readFeuille(demande, evaluation)]);
      const instant = new InstantDEvaluation(evaluation);
      verifieLaLecture(synthese, demande, instant);
      verifieLaLecture(feuille, demande, instant);
      return toSemaine(synthese, feuille, demande);
    } catch (failure: unknown) {
      this.errors.handleError(failure);
      throw failure;
    }
  }

  private readSynthese(demande: DemandeDePointages, evaluation: string): Promise<RestSynthese> {
    return this.api.read(SYNTHESE, {
      pathParams: { operateurId: demande.operateur.value },
      queryParams: { annee: demande.semaine.annee, semaine: demande.semaine.numero, evaluation },
    });
  }

  private readFeuille(demande: DemandeDePointages, evaluation: string): Promise<RestFeuille> {
    return this.api.read(FEUILLE, {
      pathParams: { operateurId: demande.operateur.value },
      queryParams: { annee: demande.semaine.annee, semaine: demande.semaine.numero, evaluation },
    });
  }
}
