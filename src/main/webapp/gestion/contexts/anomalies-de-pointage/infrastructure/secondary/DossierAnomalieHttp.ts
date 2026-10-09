import { components } from '@/app/generated/schema';
import { ActiviteAnomalieId } from '../../domain/dossier/ActiviteAnomalieId';
import { ActiviteAnomalie, DossierAnomalie, PointageAnomalie } from '../../domain/dossier/DossierAnomalie';
import { OperateurAnomalieId } from '../../domain/dossier/OperateurAnomalieId';
import { PointageAnomalieId } from '../../domain/dossier/PointageAnomalieId';

const toPointage = (pointage: components['schemas']['RestEvenementDAtelier']): PointageAnomalie => ({
  id: new PointageAnomalieId(pointage.id),
  fait: {
    type: pointage.type,
    operateur: pointage.operateurId,
    instant: pointage.dateDeSurvenue,
  },
  operateurNom: pointage.operateur === undefined ? '' : `${pointage.operateur.prenom} ${pointage.operateur.nom}`,
  regularisation: pointage.estUneRegularisation,
});

const toActiviteEchue = (activite: components['schemas']['RestActiviteDuDossier']): ActiviteAnomalie => ({
  id: new ActiviteAnomalieId(activite.activite),
  libelle: '',
  etat: 'ECHUE',
  ouvrant: new PointageAnomalieId(activite.evenement),
  periode: { categorie: activite.categorie, debut: activite.debut, fin: activite.fin },
});

export const toDossier = (dossier: components['schemas']['RestDossierAnomalie']): DossierAnomalie => {
  const echue = dossier.activite;
  const journal = dossier.pointages.map(toPointage);
  return {
    operateur: new OperateurAnomalieId(echue.operateurId),
    operateurNom: echue.operateur === undefined ? '' : `${echue.operateur.prenom} ${echue.operateur.nom}`,
    posteLibelle: echue.poste?.libelle ?? '',
    ...(echue.posteId === undefined ? {} : { posteId: echue.posteId }),
    echue: new ActiviteAnomalieId(echue.activite),
    debut: echue.debut,
    journal,
    activites: [toActiviteEchue(echue)],
  };
};
