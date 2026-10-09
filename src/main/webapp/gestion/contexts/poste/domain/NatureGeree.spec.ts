import { CoutHoraire } from './CoutHoraire';
import { LibellePoste } from './LibellePoste';
import { NatureDeTravail } from './NatureDeTravail';
import { NatureDeTravailId } from './NatureDeTravailId';
import { NatureGeree } from './NatureGeree';
import { PosteDeTravail } from './PosteDeTravail';
import { PosteDeTravailId } from './PosteDeTravailId';

const tournageFixture = new NatureGeree(new NatureDeTravailId('nature-tournage'), new NatureDeTravail('Tournage'), {
  utilisee: true,
  postes: 1,
});

const posteFixture = (nature: string): PosteDeTravail =>
  new PosteDeTravail(new PosteDeTravailId('tour-1'), {
    libelle: new LibellePoste('Tour 1'),
    nature: new NatureDeTravail(nature),
    natureId: new NatureDeTravailId('nature-' + nature),
    coutHoraire: new CoutHoraire(45.5),
  });

describe('NatureGeree', () => {
  it('should be deletable only while nothing uses it', () => {
    const libre = new NatureGeree(new NatureDeTravailId('nature-libre'), new NatureDeTravail('Libre'), { utilisee: false, postes: 0 });
    const pointee = new NatureGeree(new NatureDeTravailId('nature-pointee'), new NatureDeTravail('Pointée'), { utilisee: true, postes: 0 });

    expect(libre.supprimable).toBe(true);
    expect(pointee.supprimable).toBe(false);
  });

  it('should recognise the postes carrying its current label', () => {
    expect(tournageFixture.porte(posteFixture('Tournage'))).toBe(true);
    expect(tournageFixture.porte(posteFixture('Fraisage'))).toBe(false);
  });
});
