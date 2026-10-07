import { ChronologiePointages } from '../../../domain/dossier/ChronologiePointages';
import { DossierAnomalie, PointageAnomalie } from '../../../domain/dossier/DossierAnomalie';

const estLisible = (pointage: PointageAnomalie): boolean => Number.isFinite(Date.parse(pointage.fait.instant));

export const pointagesDeLaFrise = (dossier: Pick<DossierAnomalie, 'journal' | 'diagnostics' | 'perimetre'>): readonly PointageAnomalie[] =>
  new ChronologiePointages(dossier.perimetre.pointagesDe(dossier).filter(estLisible)).pointages;
