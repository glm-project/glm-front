import { demarrageDeLaBorne } from '../../../domain/fin-automatique/DemarrageDeLaBorne';
import { DossierDeLaFin, PointageDuDossier } from '../../../domain/fin-automatique/DossierDeLaFin';

type DossierDeLaFrise = Pick<DossierDeLaFin, 'journal' | 'activite' | 'borneDeFin'>;

const estLisible = (pointage: PointageDuDossier): boolean => Number.isFinite(Date.parse(pointage.fait.instant));

const ouvreLActivite = (dossier: DossierDeLaFrise, pointage: PointageDuDossier): boolean => dossier.activite.ouvrant.equals(pointage.id);

const demarreALaBorne = (dossier: DossierDeLaFrise, pointage: PointageDuDossier): boolean => demarrageDeLaBorne(dossier) === pointage;

export const pointagesDeLActivite = (dossier: DossierDeLaFrise): readonly PointageDuDossier[] =>
  dossier.journal.filter(pointage => estLisible(pointage) && ouvreLActivite(dossier, pointage));

export const demarrageDeLaBorneDeLaFrise = (dossier: DossierDeLaFrise): PointageDuDossier | undefined => {
  const demarrage = dossier.journal.find(pointage => demarreALaBorne(dossier, pointage));
  return demarrage !== undefined && estLisible(demarrage) && !ouvreLActivite(dossier, demarrage) ? demarrage : undefined;
};

export const clotureDeLaFrise = (dossier: DossierDeLaFrise): string | undefined =>
  demarrageDeLaBorne(dossier) === undefined ? dossier.borneDeFin : undefined;
