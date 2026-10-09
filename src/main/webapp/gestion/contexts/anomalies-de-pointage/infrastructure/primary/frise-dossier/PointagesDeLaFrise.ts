import { DossierAnomalie, PointageAnomalie } from '../../../domain/dossier/DossierAnomalie';

const estLisible = (pointage: PointageAnomalie): boolean => Number.isFinite(Date.parse(pointage.fait.instant));

const ouvreLActivite = (dossier: Pick<DossierAnomalie, 'activite'>, pointage: PointageAnomalie): boolean =>
  dossier.activite.ouvrant.equals(pointage.id);

export const pointagesDeLaFrise = (dossier: Pick<DossierAnomalie, 'journal' | 'activite'>): readonly PointageAnomalie[] =>
  dossier.journal.filter(pointage => estLisible(pointage) && ouvreLActivite(dossier, pointage));
