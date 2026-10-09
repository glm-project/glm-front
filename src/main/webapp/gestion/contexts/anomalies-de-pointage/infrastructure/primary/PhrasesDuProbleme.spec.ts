import {
  activiteEchueFixture,
  dossierDeFinAutomatiqueFixture,
} from '@test/unit/fixtures/gestion/anomalies-de-pointage/DossierAnomalie.fixture';
import { describe, expect, it } from 'vitest';
import { phraseDuProbleme } from './PhrasesDuProbleme';

type Categorie = 'TRAVAIL' | 'NON_CONFORMITE';

describe('Phrase saying the problem of an automatic end', () => {
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
    const dossier = dossierDeFinAutomatiqueFixture({ activite: activiteEchueFixture('travail-8', categorie, '08:00', '18:00') });

    expect(phraseDuProbleme(dossier)).toBe(phrase);
  });
});
