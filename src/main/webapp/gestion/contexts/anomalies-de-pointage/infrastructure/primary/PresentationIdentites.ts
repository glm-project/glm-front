import { DossierAnomalie, PointageAnomalie } from '../../domain/dossier/DossierAnomalie';
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

const operateurSansNom = (referentiel: ReferentielAnomalies | undefined): string =>
  referentiel === undefined ? LIBELLES_ANOMALIES.operateurActuelConserve : operateurPresente('');

const posteSansLibelle = (poste: string, referentiel: ReferentielAnomalies | undefined): string =>
  referentiel === undefined && poste !== '' ? LIBELLES_ANOMALIES.posteActuelConserve : postePresente('', poste);

const nomConnuDeLOperateur = (
  operateur: string,
  referentiel: ReferentielAnomalies | undefined,
  journal: readonly PointageAnomalie[],
): string | undefined =>
  referentiel?.operateur(new OperateurAnomalieId(operateur))?.nom
  ?? journal.find(pointage => pointage.fait.operateur === operateur && pointage.operateurNom !== '')?.operateurNom;

export const operateurDeLActe = (
  operateur: string,
  referentiel: ReferentielAnomalies | undefined,
  journal: readonly PointageAnomalie[],
): string => nomConnuDeLOperateur(operateur, referentiel, journal) ?? operateurSansNom(referentiel);

export const operateurDuDossier = (dossier: DossierAnomalie, referentiel: ReferentielAnomalies | undefined): string | undefined =>
  dossier.ligne.operateur || nomConnuDeLOperateur(dossier.operateur.operateur, referentiel, dossier.journal);

export const posteDeLActe = (
  poste: string,
  referentiel: ReferentielAnomalies | undefined,
  journal: readonly PointageAnomalie[],
): string => {
  const libelle =
    referentiel?.poste(new PosteAnomalieId(poste))?.libelle
    ?? journal.find(pointage => pointage.fait.poste === poste && pointage.posteLibelle !== '')?.posteLibelle;
  return libelle ?? posteSansLibelle(poste, referentiel);
};
