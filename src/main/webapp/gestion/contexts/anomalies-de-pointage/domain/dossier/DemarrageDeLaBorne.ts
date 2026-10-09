import { InstantPointage } from '../regularisation/InstantPointage';
import { DossierAnomalie, PointageAnomalie } from './DossierAnomalie';

const ouvreUneActivite = (pointage: PointageAnomalie): boolean => pointage.fait.type !== 'FIN';

const tombeA = (pointage: PointageAnomalie, borne: InstantPointage): boolean =>
  new InstantPointage(pointage.fait.instant).isValid() && new InstantPointage(pointage.fait.instant).compareTo(borne) === 0;

export const demarrageDeLaBorne = (dossier: Pick<DossierAnomalie, 'journal' | 'borneDeFin'>): PointageAnomalie | undefined => {
  const borne = dossier.borneDeFin;
  if (borne === undefined) return undefined;
  return dossier.journal.find(pointage => ouvreUneActivite(pointage) && tombeA(pointage, new InstantPointage(borne)));
};
