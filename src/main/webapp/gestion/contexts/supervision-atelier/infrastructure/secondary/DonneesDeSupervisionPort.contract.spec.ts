import { describe, expect, it } from 'vitest';
import { ActiviteDeSupervision } from '../../domain/ActiviteDeSupervision';
import { CategorieActivite } from '../../domain/CategorieActivite';
import { DonneesDeSupervisionPort, LectureDeSupervision } from '../../domain/DonneesDeSupervisionPort';
import { IdentifiantActivite } from '../../domain/IdentifiantActivite';
import { IdentifiantOperateur } from '../../domain/IdentifiantOperateur';
import { Instant } from '../../domain/Instant';
import { JourneeDeTravail } from '../../domain/JourneeDeTravail';
import { OperateurDeclare } from '../../domain/OperateurDeclare';
import { InMemoryDonneesDeSupervision } from './InMemoryDonneesDeSupervision';

const aliceFixture = new OperateurDeclare(new IdentifiantOperateur('alice'), 'Martin', 'Alice');
const journeeFixture = JourneeDeTravail.open(aliceFixture.id, 'PRESENT');
const activiteFixture = new ActiviteDeSupervision({
  id: new IdentifiantActivite('act-1'),
  operateurId: aliceFixture.id,
  nom: 'OF-42',
  categorie: new CategorieActivite('NC'),
  debut: new Instant('2026-09-13T08:00:00Z'),
});
const lectureFixture: LectureDeSupervision = {
  status: 'complete',
  donnees: {
    operateurs: [aliceFixture],
    journees: [journeeFixture],
    activites: [activiteFixture],
  },
};

describe.each([
  {
    name: 'InMemory',
    create: (lecture: LectureDeSupervision | Error): DonneesDeSupervisionPort => new InMemoryDonneesDeSupervision(lecture),
  },
])('$name supervision data read contract', ({ create }) => {
  it('should return the complete supervision data', async () => {
    const port = create(lectureFixture);

    const result = await port.read();

    expect(result).toEqual(lectureFixture);
  });

  it('should expose incomplete acquisition without returning partial data', async () => {
    const port = create({ status: 'incomplete' });

    const result = await port.read();

    expect(result).toEqual({ status: 'incomplete' });
  });

  it('should reject a failed acquisition', async () => {
    const failureFixture = new Error('Source unavailable');
    const port = create(failureFixture);

    await expect(port.read()).rejects.toBe(failureFixture);
  });

  it('should retain the data independently of subsequent scenario collection changes', async () => {
    const operateursFixture = [aliceFixture];
    const journeesFixture = [journeeFixture];
    const activitesFixture = [activiteFixture];
    const port = create({
      status: 'complete',
      donnees: {
        operateurs: operateursFixture,
        journees: journeesFixture,
        activites: activitesFixture,
      },
    });
    operateursFixture.length = 0;
    journeesFixture.length = 0;
    activitesFixture.length = 0;

    const result = await port.read();

    expect(result).toEqual(lectureFixture);
  });
});
