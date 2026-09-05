import { Operateur } from './Operateur';
import { PosteHabilite } from './PosteHabilite';

const MATRICULE = '049';
const AUCUN_MATRICULE = undefined;
const SANS_POSTE: PosteHabilite[] = [];

describe('Operateur', () => {
  it('should answer to the code its matricule spells', () => {
    const operateur = unOperateurFixture(MATRICULE);

    thenItAnswersTo(operateur, MATRICULE);
  });

  it('should not answer to a code that only starts like its matricule', () => {
    const operateur = unOperateurFixture(MATRICULE);

    thenItStaysSilentOn(operateur, '04');
  });

  it('should never answer when the company attributes it no matricule', () => {
    const operateur = unOperateurFixture(AUCUN_MATRICULE);

    thenItStaysSilentOn(operateur, MATRICULE);
  });

  const unOperateurFixture = (matricule: string | undefined): Operateur =>
    new Operateur('0a1b2c3d', 'Dupont', 'Jean', SANS_POSTE, matricule);

  const thenItAnswersTo = (operateur: Operateur, code: string): void => {
    expect(operateur.matchesCode(code)).toBe(true);
  };

  const thenItStaysSilentOn = (operateur: Operateur, code: string): void => {
    expect(operateur.matchesCode(code)).toBe(false);
  };
});
