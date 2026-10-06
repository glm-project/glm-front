import { ChoixGuide } from './DossierAnomalie';

export interface PointageTardif {
  readonly pointage: string;
  readonly activite: string;
}

const CODES_TARDIFS: readonly ChoixGuide['code'][] = ['CORRIGER_FIN_TARDIVE', 'CORRIGER_TRANSITION_TARDIVE'];

export const pointagesTardifs = (choix: readonly ChoixGuide[]): readonly PointageTardif[] =>
  choix.flatMap(candidat => {
    const proposition = candidat.saisie.proposition;
    return CODES_TARDIFS.includes(candidat.code) && proposition?.kind === 'CORRECTION'
      ? [{ pointage: proposition.pointage, activite: proposition.fait.activiteVisee }]
      : [];
  });

export const identifiantsDesPointagesTardifs = (choix: readonly ChoixGuide[]): ReadonlySet<string> =>
  new Set(pointagesTardifs(choix).map(tardif => tardif.pointage));
