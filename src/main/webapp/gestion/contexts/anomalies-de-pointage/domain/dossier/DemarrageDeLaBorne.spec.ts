import { ActiviteAnomalieId } from './ActiviteAnomalieId';
import { demarrageDeLaBorne } from './DemarrageDeLaBorne';
import { DossierAnomalie, PointageAnomalie, TypePointage } from './DossierAnomalie';
import { OperateurAnomalieId } from './OperateurAnomalieId';
import { PointageAnomalieId } from './PointageAnomalieId';

const pointageFixture = (id: string, type: TypePointage, instant: string): PointageAnomalie => ({
  id: new PointageAnomalieId(id),
  fait: { type, operateur: 'op-camille', instant },
  operateurNom: 'Camille Martin',
});

const dossierFixture = (journal: readonly PointageAnomalie[], borneDeFin?: string): DossierAnomalie => ({
  operateur: new OperateurAnomalieId('op-camille'),
  operateurNom: 'Camille Martin',
  posteLibelle: 'DMU 50',
  journal,
  activite: {
    id: new ActiviteAnomalieId('travail-8'),
    ouvrant: new PointageAnomalieId('debut-8'),
    categorie: 'TRAVAIL',
    debut: '2026-09-14T08:00:00Z',
    echeance: '2026-09-14T21:00:00Z',
  },
  ...(borneDeFin === undefined ? {} : { borneDeFin }),
});

describe('Start that bounds the end of a dossier', () => {
  it.each<TypePointage>(['DEBUT', 'NON_CONFORMITE'])('should be the %s pointage that falls on the bound of the end', type => {
    const suivant = pointageFixture('suivant', type, '2026-09-14T23:00:00Z');
    const dossier = dossierFixture([pointageFixture('debut-8', 'DEBUT', '2026-09-14T08:00:00Z'), suivant], '2026-09-14T23:00:00Z');

    expect(demarrageDeLaBorne(dossier)).toBe(suivant);
  });

  it('should compare the instants whatever their spelling, down to the nanosecond', () => {
    const suivant = pointageFixture('suivant', 'DEBUT', '2026-09-14T20:00:00.000000001-03:00');
    const dossier = dossierFixture([suivant], '2026-09-14T23:00:00.000000001Z');

    expect(demarrageDeLaBorne(dossier)).toBe(suivant);
  });

  it.each([
    { cas: 'a stop', pointage: pointageFixture('fin', 'FIN', '2026-09-14T23:00:00Z') },
    { cas: 'a start at another instant', pointage: pointageFixture('autre', 'DEBUT', '2026-09-14T23:00:00.000000001Z') },
    { cas: 'a pointage whose instant cannot be read', pointage: pointageFixture('illisible', 'DEBUT', 'illisible') },
  ])('should not be $cas', ({ pointage }) => {
    expect(demarrageDeLaBorne(dossierFixture([pointage], '2026-09-14T23:00:00Z'))).toBeUndefined();
  });

  it('should be none when nothing bounds the end', () => {
    const dossier = dossierFixture([pointageFixture('suivant', 'DEBUT', '2026-09-14T23:00:00Z')]);

    expect(demarrageDeLaBorne(dossier)).toBeUndefined();
  });
});
