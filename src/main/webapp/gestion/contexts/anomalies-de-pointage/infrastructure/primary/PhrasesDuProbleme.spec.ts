import {
  activiteEchueFixture,
  dossierDeFinAutomatiqueFixture,
  instantDuJourFixture,
} from '@test/unit/fixtures/gestion/anomalies-de-pointage/DossierAnomalie.fixture';
import { describe, expect, it } from 'vitest';
import { ActiviteAnomalie } from '../../domain/dossier/DossierAnomalie';
import { phrasesDuProbleme } from './PhrasesDuProbleme';

type Categorie = 'TRAVAIL' | 'NON_CONFORMITE';

const sansPeriode = ({ id, libelle, etat, ouvrant }: ActiviteAnomalie): ActiviteAnomalie => ({ id, libelle, etat, ouvrant });

describe('Phrases saying the problem of an automatic end', () => {
  it.each<{ cas: string; categorie: Categorie; phrase: string }>([
    {
      cas: 'a work never stopped',
      categorie: 'TRAVAIL',
      phrase: 'Le travail démarré à 08:00 n’a jamais été arrêté : fin automatique à 18:00.',
    },
    {
      cas: 'a non-conformity never stopped',
      categorie: 'NON_CONFORMITE',
      phrase: 'La non-conformité démarrée à 08:00 n’a jamais été arrêtée : fin automatique à 18:00.',
    },
  ])('should say the problem of $cas', ({ categorie, phrase }) => {
    const dossier = dossierDeFinAutomatiqueFixture({ activites: [activiteEchueFixture('travail-8', categorie, '08:00', '18:00')] });

    expect(phrasesDuProbleme(dossier)).toEqual([phrase]);
  });

  it('should say one problem per due activity of the dossier', () => {
    const dossier = dossierDeFinAutomatiqueFixture({
      activites: [
        activiteEchueFixture('travail-8', 'TRAVAIL', '08:00', '18:00'),
        activiteEchueFixture('nc-9', 'NON_CONFORMITE', '09:00', '19:00'),
      ],
    });

    expect(phrasesDuProbleme(dossier)).toEqual([
      'Le travail démarré à 08:00 n’a jamais été arrêté : fin automatique à 18:00.',
      'La non-conformité démarrée à 09:00 n’a jamais été arrêtée : fin automatique à 19:00.',
    ]);
  });

  it.each<{ cas: string; activite: ActiviteAnomalie }>([
    {
      cas: 'an activity that is not due',
      activite: {
        ...activiteEchueFixture('travail-8', 'TRAVAIL', '08:00', '17:00'),
        etat: 'TERMINEE',
      },
    },
    { cas: 'a due activity without period', activite: sansPeriode(activiteEchueFixture('travail-8', 'TRAVAIL', '08:00', '18:00')) },
    {
      cas: 'a due activity whose end was not received',
      activite: {
        ...sansPeriode(activiteEchueFixture('travail-8', 'TRAVAIL', '08:00', '18:00')),
        periode: { categorie: 'TRAVAIL', debut: instantDuJourFixture('08:00') },
      },
    },
  ])('should say nothing of $cas on an automatic end', ({ activite }) => {
    expect(phrasesDuProbleme(dossierDeFinAutomatiqueFixture({ activites: [activite] }))).toEqual([]);
  });
});
