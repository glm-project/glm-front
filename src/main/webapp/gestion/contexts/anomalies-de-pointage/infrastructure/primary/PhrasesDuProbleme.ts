import { DossierAnomalie } from '../../domain/dossier/DossierAnomalie';
import { LIBELLES_ANOMALIES } from './LibellesAnomalies';
import { heureDe } from './PresentationDossier';

const PROBLEMES = LIBELLES_ANOMALIES.problemes;

const majuscule = (texte: string): string => texte.charAt(0).toUpperCase() + texte.slice(1);

export const phraseDuProbleme = ({ activite }: DossierAnomalie): string =>
  majuscule(PROBLEMES.finAutomatique.sansFin(PROBLEMES.activites[activite.categorie], heureDe(activite.debut), heureDe(activite.echeance)));
