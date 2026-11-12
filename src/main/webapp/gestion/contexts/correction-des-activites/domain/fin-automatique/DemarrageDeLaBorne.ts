import { DossierDeLaFin, PointageDuDossier } from './DossierDeLaFin';
import { InstantDuDossier } from './InstantDuDossier';

const ouvreUneActivite = (pointage: PointageDuDossier): boolean => pointage.fait.type !== 'FIN';

const tombeA = (pointage: PointageDuDossier, borne: InstantDuDossier): boolean =>
  new InstantDuDossier(pointage.fait.instant).isValid() && new InstantDuDossier(pointage.fait.instant).compareTo(borne) === 0;

export const demarrageDeLaBorne = (dossier: Pick<DossierDeLaFin, 'journal' | 'borneDeFin'>): PointageDuDossier | undefined => {
  const borne = dossier.borneDeFin;
  if (borne === undefined) return undefined;
  return dossier.journal.find(pointage => ouvreUneActivite(pointage) && tombeA(pointage, new InstantDuDossier(borne)));
};
