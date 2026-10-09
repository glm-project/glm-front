import { demarrageDeLaBorne } from '../../../domain/dossier/DemarrageDeLaBorne';
import { DossierAnomalie, PointageAnomalie } from '../../../domain/dossier/DossierAnomalie';

type DossierDeLaFrise = Pick<DossierAnomalie, 'journal' | 'activite' | 'borneDeFin'>;

const estLisible = (pointage: PointageAnomalie): boolean => Number.isFinite(Date.parse(pointage.fait.instant));

const ouvreLActivite = (dossier: DossierDeLaFrise, pointage: PointageAnomalie): boolean => dossier.activite.ouvrant.equals(pointage.id);

const demarreALaBorne = (dossier: DossierDeLaFrise, pointage: PointageAnomalie): boolean => demarrageDeLaBorne(dossier) === pointage;

const estDessine = (dossier: DossierDeLaFrise, pointage: PointageAnomalie): boolean =>
  estLisible(pointage) && (ouvreLActivite(dossier, pointage) || demarreALaBorne(dossier, pointage));

export const pointagesDeLaFrise = (dossier: DossierDeLaFrise): readonly PointageAnomalie[] =>
  dossier.journal.filter(pointage => estDessine(dossier, pointage));

export const clotureDeLaFrise = (dossier: DossierDeLaFrise): string | undefined =>
  demarrageDeLaBorne(dossier) === undefined ? dossier.borneDeFin : undefined;
