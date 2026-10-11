import { demarrageDeLaBorne } from '../../../domain/dossier/DemarrageDeLaBorne';
import { DossierAnomalie, PointageAnomalie } from '../../../domain/dossier/DossierAnomalie';

type DossierDeLaFrise = Pick<DossierAnomalie, 'journal' | 'activite' | 'borneDeFin'>;

const estLisible = (pointage: PointageAnomalie): boolean => Number.isFinite(Date.parse(pointage.fait.instant));

const ouvreLActivite = (dossier: DossierDeLaFrise, pointage: PointageAnomalie): boolean => dossier.activite.ouvrant.equals(pointage.id);

const demarreALaBorne = (dossier: DossierDeLaFrise, pointage: PointageAnomalie): boolean => demarrageDeLaBorne(dossier) === pointage;

export const pointagesDeLActivite = (dossier: DossierDeLaFrise): readonly PointageAnomalie[] =>
  dossier.journal.filter(pointage => estLisible(pointage) && ouvreLActivite(dossier, pointage));

export const demarrageDeLaBorneDeLaFrise = (dossier: DossierDeLaFrise): PointageAnomalie | undefined => {
  const demarrage = dossier.journal.find(pointage => demarreALaBorne(dossier, pointage));
  return demarrage !== undefined && estLisible(demarrage) && !ouvreLActivite(dossier, demarrage) ? demarrage : undefined;
};

export const clotureDeLaFrise = (dossier: DossierDeLaFrise): string | undefined =>
  demarrageDeLaBorne(dossier) === undefined ? dossier.borneDeFin : undefined;
