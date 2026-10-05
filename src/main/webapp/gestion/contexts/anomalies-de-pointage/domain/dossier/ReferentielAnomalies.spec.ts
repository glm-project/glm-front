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

  it('should find a workstation by its identity', () => {
    expect(referentiel.poste(new PosteAnomalieId('poste-tour'))).toBe(tour);
  });

  it('should find no workstation for an identity it does not hold', () => {
    expect(referentiel.poste(new PosteAnomalieId('poste-absent'))).toBeUndefined();
  });

  it('should list the workstations an operator is qualified on, in referential order', () => {
    expect(referentiel.postesHabilites(new OperateurAnomalieId('op-camille'))).toEqual([tour, scie]);
  });

  it('should list the other workstations apart from the qualified ones', () => {
    expect(referentiel.autresPostes(new OperateurAnomalieId('op-camille'))).toEqual([fraiseuse]);
  });

  it('should consider every workstation as another one for an operator qualified on none', () => {
    expect(referentiel.postesHabilites(new OperateurAnomalieId('op-alex'))).toEqual([]);
    expect(referentiel.autresPostes(new OperateurAnomalieId('op-alex'))).toEqual([fraiseuse, tour, scie]);
  });

  it('should consider every workstation as another one for an operator it does not hold', () => {
    expect(referentiel.postesHabilites(new OperateurAnomalieId('op-absent'))).toEqual([]);
    expect(referentiel.autresPostes(new OperateurAnomalieId('op-absent'))).toEqual([fraiseuse, tour, scie]);
  });

  it('should ignore a qualification on a workstation the referential does not hold', () => {
    const orphelin = { ...camille, postesHabilites: [new PosteAnomalieId('poste-supprime'), tour.id] };

    const reduit = new ReferentielAnomalies([orphelin], [tour]);

    expect(reduit.postesHabilites(orphelin.id)).toEqual([tour]);
  });
});
