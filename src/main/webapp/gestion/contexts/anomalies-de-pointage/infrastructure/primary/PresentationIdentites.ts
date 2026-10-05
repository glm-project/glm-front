import { PointageAnomalie } from '../../domain/dossier/DossierAnomalie';
import { OperateurAnomalieId } from '../../domain/dossier/OperateurAnomalieId';
import { PosteAnomalieId } from '../../domain/dossier/PosteAnomalieId';
import { OperateurAnomalie, ReferentielAnomalies } from '../../domain/dossier/ReferentielAnomalies';
import { LIBELLES_ANOMALIES } from './LibellesAnomalies';

export const operateurPresente = (nom: string): string => nom || LIBELLES_ANOMALIES.operateurNonResolu;

export const postePresente = (libelle: string, posteId: string | undefined): string => {
  if (libelle) return libelle;
  return posteId ? LIBELLES_ANOMALIES.posteNonResolu : LIBELLES_ANOMALIES.sansPoste;
};

export const operateurNomme = (operateur: OperateurAnomalie): string =>
  operateur.code === undefined ? operateur.nom : `${operateur.nom} · ${operateur.code}`;

export const operateurDeLActe = (operateur: string, referentiel: ReferentielAnomalies, journal: readonly PointageAnomalie[]): string =>
  operateurPresente(
    referentiel.operateur(new OperateurAnomalieId(operateur))?.nom
      ?? journal.find(pointage => pointage.fait.operateur === operateur && pointage.operateurNom !== '')?.operateurNom
      ?? '',
  );

export const posteDeLActe = (poste: string, referentiel: ReferentielAnomalies, journal: readonly PointageAnomalie[]): string =>
  postePresente(
    referentiel.poste(new PosteAnomalieId(poste))?.libelle
      ?? journal.find(pointage => pointage.fait.poste === poste && pointage.posteLibelle !== '')?.posteLibelle
      ?? '',
    poste,
  );
