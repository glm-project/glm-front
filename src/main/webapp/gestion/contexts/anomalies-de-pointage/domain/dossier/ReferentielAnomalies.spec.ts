import { OperateurAnomalieId } from './OperateurAnomalieId';
import { PosteAnomalieId } from './PosteAnomalieId';
import { OperateurAnomalie, PosteAnomalie, ReferentielAnomalies } from './ReferentielAnomalies';

const fraiseuse: PosteAnomalie = { id: new PosteAnomalieId('poste-fraiseuse'), libelle: 'Fraiseuse 1' };
const tour: PosteAnomalie = { id: new PosteAnomalieId('poste-tour'), libelle: 'Tour 1' };
const scie: PosteAnomalie = { id: new PosteAnomalieId('poste-scie'), libelle: 'Scie 1' };
const camille: OperateurAnomalie = {
  id: new OperateurAnomalieId('op-camille'),
  nom: 'Camille Martin',
  code: '007',
  postesHabilites: [tour.id, scie.id],
};
const alex: OperateurAnomalie = { id: new OperateurAnomalieId('op-alex'), nom: 'Alex Durand', postesHabilites: [] };

describe('Anomaly operator and workstation referential', () => {
  const referentiel = new ReferentielAnomalies([camille, alex], [fraiseuse, tour, scie]);

  it('should find an operator by its identity', () => {
    expect(referentiel.operateur(new OperateurAnomalieId('op-alex'))).toBe(alex);
  });

  it('should find no operator for an identity it does not hold', () => {
    expect(referentiel.operateur(new OperateurAnomalieId('op-absent'))).toBeUndefined();
  });
});
