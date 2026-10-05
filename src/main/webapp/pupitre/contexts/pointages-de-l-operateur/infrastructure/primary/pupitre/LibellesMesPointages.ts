import { DureeTravaillee } from '../../../domain/duree/DureeTravaillee';
import { TotalDeDuree } from '../../../domain/duree/TotalDeDuree';
import { LigneDePointage } from '../../../domain/LigneDePointage';
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

const plage = (ligne: LigneDePointage): string =>
  `${HEURE.format(ligne.activite.debut)} → ${'fin' in ligne.etat ? HEURE.format(ligne.etat.fin) : '…'}`;

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
  semaine: (semaine: SemaineISO): string => `Semaine ${String(semaine.numero)} · cette semaine`,
  dates,
  totalDeLaSemaine: 'Total de la semaine',
  jour,
  duree,
  titreDuJour,
  pointees: 'pointées',
  plage,
  dureeDeLaLigne,
  nonConformite: 'NC',
} as const;
