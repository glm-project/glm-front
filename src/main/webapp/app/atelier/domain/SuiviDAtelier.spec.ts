import { ActiviteEnCours } from './ActiviteEnCours';
import { SuiviDAtelier } from './SuiviDAtelier';

const SUIVI_ID = 'b7f0c2de-1f2a-4c3b-9d4e-5f6a7b8c9d0e';
const JEAN = '0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d';
const MARIE = '9f8e7d6c-5b4a-3210-9876-543210fedcba';
const TOUR_1 = '11111111-2222-3333-4444-555555555555';
const HUIT_HEURES = new Date('2026-05-11T06:00:00Z');
const NEUF_HEURES_TRENTE = new Date('2026-05-11T07:30:00Z');
const UNE_HEURE_ET_DEMIE = 90 * 60 * 1000;
const SANS_ACTIVITE: ActiviteEnCours[] = [];

describe('SuiviDAtelier', () => {
  it('should call an element by the number the workshop reads on the board', () => {
    const suivi = unSuiviFixture(SANS_ACTIVITE);

    thenItIsCalled(suivi, 'OF-2026-000042');
  });

  it('should hand over the activity of the operator it is asked about', () => {
    const suivi = unSuiviFixture([uneActiviteFixture(MARIE), uneActiviteFixture(JEAN)]);

    thenTheActivityIsOn(suivi, JEAN);
  });

  it('should hand over no activity for an operator who is not on the element', () => {
    const suivi = unSuiviFixture([uneActiviteFixture(MARIE)]);

    thenNothingIsOpenFor(suivi, JEAN);
  });

  it('should tell how long the operator has been on the element', () => {
    const suivi = unSuiviFixture([uneActiviteFixture(JEAN)]);

    thenItHasLastedFor(suivi, JEAN, UNE_HEURE_ET_DEMIE);
  });

  it('should tell no duration for an operator who is not on the element', () => {
    const suivi = unSuiviFixture([uneActiviteFixture(MARIE)]);

    thenNothingIsOpenFor(suivi, JEAN);
  });

  const uneActiviteFixture = (operateurId: string): ActiviteEnCours => new ActiviteEnCours(operateurId, 'TRAVAIL', HUIT_HEURES, TOUR_1);

  const unSuiviFixture = (activites: ActiviteEnCours[]): SuiviDAtelier =>
    new SuiviDAtelier(SUIVI_ID, 'OF-2026-000042', 'EN_COURS', 'ORDRE_DE_FABRICATION', activites);

  const thenItIsCalled = (suivi: SuiviDAtelier, numero: string): void => {
    expect(suivi.numero()).toBe(numero);
  };

  const thenTheActivityIsOn = (suivi: SuiviDAtelier, operateurId: string): void => {
    const activite = suivi.activiteDe(operateurId);

    expect(activite?.categorie).toBe('TRAVAIL');
    expect(activite?.depuis).toEqual(HUIT_HEURES);
    expect(activite?.posteId).toBe(TOUR_1);
  };

  const thenNothingIsOpenFor = (suivi: SuiviDAtelier, operateurId: string): void => {
    expect(suivi.activiteDe(operateurId)).toBeUndefined();
    expect(suivi.dureeDe(operateurId, NEUF_HEURES_TRENTE)).toBeUndefined();
  };

  const thenItHasLastedFor = (suivi: SuiviDAtelier, operateurId: string, millisecondes: number): void => {
    expect(suivi.dureeDe(operateurId, NEUF_HEURES_TRENTE)).toBe(millisecondes);
  };
});
