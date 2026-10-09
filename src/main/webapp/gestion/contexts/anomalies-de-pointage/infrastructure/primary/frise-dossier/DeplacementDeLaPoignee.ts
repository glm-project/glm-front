import { toOffsetIsoString } from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { InstantPointage } from '../../../domain/dossier/InstantPointage';
import { BornesDeLaFin } from '../../../domain/regularisation/CadreDeLaFin';
import { DemandeDeDeplacement } from './PoigneeDeFrise';

const UNE_MINUTE = 60_000;

const aLaMinute = (instant: number): number => Math.floor(instant / UNE_MINUTE) * UNE_MINUTE;

const cibleDe = (demande: DemandeDeDeplacement, courant: string, plancher: number, plafond: number): number => {
  switch (demande.kind) {
    case 'DE':
      return aLaMinute(Date.parse(courant)) + demande.minutes * UNE_MINUTE;
    case 'BORNE':
      return demande.borne === 'MIN' ? plancher : plafond;
    case 'VERS':
      return aLaMinute(demande.instant);
  }
};

const minutesEntieres = (bornes: BornesDeLaFin): { readonly plancher: number; readonly plafond: number } => ({
  plancher: new InstantPointage(bornes.min).firstWholeMinute(),
  plafond: Date.parse(bornes.max),
});

export const uneMinuteEntiereEntre = (bornes: BornesDeLaFin): boolean => {
  const { plancher, plafond } = minutesEntieres(bornes);
  return plancher <= plafond;
};

export const instantDeplace = (demande: DemandeDeDeplacement, courant: string, bornes: BornesDeLaFin): string => {
  const { plancher, plafond } = minutesEntieres(bornes);
  if (plancher > plafond) return toOffsetIsoString(new Date(courant));
  const cible = cibleDe(demande, courant, plancher, plafond);
  return toOffsetIsoString(new Date(Math.min(Math.max(cible, plancher), plafond)));
};
