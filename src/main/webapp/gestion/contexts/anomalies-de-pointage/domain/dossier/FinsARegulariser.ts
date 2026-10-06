import { ChoixGuide } from './DossierAnomalie';

const regulariseLaFinDe = (candidat: ChoixGuide, activite: string): boolean => {
  const proposition = candidat.saisie.proposition;
  return candidat.code === 'REGULARISER_FIN' && proposition?.kind === 'REGULARISATION' && proposition.fait.activiteVisee === activite;
};

export const finARegulariser = (choix: readonly ChoixGuide[], activite: string): boolean =>
  choix.some(candidat => regulariseLaFinDe(candidat, activite));
