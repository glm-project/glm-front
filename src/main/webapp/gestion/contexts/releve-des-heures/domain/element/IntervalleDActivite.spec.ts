import { InstantDeReleve } from '../releve/InstantDeReleve';
import { ElementReleveId } from './ElementReleveId';
import { FicheDIntervalle, IntervalleDActivite } from './IntervalleDActivite';

const instantFixture = (heure: string): InstantDeReleve => new InstantDeReleve(`2026-09-14T${heure}:00Z`);

const ficheFixture = (fiche: Partial<FicheDIntervalle>): FicheDIntervalle => ({
  element: new ElementReleveId('element-1'),
  poste: undefined,
  nature: undefined,
  categorie: 'TRAVAIL',
  debut: instantFixture('08:20'),
  fin: instantFixture('09:00'),
  presumee: false,
  ...fiche,
});

describe('IntervalleDActivite', () => {
  it('should refuse a presumed interval without an end', () => {
    expect(() => new IntervalleDActivite(ficheFixture({ fin: undefined, presumee: true }))).toThrow(
      'L’intervalle reçu du serveur est présumé sans fin.',
    );
  });

  it('should refuse an interval ending before it starts', () => {
    expect(() => new IntervalleDActivite(ficheFixture({ debut: instantFixture('08:20'), fin: instantFixture('08:19') }))).toThrow(
      'L’intervalle reçu du serveur finit avant de commencer.',
    );
  });

  it('should accept an interval still in progress, without an end', () => {
    expect(() => new IntervalleDActivite(ficheFixture({ fin: undefined }))).not.toThrow();
  });

  it('should accept an interval of zero duration', () => {
    expect(() => new IntervalleDActivite(ficheFixture({ debut: instantFixture('08:20'), fin: instantFixture('08:20') }))).not.toThrow();
  });
});
