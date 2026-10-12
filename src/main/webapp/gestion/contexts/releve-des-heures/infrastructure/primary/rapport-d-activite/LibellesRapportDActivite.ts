import { formatCalendarDayRange, formatCalendarMonthName } from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { FormatDuRapport } from '../../../domain/rapport/FormatDuRapport';
import { PeriodeDuRapport } from '../../../domain/rapport/PeriodeDuRapport';
import { ResumeDuRapport } from '../../../domain/rapport/ResumeDuRapport';

const majuscule = (texte: string): string => texte.charAt(0).toLocaleUpperCase('fr-FR') + texte.slice(1);

const pluriel = (nombre: number, singulier: string, plurielDuMot: string): string => `${nombre} ${nombre > 1 ? plurielDuMot : singulier}`;

export const libellePeriode = (periode: PeriodeDuRapport): string =>
  periode.borne.genre === 'SEMAINE'
    ? `Semaine ${periode.borne.semaine.numero} · ${formatCalendarDayRange(periode.premierJour().value, periode.dernierJour().value)}`
    : `${majuscule(formatCalendarMonthName(periode.borne.mois.annee, periode.borne.mois.mois))} ${periode.borne.mois.annee}`;

export const libelleResume = (resume: ResumeDuRapport): string =>
  `${pluriel(resume.joursAvecPointage, 'jour', 'jours')} avec pointage · ${resume.tempsPointe.heures} h ${String(
    resume.tempsPointe.minutesRestantes,
  ).padStart(2, '0')} pointées`;

export const libelleFinsAutomatiques = (resume: ResumeDuRapport): string | undefined => {
  if (resume.finsAutomatiques === 0) {
    return undefined;
  }
  return resume.finsAutomatiques > 1
    ? `${resume.finsAutomatiques} pointages en fin automatique dans la période. Ils figurent dans le rapport avec la mention « fin automatique ».`
    : '1 pointage en fin automatique dans la période. Il figure dans le rapport avec la mention « fin automatique ».';
};

const journalDesPointages = (resume: ResumeDuRapport | undefined): string => {
  if (resume === undefined) {
    return 'avec le journal des pointages';
  }
  return resume.pointages > 1 ? `avec le journal des ${resume.pointages} pointages` : `avec le journal de ${resume.pointages} pointage`;
};

export const libelleExport = (format: FormatDuRapport, resume: ResumeDuRapport | undefined): string => {
  const libelles: Record<FormatDuRapport, string> = {
    EXCEL: 'Excel · synthèse et tableau des pointages',
    PDF_SYNTHESE: 'PDF synthèse',
    PDF_DETAIL: `PDF détaillé · ${journalDesPointages(resume)}`,
  };
  return libelles[format];
};
