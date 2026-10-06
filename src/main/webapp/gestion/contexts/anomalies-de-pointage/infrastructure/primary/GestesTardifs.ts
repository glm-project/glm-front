import { ChoixGuide } from '../../domain/dossier/DossierAnomalie';

export interface GesteTardif {
  readonly pointage: string;
  readonly activite: string;
}

const CODES_TARDIFS: readonly ChoixGuide['code'][] = ['CORRIGER_FIN_TARDIVE', 'CORRIGER_TRANSITION_TARDIVE'];

export const gestesTardifs = (choix: readonly ChoixGuide[]): readonly GesteTardif[] =>
  choix.flatMap(candidat => {
    const proposition = candidat.saisie.proposition;
    return CODES_TARDIFS.includes(candidat.code) && proposition?.kind === 'CORRECTION'
      ? [{ pointage: proposition.pointage, activite: proposition.fait.activiteVisee }]
      : [];
  });
