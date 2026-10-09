import { AdresseDossier, FiltreAnomalies, PageAnomalies } from './DossierAnomalie';

export type DestinationSuivante =
  { readonly kind: 'AUTRE_LIGNE'; readonly adresse: AdresseDossier } | { readonly kind: 'PLUS_AUCUNE_ANOMALIE' | 'LISTE' };

export const PLUS_AUCUNE_ANOMALIE: DestinationSuivante = { kind: 'PLUS_AUCUNE_ANOMALIE' };
export const LISTE: DestinationSuivante = { kind: 'LISTE' };

const memeAdresse = (a: AdresseDossier, b: AdresseDossier): boolean => a.suivi.equals(b.suivi) && a.pointage.equals(b.pointage);

export const adresseDeLaDestination = (destination: DestinationSuivante): AdresseDossier | undefined =>
  'adresse' in destination ? destination.adresse : undefined;

export const dansLaPage = (page: PageAnomalies, origine: AdresseDossier): DestinationSuivante | undefined => {
  const ligne = page.lignes.find(candidate => !memeAdresse(candidate.adresse, origine));
  return ligne === undefined ? undefined : { kind: 'AUTRE_LIGNE', adresse: ligne.adresse };
};

export const pageAvant = (filtre: FiltreAnomalies): FiltreAnomalies | undefined =>
  filtre.page > 1 ? { ...filtre, page: filtre.page - 1 } : undefined;
