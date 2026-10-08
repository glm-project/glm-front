import { ChoixGuide, DossierAnomalie } from './DossierAnomalie';

type DossierDeResolution = Pick<DossierAnomalie, 'enConflit' | 'finAutomatique' | 'activites' | 'choix'> & {
  readonly ligne: Pick<DossierAnomalie['ligne'], 'adresse'>;
};

const activiteVisee = (choix: ChoixGuide): string | undefined => {
  const proposition = choix.saisie.proposition;
  return proposition === undefined || proposition.kind === 'ANNULATION' ? undefined : proposition.fait.activiteVisee;
};

const viseLActiviteDeLAdresse = (dossier: DossierDeResolution, choix: ChoixGuide): boolean => {
  const visee = activiteVisee(choix);
  const activite = dossier.activites.find(candidate => candidate.id.activite === visee);
  return activite?.ouvrant.equals(dossier.ligne.adresse.pointage) === true;
};

const estUnDossierDeFinAutomatiqueSansConflit = (dossier: DossierDeResolution): boolean => dossier.finAutomatique && !dossier.enConflit;

const choixUnique = (choix: readonly ChoixGuide[]): ChoixGuide | undefined => (choix.length === 1 ? choix[0] : undefined);

export const choixDeResolution = (dossier: DossierDeResolution): ChoixGuide | undefined => {
  if (!estUnDossierDeFinAutomatiqueSansConflit(dossier)) return undefined;
  const choix = choixUnique(dossier.choix);
  return choix !== undefined && viseLActiviteDeLAdresse(dossier, choix) ? choix : undefined;
};
