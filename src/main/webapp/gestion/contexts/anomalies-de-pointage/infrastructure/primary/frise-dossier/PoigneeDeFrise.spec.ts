import { SaisieActe } from '../../../domain/acte/SaisieActe';
import { ActiviteAnomalieId } from '../../../domain/dossier/ActiviteAnomalieId';
import { placementDuDossier, poigneeDuDossier } from './PoigneeDeFrise';

describe('Handle of the proposed instant', () => {
  it('should draw no handle while the dossier is being read again', () => {
    const proposition = SaisieActe.correct('fin-23', {
      type: 'FIN',
      intention: 'FIN',
      activiteVisee: 'travail-8',
      operateur: 'op-camille',
      poste: 'poste-1',
      instant: new Date(2026, 8, 14, 23, 0).toISOString(),
    }).proposition;

    const poignee = poigneeDuDossier(undefined, proposition, new Date(2026, 9, 5, 10, 0).toISOString(), false);

    expect(poignee).toBeUndefined();
  });

  it.each([{ desactivee: true }, { desactivee: false }])(
    'should give the end without hour a placement bounded by the start of its activity and the clock, disabled: $desactivee',
    ({ desactivee }) => {
      const debut = new Date(2026, 8, 14, 8, 0).toISOString();
      const maintenant = new Date(2026, 9, 5, 10, 0).toISOString();
      const finARegulariser = SaisieActe.regularise({
        type: 'FIN',
        intention: 'FIN',
        activiteVisee: 'travail-8',
        operateur: 'op-camille',
        poste: 'poste-1',
        instant: '',
      }).proposition;
      const activites = [
        {
          id: new ActiviteAnomalieId('travail-8'),
          libelle: '',
          etat: 'ECHUE' as const,
          temps: '',
          periode: { categorie: 'TRAVAIL' as const, debut },
        },
      ];

      const placement = placementDuDossier({ activites }, finARegulariser, maintenant, desactivee);

      expect(placement).toEqual({ bornes: { min: debut, max: maintenant }, desactivee });
    },
  );

  it('should give no placement while the dossier is being read again', () => {
    const finARegulariser = SaisieActe.regularise({
      type: 'FIN',
      intention: 'FIN',
      activiteVisee: 'travail-8',
      operateur: 'op-camille',
      poste: 'poste-1',
      instant: '',
    }).proposition;

    const placement = placementDuDossier(undefined, finARegulariser, new Date(2026, 9, 5, 10, 0).toISOString(), false);

    expect(placement).toBeUndefined();
  });
});
