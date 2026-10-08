import { SaisieActe } from '../acte/SaisieActe';
import { DossierAnomalie } from './DossierAnomalie';

type DossierDeLaFin = Pick<DossierAnomalie, 'enConflit' | 'finAutomatique' | 'activites' | 'choix'> & {
  readonly ligne: Pick<DossierAnomalie['ligne'], 'adresse'>;
};

const estUneFinAutomatiqueSansConflit = (dossier: DossierDeLaFin): boolean => dossier.finAutomatique && !dossier.enConflit;

const regulariseLActivite = (saisie: SaisieActe, activite: string | undefined): boolean => {
  const proposition = saisie.proposition;
  return proposition?.kind === 'REGULARISATION' && proposition.fait.activiteVisee === activite;
};

export const saisieDeRegularisation = (dossier: DossierDeLaFin): SaisieActe | undefined => {
  if (!estUneFinAutomatiqueSansConflit(dossier)) return undefined;
  const activite = dossier.activites.find(candidate => candidate.ouvrant.equals(dossier.ligne.adresse.pointage))?.id.activite;
  return dossier.choix.find(choix => choix.code === 'REGULARISER_FIN' && regulariseLActivite(choix.saisie, activite))?.saisie;
};
