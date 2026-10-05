import {
  formatCalendarDayFull,
  formatCalendarDayFullWithYear,
  formatCalendarDayShortDayMonth,
  formatCalendarDayShortDayMonthYear,
  formatCalendarDayShortWithMonth,
  formatCalendarMonthName,
  formatInstantTime,
} from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { DureeTravaillee } from '../../../domain/duree/DureeTravaillee';
import { TotalDeDuree } from '../../../domain/duree/TotalDeDuree';
import { JourDePointages } from '../../../domain/JourDePointages';
import { LigneDePointage } from '../../../domain/LigneDePointage';
import { PointagesDeLaSemaine } from '../../../domain/PointagesDeLaSemaine';
import { JourCalendaire } from '../../../domain/semaine/JourCalendaire';
import { MoisCalendaire } from '../../../domain/semaine/MoisCalendaire';
import { SemaineISO } from '../../../domain/semaine/SemaineISO';

const avecMajuscule = (texte: string): string => `${texte.charAt(0).toUpperCase()}${texte.slice(1)}`;

const nomDuMois = (mois: MoisCalendaire): string => avecMajuscule(formatCalendarMonthName(mois.annee, mois.numero));

const heuresEtMinutes = (duree: DureeTravaillee): string => `${String(duree.heures)} h ${String(duree.minutesRestantes).padStart(2, '0')}`;

const duree = (total: TotalDeDuree): string => {
  const lecture = total.snapshot();
  return lecture.complete ? heuresEtMinutes(lecture.valeur) : '—';
};

const FIN_INCONNUE = { EN_COURS: '…', A_RESOUDRE: '?' } as const;

const plage = (ligne: LigneDePointage): string =>
  `${formatInstantTime(ligne.activite.debut)} → ${'fin' in ligne.etat ? formatInstantTime(ligne.etat.fin) : FIN_INCONNUE[ligne.etat.etat]}`;

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
    ? `Aujourd’hui — ${formatCalendarDayFull(jourAffiche.value)}`
    : avecMajuscule(formatCalendarDayFullWithYear(jourAffiche.value));

const dates = (semaine: SemaineISO): string =>
  `${formatCalendarDayShortDayMonth(semaine.lundi().value)} – ${formatCalendarDayShortDayMonthYear(semaine.dimanche().value)}`;

const jour = (jourPointe: JourCalendaire, aujourdhui: JourCalendaire): string =>
  `${avecMajuscule(formatCalendarDayShortWithMonth(jourPointe.value))}${jourPointe.estLeMeme(aujourdhui) ? ' · aujourd’hui' : ''}`;

export const LIBELLES_MES_POINTAGES = {
  titre: 'Mes pointages',
  actions: 'Actions de Mes pointages',
  retour: 'RETOUR AU POINTAGE',
  semaine: (semaine: SemaineISO, courante: boolean): string => `Semaine ${String(semaine.numero)}${courante ? ' · cette semaine' : ''}`,
  semainePrecedente: 'Semaine précédente',
  semaineSuivante: 'Semaine suivante',
  revenirAujourdhui: 'Revenir à aujourd’hui',
  choisirUneSemaine: 'Choisir une semaine',
  choisirUnMois: 'Choisir un mois',
  autreMois: 'Autre mois',
  fermer: 'Fermer',
  mois: nomDuMois,
  moisEtAnnee: (mois: MoisCalendaire): string => `${nomDuMois(mois)} ${String(mois.annee)}`,
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
