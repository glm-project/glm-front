import { LIBELLES_ANOMALIES } from './LibellesAnomalies';

export const operateurPresente = (nom: string): string => nom || LIBELLES_ANOMALIES.operateurNonResolu;

export const postePresente = (libelle: string, posteId: string | undefined): string => {
  if (libelle) return libelle;
  return posteId ? LIBELLES_ANOMALIES.posteNonResolu : LIBELLES_ANOMALIES.sansPoste;
};
