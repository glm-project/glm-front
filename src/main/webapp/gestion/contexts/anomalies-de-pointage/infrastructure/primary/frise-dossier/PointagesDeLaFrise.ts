import { ChronologiePointages } from '../../../domain/dossier/ChronologiePointages';
import { DossierAnomalie, PointageAnomalie } from '../../../domain/dossier/DossierAnomalie';

const estLisible = (pointage: PointageAnomalie): boolean => Number.isFinite(Date.parse(pointage.fait.instant));

const ouvreUneActivite = (dossier: Pick<DossierAnomalie, 'activites'>, pointage: PointageAnomalie): boolean =>
  dossier.activites.some(activite => activite.ouvrant.equals(pointage.id));

export const pointagesDeLaFrise = (dossier: Pick<DossierAnomalie, 'journal' | 'activites'>): readonly PointageAnomalie[] =>
  new ChronologiePointages(dossier.journal.filter(pointage => estLisible(pointage) && ouvreUneActivite(dossier, pointage))).pointages;
