import { ActiviteAnomalie, DossierAnomalie } from '../../domain/dossier/DossierAnomalie';
import { LIBELLES_ANOMALIES } from './LibellesAnomalies';
import { heureDe } from './PresentationDossier';

type PeriodeActivite = NonNullable<ActiviteAnomalie['periode']>;
type CategorieActivite = PeriodeActivite['categorie'];
type PeriodeEchue = PeriodeActivite & { readonly fin: string };

const PROBLEMES = LIBELLES_ANOMALIES.problemes;

const majuscule = (texte: string): string => texte.charAt(0).toUpperCase() + texte.slice(1);

const activiteDite = (categorie: CategorieActivite) => PROBLEMES.activites[categorie];

const phraseDeFinAutomatique = (periode: PeriodeEchue): string =>
  majuscule(PROBLEMES.finAutomatique.sansFin(activiteDite(periode.categorie), heureDe(periode.debut), heureDe(periode.fin)));

export const phrasesDuProbleme = (dossier: DossierAnomalie): readonly string[] =>
  dossier.activites.flatMap(activite => {
    const periode = activite.periode;
    return activite.etat === 'ECHUE' && periode?.fin !== undefined ? [phraseDeFinAutomatique({ ...periode, fin: periode.fin })] : [];
  });
