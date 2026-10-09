import { components } from '@/app/generated/schema';
import { LigneFinAutomatique, PageAnomalies } from '../../domain/dossier/DossierAnomalie';
import { ElementAnomalieId } from '../../domain/dossier/ElementAnomalieId';
import { PointageAnomalieId } from '../../domain/dossier/PointageAnomalieId';
import { SuiviAnomalieId } from '../../domain/dossier/SuiviAnomalieId';

type PageRecue = components['schemas']['PageRestFinAutomatiqueEnListe'];
type FinAutomatiqueRecue = components['schemas']['RestFinAutomatiqueEnListe'];

const toLigneFinAutomatique = (ligne: FinAutomatiqueRecue): LigneFinAutomatique => ({
  adresse: { suivi: new SuiviAnomalieId(ligne.adresse.suivi), pointage: new PointageAnomalieId(ligne.adresse.pointage) },
  element: new ElementAnomalieId(ligne.elementId),
  designation: ligne.designation,
  operateur: ligne.operateur === undefined ? '' : `${ligne.operateur.prenom} ${ligne.operateur.nom}`,
  poste: ligne.poste?.libelle ?? '',
  ...(ligne.posteId === undefined ? {} : { posteId: ligne.posteId }),
  debut: ligne.debut,
  echeance: ligne.echeance,
});

export const toPageAnomalies = (page: PageRecue): PageAnomalies => ({
  lignes: page.content.map(toLigneFinAutomatique),
  total: page.totalElementsCount,
});
