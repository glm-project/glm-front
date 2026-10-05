import { components } from '@/app/generated/schema';
import { OperateurAnomalieId } from '../../domain/dossier/OperateurAnomalieId';
import { PosteAnomalieId } from '../../domain/dossier/PosteAnomalieId';
import { OperateurAnomalie, PosteAnomalie } from '../../domain/dossier/ReferentielAnomalies';

export const toOperateurAnomalie = (operateur: components['schemas']['RestOperateur']): OperateurAnomalie => ({
  id: new OperateurAnomalieId(operateur.id),
  nom: `${operateur.prenom} ${operateur.nom}`,
  ...(operateur.identifiant === undefined ? {} : { code: operateur.identifiant }),
  postesHabilites: operateur.postes.map(poste => new PosteAnomalieId(poste.id)),
});

export const toPosteAnomalie = (poste: components['schemas']['RestPosteDeTravail']): PosteAnomalie => ({
  id: new PosteAnomalieId(poste.id),
  libelle: poste.libelle,
});
