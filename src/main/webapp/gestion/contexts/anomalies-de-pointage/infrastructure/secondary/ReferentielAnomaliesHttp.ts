import { components } from '@/app/generated/schema';
import { required } from '@/app/shared/api-client/infrastructure/secondary/required';
import { ElementAnomalie } from '../../domain/dossier/ElementAnomalie';
import { ElementAnomalieId } from '../../domain/dossier/ElementAnomalieId';
import { OperateurAnomalie } from '../../domain/dossier/OperateurAnomalie';
import { OperateurAnomalieId } from '../../domain/dossier/OperateurAnomalieId';

export const toOperateurAnomalie = (operateur: components['schemas']['RestOperateur']): OperateurAnomalie => ({
  id: new OperateurAnomalieId(operateur.id),
  nom: `${operateur.prenom} ${operateur.nom}`,
  ...(operateur.identifiant === undefined ? {} : { code: operateur.identifiant }),
});

export const toElementAnomalie = (element: components['schemas']['RestElementDeFabrication']): ElementAnomalie => ({
  id: new ElementAnomalieId(required(element.id, 'element.id')),
  nom: required(element.nom, 'element.nom'),
  ...(element.reference === undefined ? {} : { reference: element.reference }),
});
