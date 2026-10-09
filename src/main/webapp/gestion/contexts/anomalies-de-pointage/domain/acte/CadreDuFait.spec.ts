import { ActiviteAnomalieId } from '../dossier/ActiviteAnomalieId';
import { ActiviteEchue } from '../dossier/DossierAnomalie';
import { PointageAnomalieId } from '../dossier/PointageAnomalieId';
import { CadreDuFait } from './CadreDuFait';

const MAINTENANT = '2026-09-14T15:00:00-03:00';

const activiteFixture = (debut: string): ActiviteEchue => ({
  id: new ActiviteAnomalieId('travail-8'),
  ouvrant: new PointageAnomalieId('debut-8'),
  categorie: 'TRAVAIL',
  debut,
  echeance: '2026-09-14T21:00:00-03:00',
});

describe('Frame of a fact proposed on a dossier', () => {
  it('should bound the fact by the received start of the expired activity and by the clock', () => {
    const bornes = CadreDuFait.depuis(activiteFixture('2026-09-14T08:00:00.123456789-03:00'), MAINTENANT).bornes();

    expect(bornes).toEqual({ min: '2026-09-14T08:00:00.123456789-03:00', max: MAINTENANT });
  });
});
