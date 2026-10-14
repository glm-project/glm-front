import { components } from '@/app/generated/schema';
import { ActiviteAnomalieId } from '../../domain/dossier/ActiviteAnomalieId';
import { ActiviteEchue, DossierAnomalie, PointageAnomalie, TypePointage } from '../../domain/dossier/DossierAnomalie';
import { OperateurAnomalieId } from '../../domain/dossier/OperateurAnomalieId';
import { PointageAnomalieId } from '../../domain/dossier/PointageAnomalieId';

type EvenementDAtelier = components['schemas']['RestEvenementDAtelier'];
type Pointage = EvenementDAtelier & { readonly type: TypePointage };

const estUnPointage = (evenement: EvenementDAtelier): evenement is Pointage =>
  evenement.type !== 'RETRAIT' && evenement.type !== 'CHANGEMENT_DE_POSTE';

const toPointage = (pointage: Pointage): PointageAnomalie => ({
  id: new PointageAnomalieId(pointage.id),
  fait: {
    type: pointage.type,
    operateur: pointage.operateurId,
    instant: pointage.dateDeSurvenue,
  },
  operateurNom: pointage.operateur === undefined ? '' : `${pointage.operateur.prenom} ${pointage.operateur.nom}`,
});

const toActiviteEchue = (activite: components['schemas']['RestActiviteDuDossier']): ActiviteEchue => ({
  id: new ActiviteAnomalieId(activite.activite),
  ouvrant: new PointageAnomalieId(activite.evenement),
  categorie: activite.categorie,
  debut: activite.debut,
  echeance: activite.fin,
});

export const toDossier = (dossier: components['schemas']['RestDossierAnomalie']): DossierAnomalie => {
  const echue = dossier.activite;
  const journal = dossier.pointages.filter(estUnPointage).map(toPointage);
  return {
    designation: dossier.designation,
    operateur: new OperateurAnomalieId(echue.operateurId),
    operateurNom: echue.operateur === undefined ? '' : `${echue.operateur.prenom} ${echue.operateur.nom}`,
    posteLibelle: echue.poste?.libelle ?? '',
    ...(echue.posteId === undefined ? {} : { posteId: echue.posteId }),
    journal,
    activite: toActiviteEchue(echue),
    ...(dossier.borneDeFin === undefined ? {} : { borneDeFin: dossier.borneDeFin }),
  };
};
