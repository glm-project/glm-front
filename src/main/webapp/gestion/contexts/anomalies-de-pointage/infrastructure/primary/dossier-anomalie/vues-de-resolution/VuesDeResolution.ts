import { Type } from '@angular/core';
import { choixDeResolution } from '../../../../domain/dossier/ChoixDeResolution';
import { ChoixGuide, DossierAnomalie } from '../../../../domain/dossier/DossierAnomalie';
import { ResolutionRegulariserFin } from './resolution-regulariser-fin/ResolutionRegulariserFin';

type CodeDeChoix = NonNullable<ChoixGuide['code']>;

const VUES_DE_RESOLUTION: Readonly<Partial<Record<CodeDeChoix, Type<unknown>>>> = {
  REGULARISER_FIN: ResolutionRegulariserFin,
};

export interface AiguillageSimple {
  readonly kind: 'SIMPLE';
  readonly vue: Type<unknown>;
  readonly choix: ChoixGuide;
}

export type Aiguillage = AiguillageSimple | { readonly kind: 'COMPLETE'; readonly vueSimple?: AiguillageSimple };

const vueDuChoix = (choix: ChoixGuide): Type<unknown> | undefined =>
  choix.code === undefined ? undefined : VUES_DE_RESOLUTION[choix.code];

export const aiguiller = (dossier: DossierAnomalie): Aiguillage => {
  const choix = choixDeResolution(dossier);
  const vue = choix === undefined ? undefined : vueDuChoix(choix);
  return choix === undefined || vue === undefined ? { kind: 'COMPLETE' } : { kind: 'SIMPLE', vue, choix };
};
