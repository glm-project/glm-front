import { activiteEchueFixture, instantDuJourFixture } from '@test/unit/fixtures/gestion/anomalies-de-pointage/DossierAnomalie.fixture';
import { describe, expect, it } from 'vitest';
import { ActiviteAnomalie } from '../../domain/dossier/DossierAnomalie';
import { heureDe, libelleActivite, libelleCategorie, libelleDuGeste } from './PresentationDossier';

const NOW = new Date(2026, 9, 5, 10, 0);

const activiteFixture = (changement: Partial<ActiviteAnomalie> = {}): ActiviteAnomalie => ({
  ...activiteEchueFixture('travail-8', 'TRAVAIL', '08:00', '18:00'),
  ...changement,
});

const sansPeriode = ({ id, libelle, etat, ouvrant }: ActiviteAnomalie): ActiviteAnomalie => ({ id, libelle, etat, ouvrant });

describe('Name of a gesture', () => {
  it.each([
    { type: 'DEBUT', libelle: 'Démarrage' },
    { type: 'NON_CONFORMITE', libelle: 'Démarrage en NC' },
    { type: 'FIN', libelle: 'Arrêt' },
  ] as const)('should name the type "$type" by the button the operator pressed: "$libelle"', ({ type, libelle }) => {
    expect(libelleDuGeste({ type })).toBe(libelle);
  });
});

describe('Hour of an instant', () => {
  it('should be the local hour and minute of a readable instant', () => {
    expect(heureDe(instantDuJourFixture('08:05'))).toBe('08:05');
  });

  it('should be the text itself when it is not an instant', () => {
    expect(heureDe('pas un instant')).toBe('pas un instant');
  });
});

describe('Label of an activity', () => {
  it.each([
    { categorie: 'TRAVAIL' as const, libelle: 'Travail' },
    { categorie: 'NON_CONFORMITE' as const, libelle: 'Non-conformité' },
  ])('should name the category $categorie as $libelle', ({ categorie, libelle }) => {
    expect(libelleCategorie(categorie)).toBe(libelle);
  });

  it('should tell the start and the end of a finished activity', () => {
    expect(libelleActivite(activiteFixture(), NOW)).toBe('Travail · lundi 14 septembre à 08:00 → lundi 14 septembre à 18:00');
  });

  it('should tell only the start of an activity with no received end', () => {
    const periode = { categorie: 'TRAVAIL' as const, debut: instantDuJourFixture('08:00') };

    expect(libelleActivite(activiteFixture({ periode }), NOW)).toBe('Travail · lundi 14 septembre à 08:00');
  });

  it('should be the received label when its period is unknown', () => {
    expect(libelleActivite({ ...sansPeriode(activiteFixture()), libelle: 'Travail ouvert à 8 h' }, NOW)).toBe('Travail ouvert à 8 h');
  });
});
