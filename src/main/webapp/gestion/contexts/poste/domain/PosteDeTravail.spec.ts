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

  it('should identify whether it matches a given workstation identity', () => {
    const poste = new PosteDeTravail(new PosteDeTravailId('tour-1'), {
      libelle: new LibellePoste('Tour 1'),
      nature: new NatureDeTravail('tournage'),
      coutHoraire: undefined,
    });

    expect(poste.identifiePar(new PosteDeTravailId('tour-1'))).toBe(true);
    expect(poste.identifiePar(new PosteDeTravailId('tour-2'))).toBe(false);
  });

  it('should evolve its configuration while preserving its identity', () => {
    const initial = new PosteDeTravail(new PosteDeTravailId('tour-1'), {
      libelle: new LibellePoste('Tour 1'),
      nature: new NatureDeTravail('tournage'),
      coutHoraire: undefined,
    });
    const revised = initial.modifier({
      libelle: new LibellePoste('Tour Révisé'),
      nature: new NatureDeTravail('usinage'),
      coutHoraire: new CoutHoraire(55),
    });

    expect(revised.identifiePar(new PosteDeTravailId('tour-1'))).toBe(true);
    expect(revised.libelle.value).toBe('Tour Révisé');
    expect(revised.nature.value).toBe('usinage');
    expect(revised.coutHoraire?.value).toBe(55);
  });
});
