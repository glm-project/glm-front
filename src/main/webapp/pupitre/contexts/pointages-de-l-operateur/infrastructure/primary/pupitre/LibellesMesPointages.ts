import { DureeTravaillee } from '../../../domain/duree/DureeTravaillee';
import { TotalDeDuree } from '../../../domain/duree/TotalDeDuree';
import { JourDePointages } from '../../../domain/JourDePointages';
import { LigneDePointage } from '../../../domain/LigneDePointage';
import { PointagesDeLaSemaine } from '../../../domain/PointagesDeLaSemaine';
import { JourCalendaire } from '../../../domain/semaine/JourCalendaire';
import { SemaineISO } from '../../../domain/semaine/SemaineISO';

const JOUR_COURT = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const DATE_COURTE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const DATE_AVEC_ANNEE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const JOUR_LONG = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const JOUR_LONG_AVEC_ANNEE = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const HEURE = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

const enDate = (jour: JourCalendaire): Date => new Date(`${jour.value}T00:00:00Z`);

const avecMajuscule = (texte: string): string => `${texte.charAt(0).toUpperCase()}${texte.slice(1)}`;

const heuresEtMinutes = (duree: DureeTravaillee): string => `${String(duree.heures)} h ${String(duree.minutesRestantes).padStart(2, '0')}`;

const duree = (total: TotalDeDuree): string => {
  const lecture = total.snapshot();
  return lecture.complete ? heuresEtMinutes(lecture.valeur) : '—';
};

const FIN_INCONNUE = { EN_COURS: '…', A_RESOUDRE: '?' } as const;

const plage = (ligne: LigneDePointage): string =>
  `${HEURE.format(ligne.activite.debut)} → ${'fin' in ligne.etat ? HEURE.format(ligne.etat.fin) : FIN_INCONNUE[ligne.etat.etat]}`;

const MENTIONS_DE_LIGNE = {
  TERMINEE: '',
  TERMINEE_AUTOMATIQUEMENT: 'fin automatique',
  EN_COURS: 'EN COURS',
  A_RESOUDRE: 'à vérifier',
} as const;

const mentionDeLaLigne = (ligne: LigneDePointage): string => MENTIONS_DE_LIGNE[ligne.etat.etat];

const estIncomplet = (total: TotalDeDuree): boolean => !total.snapshot().complete;

const libelleDuTotalDuJour = (jourAffiche: JourDePointages): string => (estIncomplet(jourAffiche.total) ? 'à vérifier' : 'pointées');

const activitesEnCours = (nombre: number): string =>
  nombre === 1
    ? '1 activité en cours : comptée quand vous l’arrêterez.'
    : `${String(nombre)} activités en cours : comptées quand vous les arrêterez.`;

const explications = (jourAffiche: JourDePointages): readonly string[] => [
  ...(jourAffiche.aUnPointageAVerifier()
    ? ['Un pointage n’a pas de fin connue : le responsable doit le corriger avant que le total s’affiche.']
    : []),
  ...(jourAffiche.aUneFinAutomatique()
    ? ['Un pointage n’a pas été arrêté : il s’est terminé tout seul après 13 h. Signalez-le au responsable.']
    : []),
  ...(jourAffiche.activitesEnCours() > 0 ? [activitesEnCours(jourAffiche.activitesEnCours())] : []),
];

const noteDuJour = (jourPointe: JourDePointages): string =>
  [
    ...(estIncomplet(jourPointe.total) ? ['à vérifier'] : []),
    ...(jourPointe.aUneFinAutomatique() ? ['fin automatique'] : []),
    ...(jourPointe.activitesEnCours() > 0 ? ['+ en cours'] : []),
  ].join(' · ');

const noteDeLaSemaine = (semaine: PointagesDeLaSemaine): string => {
  if (estIncomplet(semaine.total)) return 'à vérifier par le responsable';
  return semaine.aDesActivitesEnCours() ? '+ en cours, pas encore compté' : '';
};

const dureeDeLaLigne = (ligne: LigneDePointage): string => {
  const dureeLue = ligne.duree();
  return dureeLue === undefined ? '' : heuresEtMinutes(dureeLue);
};

const titreDuJour = (jourAffiche: JourCalendaire, aujourdhui: JourCalendaire): string =>
  jourAffiche.estLeMeme(aujourdhui)
    ? `Aujourd’hui — ${JOUR_LONG.format(enDate(jourAffiche))}`
    : avecMajuscule(JOUR_LONG_AVEC_ANNEE.format(enDate(jourAffiche)));

const dates = (semaine: SemaineISO): string =>
  `${DATE_COURTE.format(enDate(semaine.lundi()))} – ${DATE_AVEC_ANNEE.format(enDate(semaine.dimanche()))}`;

const jour = (jourPointe: JourCalendaire, aujourdhui: JourCalendaire): string =>
  `${avecMajuscule(JOUR_COURT.format(enDate(jourPointe)))}${jourPointe.estLeMeme(aujourdhui) ? ' · aujourd’hui' : ''}`;

export const LIBELLES_MES_POINTAGES = {
  titre: 'Mes pointages',
  actions: 'Actions de Mes pointages',
  retour: 'RETOUR AU POINTAGE',
  semaine: (semaine: SemaineISO, courante: boolean): string => `Semaine ${String(semaine.numero)}${courante ? ' · cette semaine' : ''}`,
  semainePrecedente: 'Semaine précédente',
  semaineSuivante: 'Semaine suivante',
  revenirAujourdhui: 'Revenir à aujourd’hui',
  chargement: 'Chargement de vos pointages…',
  echec: 'Impossible de charger vos pointages',
  echecExplication: 'Le pupitre n’arrive pas à joindre le serveur. Vos pointages ne sont pas perdus.',
  reessayer: 'RÉESSAYER',
  aucunPointage: 'Aucun pointage cette semaine.',
  aucunPointageDuJour: 'Aucun pointage ce jour.',
  dates,
  totalDeLaSemaine: 'Total de la semaine',
  jour,
  duree,
  titreDuJour,
  libelleDuTotalDuJour,
  explications,
  noteDuJour,
  noteDeLaSemaine,
  plage,
  mentionDeLaLigne,
  dureeDeLaLigne,
  nonConformite: 'NC',
} as const;
