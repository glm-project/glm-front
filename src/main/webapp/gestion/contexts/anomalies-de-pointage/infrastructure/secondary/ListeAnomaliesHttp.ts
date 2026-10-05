import { components } from '@/app/generated/schema';
import { ActiviteAnomalieId } from '../../domain/dossier/ActiviteAnomalieId';
import { LigneFinAutomatique, NatureAnomalie, PageAnomalies } from '../../domain/dossier/DossierAnomalie';
import { ElementAnomalieId } from '../../domain/dossier/ElementAnomalieId';
import { PointageAnomalieId } from '../../domain/dossier/PointageAnomalieId';
import { SuiviAnomalieId } from '../../domain/dossier/SuiviAnomalieId';
import { toLigne } from './DossierAnomalieHttp';

type PageRecue = components['schemas']['RestPageDesAnomalies'];
type FinAutomatiqueRecue = components['schemas']['RestFinAutomatiqueEnListe'];

const toLigneFinAutomatique = (ligne: FinAutomatiqueRecue): LigneFinAutomatique => ({
  adresse: { suivi: new SuiviAnomalieId(ligne.adresse.suivi), pointage: new PointageAnomalieId(ligne.adresse.pointage) },
  activite: new ActiviteAnomalieId(ligne.activite),
  element: new ElementAnomalieId(ligne.elementId),
  designation: ligne.designation,
  operateur: ligne.operateur === undefined ? '' : `${ligne.operateur.prenom} ${ligne.operateur.nom}`,
  operateurId: ligne.operateurId,
  poste: ligne.poste?.libelle ?? '',
  ...(ligne.posteId === undefined ? {} : { posteId: ligne.posteId }),
  debut: ligne.debut,
  echeance: ligne.echeance,
});

const incoherente = (): Error => new Error('Ligne d’anomalie incohérente avec la nature demandée.');

export const toPageAnomalies = (nature: NatureAnomalie, page: PageRecue): PageAnomalies => {
  const { total, complete } = page;
  if (nature === 'CONFLIT') {
    return {
      nature,
      lignes: page.lignes.map(ligne => {
        if (ligne.nature !== 'CONFLIT') throw incoherente();
        return toLigne(ligne);
      }),
      total,
      complete,
    };
  }
  return {
    nature,
    lignes: page.lignes.map(ligne => {
      if (ligne.nature !== 'FIN_AUTOMATIQUE') throw incoherente();
      return toLigneFinAutomatique(ligne);
    }),
    total,
    complete,
  };
};
