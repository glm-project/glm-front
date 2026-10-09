import { ActiviteAnomalieId } from '../dossier/ActiviteAnomalieId';
import { ActiviteEchue, DossierAnomalie } from '../dossier/DossierAnomalie';
import { PointageAnomalieId } from '../dossier/PointageAnomalieId';
import { CadreDuFait } from './CadreDuFait';

const MAINTENANT = '2026-09-14T15:00:00-03:00';

const dossierFixture = (debut: string, borneDeFin?: string): Pick<DossierAnomalie, 'activite' | 'borneDeFin'> => {
  const activite: ActiviteEchue = {
    id: new ActiviteAnomalieId('travail-8'),
    ouvrant: new PointageAnomalieId('debut-8'),
    categorie: 'TRAVAIL',
    debut,
    echeance: '2026-09-14T21:00:00-03:00',
  };
  return borneDeFin === undefined ? { activite } : { activite, borneDeFin };
};

describe('Frame of a fact proposed on a dossier', () => {
  it.each([
    { cas: 'with a fraction of second', debut: '2026-09-14T08:00:00.123456789-03:00' },
    { cas: 'on a whole minute', debut: '2026-09-14T08:00:00-03:00' },
  ])('should not accept the fact before the first whole minute after the start of the activity, $cas', ({ debut }) => {
    const bornes = CadreDuFait.depuis(dossierFixture(debut), MAINTENANT).bornes();

    expect(bornes.min).toBe('2026-09-14T11:01:00.000Z');
  });

  it('should not accept the fact after the clock when nothing bounds the end', () => {
    const bornes = CadreDuFait.depuis(dossierFixture('2026-09-14T08:00:00-03:00'), MAINTENANT).bornes();

    expect(bornes.max).toBe(MAINTENANT);
  });

  it('should not accept the fact after the bound of the end when it comes before the clock', () => {
    const dossier = dossierFixture('2026-09-14T08:00:00-03:00', '2026-09-14T14:30:00Z');

    const bornes = CadreDuFait.depuis(dossier, MAINTENANT).bornes();

    expect(bornes.max).toBe('2026-09-14T14:30:00Z');
  });

  it('should not accept the fact after the clock when the bound of the end comes after it', () => {
    const dossier = dossierFixture('2026-09-14T08:00:00-03:00', '2026-09-14T22:00:00Z');

    const bornes = CadreDuFait.depuis(dossier, MAINTENANT).bornes();

    expect(bornes.max).toBe(MAINTENANT);
  });

  it('should compare the bound of the end and the clock beyond the millisecond', () => {
    const dossier = dossierFixture('2026-09-14T08:00:00-03:00', '2026-09-14T18:00:00.000000002Z');

    const bornes = CadreDuFait.depuis(dossier, '2026-09-14T18:00:00.000000001Z').bornes();

    expect(bornes.max).toBe('2026-09-14T18:00:00.000000001Z');
  });
});
