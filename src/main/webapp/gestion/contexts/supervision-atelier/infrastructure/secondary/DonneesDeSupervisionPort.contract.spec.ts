import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { beforeEach, describe, expect, it } from 'vitest';
import { ActiviteDeSupervision } from '../../domain/ActiviteDeSupervision';
import { CategorieActivite } from '../../domain/CategorieActivite';
import { DonneesDeSupervision, DonneesDeSupervisionPort } from '../../domain/DonneesDeSupervisionPort';
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
const lectureFixture: DonneesDeSupervision = {
  operateurs: [aliceFixture],
  journees: [journeeFixture],
  activites: [activiteFixture],
};

describe.each([
  {
    name: 'InMemory',
    create: (lecture: DonneesDeSupervision | Error): DonneesDeSupervisionPort =>
      TestBed.runInInjectionContext(() => new InMemoryDonneesDeSupervision(lecture)),
  },
])('$name supervision data read contract', ({ create }) => {
  let errorHandlerFixture: ErrorHandlerFixture;
  beforeEach(() => {
    errorHandlerFixture = new ErrorHandlerFixture();
    TestBed.configureTestingModule({ providers: [{ provide: ErrorHandlerPort, useValue: errorHandlerFixture }] });
  });
  it('should return the complete supervision data', async () => {
    const port = create(lectureFixture);

    const result = await port.read();

    expect(result).toEqual(lectureFixture);
  });

  it.each(['Source unavailable', 'Incomplete acquisition'])('should report and reject acquisition failure: %s', async message => {
    const failureFixture = new Error(message);
    const port = create(failureFixture);

    await expect(port.read()).rejects.toBe(failureFixture);
    expect(errorHandlerFixture.errors).toEqual([failureFixture]);
  });

  it('should retain the data independently of subsequent scenario collection changes', async () => {
    const operateursFixture = [aliceFixture];
    const journeesFixture = [journeeFixture];
    const activitesFixture = [activiteFixture];
    const port = create({
      operateurs: operateursFixture,
      journees: journeesFixture,
      activites: activitesFixture,
    });
    operateursFixture.length = 0;
    journeesFixture.length = 0;
    activitesFixture.length = 0;

    const result = await port.read();

    expect(result).toEqual(lectureFixture);
  });
});
