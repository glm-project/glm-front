import { ApercuAnomalie } from '../../domain/acte/AnomaliesActesPorts';
import { ActiviteAnomalie } from '../../domain/dossier/DossierAnomalie';
import { IssueDeLActe } from '../../domain/dossier/IssueDeLActe';
import { LIBELLES_ANOMALIES } from './LibellesAnomalies';
import { intituleDeLActivite, tempsActivite } from './PresentationDossier';

interface ActiviteComparee {
  readonly avant: ActiviteAnomalie;
  readonly apres: ActiviteAnomalie;
}

const activiteVisee = (apercu: ApercuAnomalie): string | undefined =>
  apercu.acte.kind === 'ANNULATION' ? undefined : apercu.acte.fait.activiteVisee;

const activiteComparee = (apercu: ApercuAnomalie): ActiviteComparee | undefined => {
  const visee = activiteVisee(apercu);
  const avant = apercu.avant.activites.find(activite => activite.id.activite === visee);
  const apres = apercu.apres.activites.find(activite => activite.id.activite === visee);
  return avant === undefined || apres === undefined ? undefined : { avant, apres };
};

const tempsDeLActivite = (apercu: ApercuAnomalie): string[] => {
  const comparee = activiteComparee(apercu);
  return comparee === undefined
    ? []
    : [`${intituleDeLActivite(comparee.apres)} ${tempsActivite(comparee.avant)} → ${tempsActivite(comparee.apres)}`];
};

const issueDeLActe = (apercu: ApercuAnomalie): string => {
  const issue = IssueDeLActe.depuis(apercu.avant, apercu.apres);
  const restantes = issue.finsAutomatiquesRestantes.length;
  return restantes > 0
    ? LIBELLES_ANOMALIES.resolution.resume.finsAutomatiquesRestantes(restantes)
    : LIBELLES_ANOMALIES.resolution.resume[issue.kind];
};

export const resumeDeLApercu = (apercu: ApercuAnomalie): string => [...tempsDeLActivite(apercu), issueDeLActe(apercu)].join(' · ');
