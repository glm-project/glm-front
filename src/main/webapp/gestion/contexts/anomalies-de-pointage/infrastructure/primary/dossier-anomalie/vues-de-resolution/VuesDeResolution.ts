import { Type } from '@angular/core';
import { choixDeResolution } from '../../../../domain/dossier/ChoixDeResolution';
import { ChoixGuide, DossierAnomalie } from '../../../../domain/dossier/DossierAnomalie';
import { ResolutionCorrigerFinTardive } from './resolution-corriger-fin-tardive/ResolutionCorrigerFinTardive';
import { ResolutionCorrigerTransitionTardive } from './resolution-corriger-transition-tardive/ResolutionCorrigerTransitionTardive';
import { ResolutionRegulariserFin } from './resolution-regulariser-fin/ResolutionRegulariserFin';

type CodeDeChoix = NonNullable<ChoixGuide['code']>;

const VUES_DE_RESOLUTION: Readonly<Partial<Record<CodeDeChoix, Type<unknown>>>> = {
  REGULARISER_FIN: ResolutionRegulariserFin,
  CORRIGER_FIN_TARDIVE: ResolutionCorrigerFinTardive,
  CORRIGER_TRANSITION_TARDIVE: ResolutionCorrigerTransitionTardive,
};

export interface AiguillageSimple {
  readonly vue: Type<unknown>;
  readonly choix: ChoixGuide;
}

const vueDuChoix = (choix: ChoixGuide): Type<unknown> | undefined =>
  choix.code === undefined ? undefined : VUES_DE_RESOLUTION[choix.code];

export const aiguiller = (dossier: DossierAnomalie): AiguillageSimple | undefined => {
  const choix = choixDeResolution(dossier);
  const vue = choix === undefined ? undefined : vueDuChoix(choix);
  return choix === undefined || vue === undefined ? undefined : { vue, choix };
};
