import {
  formatCalendarDayFullWithYear,
  formatCalendarDayLong,
  formatInstantTime,
  formatInstantWeekdayDay,
} from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { IssueDeCorrection } from '../../application/CorrectionDUneActivite';
import { MotifDAjout, MotifDeChangementDePoste } from '../../domain/correction/CorrectionsPort';
import { ErreurDePlage } from '../../domain/correction/PlageDAjout';
import { ActiviteDeLaJournee, ActiviteTerminee } from '../../domain/journee/ActiviteDeLaJournee';
import { BornesDuJour } from '../../domain/journee/BornesDuJour';
import { CategorieDActivite } from '../../domain/journee/CategorieDActivite';
import { Duree } from '../../domain/journee/Duree';
import { ElementDeLaJournee } from '../../domain/journee/ElementDeLaJournee';
import { InstantDeLaJournee } from '../../domain/journee/InstantDeLaJournee';
import { JourACorriger } from '../../domain/journee/JourACorriger';
import { PosteDeLaJournee } from '../../domain/journee/PosteDeLaJournee';

const MINUTES_PAR_HEURE = 60;
const MILLISECONDES_PAR_MINUTE = 60_000;
const SANS_POSTE = 'Sans poste';
const EN_COURS = 'en cours';
const FIN_AUTOMATIQUE = 'fin automatique';

const heure = (instant: InstantDeLaJournee): string => formatInstantTime(instant.value);

const jourEtHeure = (instant: InstantDeLaJournee): string => `${formatInstantWeekdayDay(instant.value)} à ${heure(instant)}`;

const jourEtHeureSeparees = (instant: InstantDeLaJournee): string => `${formatInstantWeekdayDay(instant.value)}, ${heure(instant)}`;

const duree = (valeur: Duree): string => {
  const minutes = Math.floor(valeur.millisecondes / MILLISECONDES_PAR_MINUTE);
  return `${Math.floor(minutes / MINUTES_PAR_HEURE)} h ${String(minutes % MINUTES_PAR_HEURE).padStart(2, '0')}`;
};

const avantApres = (avant: Duree, apres: Duree): string => `${duree(avant)} → ${duree(apres)}`;

const operationnelDuJour = (jour: JourACorriger): string => `Opérationnel du ${formatCalendarDayLong(jour.value)}`;

const nomDeLElement = (element: ElementDeLaJournee): string => `${element.categorie.value} ${element.numero()}`;

const plageHoraire = (debut: InstantDeLaJournee, fin: InstantDeLaJournee): string => `${heure(debut)} → ${heure(fin)}`;

const libelleDuPoste = (poste: PosteDeLaJournee | undefined): string => poste?.libelle ?? SANS_POSTE;

const posteDe = (activite: ActiviteDeLaJournee): string => libelleDuPoste(activite.poste);

const depuis = (activite: ActiviteDeLaJournee, bornes: BornesDuJour): string =>
  `depuis ${activite.debutAvantLeJour(bornes) === undefined ? heure(activite.debut) : jourEtHeure(activite.debut)}`;

const horaires = (activite: ActiviteDeLaJournee, bornes: BornesDuJour): string =>
  activite.etat.kind === 'EN_COURS' ? depuis(activite, bornes) : `${heure(activite.debut)} → ${heure(activite.etat.fin)}`;

const etatDe = (activite: ActiviteDeLaJournee): string | undefined => {
  switch (activite.etat.kind) {
    case 'EN_COURS':
      return EN_COURS;
    case 'TERMINEE_AUTOMATIQUEMENT':
      return FIN_AUTOMATIQUE;
    case 'TERMINEE':
      return undefined;
  }
};

const perteSurUnAutreJour = ({ jour, retire }: { readonly jour: JourACorriger; readonly retire: Duree }): string =>
  `le ${formatCalendarDayLong(jour.value)} perd aussi ${duree(retire)}`;

const nomDuPoste = (poste: PosteDeLaJournee): string => `${poste.libelle} · ${poste.nature}`;

const REFUS_DU_CHANGEMENT_DE_POSTE: Record<MotifDeChangementDePoste, string> = {
  CHEVAUCHEMENT: 'Une autre activité de cet élément se chevauche déjà sur ce poste.',
};

const REFUS_DE_L_AJOUT: Record<MotifDAjout, string> = {
  CHEVAUCHEMENT: 'Une autre activité de cet élément se chevauche déjà sur ce poste.',
  FIN_FUTURE: 'La fin dépasse l’heure du serveur. Choisissez une heure plus tôt ou réessayez dans un instant.',
};

const ANNONCES_DE_L_AJOUT: Record<IssueDeCorrection, string> = {
  ENREGISTREE: 'Activité ajoutée',
  JOURNEE_CHANGEE: 'La journée a changé, recommencez',
};

const erreurDePlage = (erreur: ErreurDePlage, jour: JourACorriger): string => {
  switch (erreur.kind) {
    case 'HEURE_MAL_ECRITE':
      return 'Heure attendue au format 00:00.';
    case 'HEURES_MANQUANTES':
      return 'Saisissez le début et la fin.';
    case 'HORS_DU_JOUR':
      return `${erreur.champ === 'DEBUT' ? 'Le début' : 'La fin'} doit tomber le ${formatCalendarDayLong(jour.value)}.`;
    case 'FIN_NON_APRES_DEBUT':
      return 'La fin doit suivre le début.';
    case 'FIN_APRES_MAINTENANT':
      return 'La fin ne peut pas suivre l’heure actuelle.';
    case 'DEBUT_AVANT_ENGAGEMENT':
      return `Le début précède l’engagement de l’élément, le ${jourEtHeure(erreur.engagement)}.`;
    case 'FIN_APRES_CLOTURE':
      return `La fin suit la clôture de l’élément, le ${jourEtHeure(erreur.cloture)}.`;
  }
};

const ANNONCES_DU_CHANGEMENT_DE_POSTE: Record<IssueDeCorrection, string> = {
  ENREGISTREE: 'Poste modifié',
  JOURNEE_CHANGEE: 'La journée a changé, recommencez',
};

const ANNONCES_DU_RETRAIT: Record<IssueDeCorrection, string> = {
  ENREGISTREE: 'Activité retirée',
  JOURNEE_CHANGEE: 'La journée a changé, recommencez',
};

const TYPES: Record<CategorieDActivite, string> = { TRAVAIL: 'Travail', NON_CONFORMITE: 'Non-conformité' };

export const LIBELLES_CORRECTION_DES_ACTIVITES = {
  page: {
    titre: 'Corriger la journée',
    retour: (identite: string | undefined): string => (identite === undefined ? 'Temps opérationnel' : `Temps opérationnel de ${identite}`),
    identite: (nom: string, prenom: string): string => `${prenom} ${nom.toLocaleUpperCase('fr-FR')}`,
    jour: (jour: JourACorriger): string => formatCalendarDayFullWithYear(jour.value),
    voirLeJour: (jour: JourACorriger): string => `Voir le ${formatCalendarDayLong(jour.value)}`,
    chargement: 'Chargement de la journée…',
    introuvable: 'Opérateur introuvable',
    echec: 'Impossible de charger la journée. Vérifiez la connexion puis réessayez.',
    reessayer: 'Réessayer',
    adresseInvalide: 'Cette adresse ne désigne pas un jour que l’on peut corriger. Revenez au relevé.',
  },
  activites: {
    titre: (nombre: number): string => `Activités du jour · ${nombre}`,
    vide: 'Aucune activité ce jour',
  },
  frise: {
    titre: 'La journée',
    operationnel: 'Opérationnel',
    colonneElement: 'Élément',
    vide: 'Aucune activité ce jour',
    repere: (minutes: number): string => `${Math.floor(minutes / MINUTES_PAR_HEURE)} h`,
    barre: (activite: ActiviteDeLaJournee, bornes: BornesDuJour): string =>
      [
        nomDeLElement(activite.element),
        posteDe(activite),
        horaires(activite, bornes),
        TYPES[activite.categorie].toLowerCase(),
        etatDe(activite),
      ]
        .filter(partie => partie !== undefined)
        .join(', '),
    debutPointe: (instant: InstantDeLaJournee): string => `Début ${heure(instant)}`,
    finPointee: (instant: InstantDeLaJournee): string => `Fin ${heure(instant)}`,
    debutAvant: (instant: InstantDeLaJournee): string => `← début le ${jourEtHeure(instant)}`,
    enCoursDepuis: (instant: InstantDeLaJournee): string => `← en cours depuis ${jourEtHeure(instant)}`,
    suite: (instant: InstantDeLaJournee): string => `suite le ${formatInstantWeekdayDay(instant.value)} →`,
    legende: {
      travail: 'Travail',
      nonConformite: 'Non-conformité',
      enCours: 'En cours',
      finAutomatique: 'Fin automatique',
      debut: 'Début',
      fin: 'Fin',
    },
  },
  duree,
  avantApres,
  nomDeLElement,
  posteDe,
  horaires,
  etatDe,
  clotureLe: (instant: InstantDeLaJournee): string => `Clôturé le ${jourEtHeure(instant)}`,
  surLeTotal: (total: Duree): string => `sur ${duree(total)}`,
  debutLe: (jour: JourACorriger): string => `début le ${formatCalendarDayLong(jour.value)}`,
  finLe: (jour: JourACorriger): string => `fin le ${formatCalendarDayLong(jour.value)}`,
  type: (categorie: CategorieDActivite): string => TYPES[categorie],
  changement: {
    bouton: (activite: ActiviteDeLaJournee, bornes: BornesDuJour): string =>
      `Changer le poste de l’activité ${nomDeLElement(activite.element)}, ${horaires(activite, bornes)}`,
    titre: 'Changer le poste',
    horaires: (activite: ActiviteTerminee): string =>
      activite.estACheval()
        ? `Du ${jourEtHeureSeparees(activite.debut)}, au ${jourEtHeureSeparees(activite.etat.fin)}`
        : `${heure(activite.debut)} → ${heure(activite.etat.fin)}`,
    poste: 'Poste',
    nomDuPoste,
    etait: (poste: PosteDeLaJournee | undefined): string => `Était : ${poste === undefined ? SANS_POSTE : nomDuPoste(poste)}`,
    aucunAutrePoste: 'Aucun autre poste habilité pour cet opérateur.',
    effet: 'Effet sur les journées',
    tempsInchange: 'Le temps ne change pas',
    enregistrer: 'Enregistrer',
    enregistrement: 'Enregistrement…',
    abandonner: 'Abandonner',
    refus: REFUS_DU_CHANGEMENT_DE_POSTE,
    echec: 'Le changement de poste n’a pas abouti. Vérifiez la connexion puis réessayez.',
    annonce: ANNONCES_DU_CHANGEMENT_DE_POSTE,
  },
  ajout: {
    bouton: 'Ajouter une activité',
    titre: 'Ajouter une activité',
    element: 'Élément',
    choisirElement: 'Choisir un élément',
    rechercherElement: 'Rechercher un élément',
    aucunElement: 'Aucun élément présent ce jour',
    aucunResultat: 'Aucun élément ne correspond',
    elementManquant: 'Choisissez un élément.',
    nomDeLElement: (element: ElementDeLaJournee): string =>
      element.description === undefined ? nomDeLElement(element) : `${nomDeLElement(element)} · ${element.description}`,
    poste: 'Poste',
    nomDuPoste,
    aucunPoste: 'Aucun poste habilité pour cet opérateur.',
    type: 'Type',
    types: TYPES,
    debut: 'De',
    fin: 'À',
    heure: 'hh:mm',
    effet: 'Effet sur les journées',
    operationnelDuJour,
    avantApres,
    duree,
    sansEffet: 'Saisissez un début et une fin pour voir l’effet.',
    ajouter: 'Ajouter l’activité',
    ajoutEnCours: 'Ajout en cours…',
    abandonner: 'Abandonner',
    erreur: erreurDePlage,
    refus: REFUS_DE_L_AJOUT,
    echec: 'L’ajout n’a pas abouti. Vérifiez la connexion puis réessayez.',
    annonce: ANNONCES_DE_L_AJOUT,
    aAjouter: 'À ajouter',
    barreAAjouter: (
      element: ElementDeLaJournee | undefined,
      poste: PosteDeLaJournee | undefined,
      categorie: CategorieDActivite,
      debut: InstantDeLaJournee,
      fin: InstantDeLaJournee,
    ): string =>
      `À ajouter : ${[
        element === undefined ? undefined : nomDeLElement(element),
        libelleDuPoste(poste),
        plageHoraire(debut, fin),
        TYPES[categorie].toLowerCase(),
      ]
        .filter(partie => partie !== undefined)
        .join(', ')}`,
    libelleDuPoste,
  },
  retrait: {
    bouton: (activite: ActiviteDeLaJournee, bornes: BornesDuJour): string =>
      `Retirer l’activité ${nomDeLElement(activite.element)}, ${horaires(activite, bornes)}`,
    titre: (activite: ActiviteTerminee): string =>
      activite.estACheval()
        ? `Retirer l’activité du ${jourEtHeureSeparees(activite.debut)}, au ${jourEtHeureSeparees(activite.etat.fin)} ?`
        : `Retirer l’activité de ${heure(activite.debut)} à ${heure(activite.etat.fin)} ?`,
    garder: 'Garder l’activité',
    retirer: 'Retirer l’activité',
    enCours: 'Retrait en cours…',
    echec: 'Le retrait n’a pas abouti. Vérifiez la connexion puis réessayez.',
    operationnelDuJour,
    avantApres,
    autreJour: (jour: JourACorriger): string => formatCalendarDayLong(jour.value),
    retire: (retire: Duree): string => `− ${duree(retire)}`,
    debordement: (jours: readonly { readonly jour: JourACorriger; readonly retire: Duree }[]): string =>
      `Le retrait vaut pour toute l’activité : ${jours.map(perteSurUnAutreJour).join(' et ')}.`,
    annonce: ANNONCES_DU_RETRAIT,
  },
} as const;
