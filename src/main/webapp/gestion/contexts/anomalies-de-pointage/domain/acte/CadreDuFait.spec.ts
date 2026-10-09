import { ActiviteAnomalieId } from '../dossier/ActiviteAnomalieId';
import { ActiviteAnomalie } from '../dossier/DossierAnomalie';
import { PointageAnomalieId } from '../dossier/PointageAnomalieId';
import { CadreDuFait } from './CadreDuFait';

const MAINTENANT = '2026-09-14T15:00:00-03:00';

const activite = (id: string, debut?: string): ActiviteAnomalie => ({
  id: new ActiviteAnomalieId(id),
  libelle: 'Travail',
  etat: 'TERMINEE',
  ouvrant: new PointageAnomalieId(`debut-${id}`),
  ...(debut === undefined ? {} : { periode: { categorie: 'TRAVAIL', debut } }),
});

const cadre = (...activites: readonly ActiviteAnomalie[]): CadreDuFait => CadreDuFait.depuis(activites, MAINTENANT);

describe('Frame of a fact proposed on a dossier', () => {
  it('should lower-bound the fact by the received start of the activity it ends', () => {
    const cadreDuDossier = cadre(
      activite('travail-8', '2026-09-14T08:00:00.123456789-03:00'),
      activite('nc-12', '2026-09-14T09:00:00-03:00'),
    );

    const bornes = cadreDuDossier.bornes({ activiteVisee: 'travail-8' });

    expect(bornes).toEqual({ min: '2026-09-14T08:00:00.123456789-03:00', max: MAINTENANT });
  });

  it('should follow the activity the manager now aims at', () => {
    const cadreDuDossier = cadre(activite('travail-8', '2026-09-14T08:00:00-03:00'), activite('nc-12', '2026-09-14T09:00:00-03:00'));

    const bornes = cadreDuDossier.bornes({ activiteVisee: 'nc-12' });

    expect(bornes.min).toBe('2026-09-14T09:00:00-03:00');
  });

  it.each([
    { cas: 'no activity is aimed at', activiteVisee: '' },
    { cas: 'the aimed activity is not in the dossier', activiteVisee: 'inconnue-1' },
    { cas: 'the aimed activity has no period', activiteVisee: 'sans-periode' },
  ])('should leave the fact without lower bound when $cas', ({ activiteVisee }) => {
    const cadreDuDossier = cadre(activite('travail-8', '2026-09-14T08:00:00-03:00'), activite('sans-periode'));

    const bornes = cadreDuDossier.bornes({ activiteVisee });

    expect(bornes).toEqual({ max: MAINTENANT });
  });
});
