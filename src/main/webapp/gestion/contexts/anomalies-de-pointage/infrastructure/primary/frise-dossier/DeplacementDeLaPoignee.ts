import { toOffsetIsoString } from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { InstantPointage } from '../../../domain/acte/InstantPointage';
import { BornesDePoignee, DemandeDeDeplacement, PoigneeDeFrise } from './PoigneeDeFrise';

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

export const instantDeplace = (demande: DemandeDeDeplacement, courant: string, bornes: BornesDePoignee): string => {
  const plancher = new InstantPointage(bornes.min).firstWholeMinute();
  const plafond = new InstantPointage(bornes.max).lastWholeMinute();
  if (plancher > plafond) return toOffsetIsoString(new Date(courant));
  const cible = cibleDe(demande, courant, plancher, plafond);
  return toOffsetIsoString(new Date(Math.min(Math.max(cible, plancher), plafond)));
};

export const peutDeplacer = (minutes: number, poignee: PoigneeDeFrise): boolean =>
  !poignee.desactivee
  && Date.parse(instantDeplace({ kind: 'DE', minutes }, poignee.instant, poignee.bornes)) !== Date.parse(poignee.instant);
