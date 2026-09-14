import { CoutHoraire } from './CoutHoraire';
import { LibellePoste } from './LibellePoste';
import { NatureDeTravail } from './NatureDeTravail';
import { PosteDeTravail } from './PosteDeTravail';
import { PosteDeTravailId } from './PosteDeTravailId';

describe('PosteDeTravail', () => {
  it.each([undefined, new CoutHoraire(45.5)])('should keep its identity and validated configuration with hourly cost %s', coutHoraire => {
    const configuration = { libelle: new LibellePoste('Tour 1'), nature: new NatureDeTravail('tournage'), coutHoraire };
    const poste = new PosteDeTravail(new PosteDeTravailId('tour-1'), configuration);
    expect(poste.id.value).toBe('tour-1');
    expect(poste.libelle.value).toBe('Tour 1');
    expect(poste.nature.value).toBe('tournage');
    expect(poste.coutHoraire).toEqual(coutHoraire);
  });
});
