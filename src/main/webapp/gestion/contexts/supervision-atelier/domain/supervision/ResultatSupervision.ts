import { SupervisionDeLAtelier } from './SupervisionDeLAtelier';

export type MotifSupervisionInexploitable = 'ACTIVITE_SANS_OPERATEUR_IDENTIFIABLE';

export type ResultatSupervision =
  | {
      readonly estExploitable: true;
      readonly supervision: SupervisionDeLAtelier;
    }
  | {
      readonly estExploitable: false;
      readonly motif: MotifSupervisionInexploitable;
    };

export const resultatSupervisionExploitable = (supervision: SupervisionDeLAtelier): ResultatSupervision => ({
  estExploitable: true,
  supervision,
});

export const resultatSupervisionInexploitable = (motif: MotifSupervisionInexploitable): ResultatSupervision => ({
  estExploitable: false,
  motif,
});
