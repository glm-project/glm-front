import { CoutHoraire } from './CoutHoraire';
import { LibellePoste } from './LibellePoste';
import { NatureDeTravail } from './NatureDeTravail';
import { NatureDeTravailId } from './NatureDeTravailId';
import { NatureGeree } from './NatureGeree';
import { PosteDeTravail } from './PosteDeTravail';
import { PosteDeTravailId } from './PosteDeTravailId';

const tournageFixture = new NatureGeree(new NatureDeTravailId('nature-tournage'), new NatureDeTravail('Tournage'), 1);

const posteFixture = (nature: string): PosteDeTravail =>
  new PosteDeTravail(new PosteDeTravailId('tour-1'), {
    libelle: new LibellePoste('Tour 1'),
    nature: new NatureDeTravail(nature),
    coutHoraire: new CoutHoraire(45.5),
  });

describe('NatureGeree', () => {
  it('should recognise the postes carrying its current label', () => {
    expect(tournageFixture.porte(posteFixture('Tournage'))).toBe(true);
    expect(tournageFixture.porte(posteFixture('Fraisage'))).toBe(false);
  });
});
