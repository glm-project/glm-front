import { ActiviteAnomalieId } from '../dossier/ActiviteAnomalieId';
import { ActiviteEchue, DossierAnomalie } from '../dossier/DossierAnomalie';
import { PointageAnomalieId } from '../dossier/PointageAnomalieId';
import { CadreDeLaFin } from './CadreDeLaFin';

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
    const bornes = CadreDeLaFin.depuis(dossierFixture(debut), MAINTENANT).bornes();

    expect(Date.parse(bornes.min)).toBe(Date.parse('2026-09-14T08:01:00-03:00'));
  });

  it('should not accept the fact after the clock when nothing bounds the end', () => {
    const bornes = CadreDeLaFin.depuis(dossierFixture('2026-09-14T08:00:00-03:00'), MAINTENANT).bornes();

    expect(Date.parse(bornes.max)).toBe(Date.parse(MAINTENANT));
  });

  it('should not accept the fact after the bound of the end when it comes before the clock', () => {
    const dossier = dossierFixture('2026-09-14T08:00:00-03:00', '2026-09-14T14:30:00Z');

    const bornes = CadreDeLaFin.depuis(dossier, MAINTENANT).bornes();

    expect(Date.parse(bornes.max)).toBe(Date.parse('2026-09-14T14:30:00Z'));
  });

  it('should not accept the fact after the clock when the bound of the end comes after it', () => {
    const dossier = dossierFixture('2026-09-14T08:00:00-03:00', '2026-09-14T22:00:00Z');

    const bornes = CadreDeLaFin.depuis(dossier, MAINTENANT).bornes();

    expect(Date.parse(bornes.max)).toBe(Date.parse(MAINTENANT));
  });
});
