import { TotalDeDuree } from '../../../domain/duree/TotalDeDuree';
import { JourCalendaire } from '../../../domain/semaine/JourCalendaire';
import { SemaineISO } from '../../../domain/semaine/SemaineISO';

const JOUR_COURT = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const DATE_COURTE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const DATE_AVEC_ANNEE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const enDate = (jour: JourCalendaire): Date => new Date(`${jour.value}T00:00:00Z`);

const avecMajuscule = (texte: string): string => `${texte.charAt(0).toUpperCase()}${texte.slice(1)}`;

const duree = (total: TotalDeDuree): string => {
  const lecture = total.snapshot();
  return lecture.complete ? `${String(lecture.valeur.heures)} h ${String(lecture.valeur.minutesRestantes).padStart(2, '0')}` : '—';
};

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
} as const;
