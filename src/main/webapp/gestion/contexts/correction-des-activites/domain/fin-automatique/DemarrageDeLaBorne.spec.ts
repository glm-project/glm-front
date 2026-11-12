import { ActiviteDeLaJourneeId } from '../journee/ActiviteDeLaJourneeId';
import { demarrageDeLaBorne } from './DemarrageDeLaBorne';
import { DossierDeLaFin, PointageDuDossier, TypeDePointage } from './DossierDeLaFin';
import { PointageDuDossierId } from './PointageDuDossierId';

const pointageFixture = (id: string, type: TypeDePointage, instant: string): PointageDuDossier => ({
  id: new PointageDuDossierId(id),
  fait: { type, instant },
});

const dossierFixture = (journal: readonly PointageDuDossier[], borneDeFin?: string): DossierDeLaFin => ({
  journal,
  activite: {
    id: new ActiviteDeLaJourneeId('debut-8'),
    ouvrant: new PointageDuDossierId('debut-8'),
    categorie: 'TRAVAIL',
    debut: '2026-09-14T08:00:00Z',
    echeance: '2026-09-14T21:00:00Z',
  },
  ...(borneDeFin === undefined ? {} : { borneDeFin }),
});

describe('Start that bounds the end of an automatic end', () => {
  it.each<TypeDePointage>(['DEBUT', 'NON_CONFORMITE'])('should be the %s pointage that falls on the bound of the end', type => {
    const suivant = pointageFixture('suivant', type, '2026-09-14T23:00:00Z');
    const dossier = dossierFixture([pointageFixture('debut-8', 'DEBUT', '2026-09-14T08:00:00Z'), suivant], '2026-09-14T23:00:00Z');

    const demarrage = demarrageDeLaBorne(dossier);

    expect(demarrage).toBe(suivant);
  });

  it('should compare the instants whatever their spelling, down to the nanosecond', () => {
    const suivant = pointageFixture('suivant', 'DEBUT', '2026-09-14T20:00:00.000000001-03:00');
    const dossier = dossierFixture([suivant], '2026-09-14T23:00:00.000000001Z');

    const demarrage = demarrageDeLaBorne(dossier);

    expect(demarrage).toBe(suivant);
  });

  it.each([
    { cas: 'a stop', pointage: pointageFixture('fin', 'FIN', '2026-09-14T23:00:00Z') },
    { cas: 'a start at another instant', pointage: pointageFixture('autre', 'DEBUT', '2026-09-14T23:00:00.000000001Z') },
    { cas: 'a pointage whose instant cannot be read', pointage: pointageFixture('illisible', 'DEBUT', 'illisible') },
  ])('should not be $cas', ({ pointage }) => {
    const dossier = dossierFixture([pointage], '2026-09-14T23:00:00Z');

    const demarrage = demarrageDeLaBorne(dossier);

    expect(demarrage).toBeUndefined();
  });

  it('should be none when nothing bounds the end', () => {
    const dossier = dossierFixture([pointageFixture('suivant', 'DEBUT', '2026-09-14T23:00:00Z')]);

    const demarrage = demarrageDeLaBorne(dossier);

    expect(demarrage).toBeUndefined();
  });
});
