import { DossierAnomalie, PointageAnomalie } from '../../domain/dossier/DossierAnomalie';
import { OperateurAnomalie } from '../../domain/dossier/OperateurAnomalie';
import { OperateurAnomalieId } from '../../domain/dossier/OperateurAnomalieId';
import { LIBELLES_ANOMALIES } from './LibellesAnomalies';

export const operateurPresente = (nom: string): string => nom || LIBELLES_ANOMALIES.operateurNonResolu;

export const postePresente = (libelle: string, posteId: string | undefined): string => {
  if (libelle) return libelle;
  return posteId ? LIBELLES_ANOMALIES.posteNonResolu : LIBELLES_ANOMALIES.sansPoste;
};

export const operateurNomme = (operateur: OperateurAnomalie): string =>
  operateur.code === undefined ? operateur.nom : `${operateur.nom} · ${operateur.code}`;

const nomConnuDeLOperateur = (
  operateur: string,
  operateurs: readonly OperateurAnomalie[] | undefined,
  journal: readonly PointageAnomalie[],
): string | undefined =>
  operateurs?.find(candidat => candidat.id.equals(new OperateurAnomalieId(operateur)))?.nom
  ?? journal.find(pointage => pointage.fait.operateur === operateur && pointage.operateurNom !== '')?.operateurNom;

export const operateurDuDossier = (dossier: DossierAnomalie, operateurs: readonly OperateurAnomalie[] | undefined): string | undefined =>
  dossier.ligne.operateur || nomConnuDeLOperateur(dossier.operateur.operateur, operateurs, dossier.journal);
