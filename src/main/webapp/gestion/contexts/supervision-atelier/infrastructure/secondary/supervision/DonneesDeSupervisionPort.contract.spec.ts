import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Instant } from '../../../domain/instant/Instant';
import { IdentifiantOperateur } from '../../../domain/operateur/IdentifiantOperateur';
import { OperateurDeclare } from '../../../domain/operateur/OperateurDeclare';
import { NatureDeTravail } from '../../../domain/poste/NatureDeTravail';
import { DonneesDeSupervision, DonneesDeSupervisionPort } from '../../../domain/supervision/DonneesDeSupervisionPort';
import { HttpDonneesDeSupervision } from './HttpDonneesDeSupervision';
import { InMemoryDonneesDeSupervision } from './InMemoryDonneesDeSupervision';

describe.each([
  {
    name: 'InMemory',
    create: (): DonneesDeSupervisionPort => new InMemoryDonneesDeSupervision(),
  },
])('$name supervision data read contract', ({ create }) => {
  afterEach(() => vi.useRealTimers());

  it('should retain the evaluation of each complete acquisition', async () => {
    givenEvaluationAt('2026-09-13T10:00:00Z');
    const port = create();

    const premiere = await port.read();
    const suivante = await whenReadAt(port, '2026-09-13T10:00:30Z');

    expect(premiere.evaluation.value).toBe('2026-09-13T10:00:00.000Z');
    expect(suivante.evaluation.value).toBe('2026-09-13T10:00:30.000Z');
  });

  it('should read conflicting sequences separately from interpretable activities', async () => {
    const port = create();

    const donnees = await port.read();

    expect(donnees.sequencesEnConflit.length).toBeGreaterThan(0);
    expect(donnees.sequencesEnConflit.every(sequence => sequence.hasOperateurIdentifiable(donnees.operateurs))).toBe(true);
  });

  it('should represent personal work by its fabrication order in the demonstration', async () => {
    const port = create();

    const donnees = await port.read();

    expect(donnees.activites.find(activite => activite.operateurId?.value === 'op-chevalier')?.objet).toMatchObject({
      type: 'ORDRE_DE_FABRICATION',
      nom: 'OF Perso',
    });
    expect(
      donnees.sequencesEnConflit.flatMap(sequence => sequence.activites).find(activite => activite.id.value === 'act-morel-a-resoudre')
        ?.objet,
    ).toMatchObject({
      type: 'ORDRE_DE_FABRICATION',
      nom: 'OF Perso',
    });
  });

  it('should read supervision data in which every activity belongs to a declared operator', async () => {
    const port = create();

    const donnees = await port.read();

    expect(donnees.activites.filter(activite => !activite.hasOperateurIdentifiable(donnees.operateurs))).toEqual([]);
  });
});

const givenEvaluationAt = (instant: string): void => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(instant));
};

const whenReadAt = (port: DonneesDeSupervisionPort, instant: string) => {
  vi.setSystemTime(new Date(instant));
  return port.read();
};

const EVALUATION = new Instant('2026-09-13T10:00:00Z');
type RestSupervision = components['schemas']['RestSupervisionDAtelier'];

interface SceneFixture {
  readonly donnees: DonneesDeSupervision;
  readonly response: RestSupervision;
}

interface ReadHarness {
  readonly port: DonneesDeSupervisionPort;
  answer(): void;
}

const emptyFixture: SceneFixture = {
  donnees: { evaluation: EVALUATION, operateurs: [], activites: [], sequencesEnConflit: [] },
  response: { evaluation: EVALUATION.value, operateurs: [], activites: [], sequencesEnConflit: [] },
};

const operateurFixture = new OperateurDeclare({
  id: new IdentifiantOperateur('op-serin'),
  nom: 'Sérin',
  prenom: 'Maya',
  metiers: [new NatureDeTravail('Rectification')],
});
const oneOperatorFixture: SceneFixture = {
  donnees: { ...emptyFixture.donnees, operateurs: [operateurFixture] },
  response: { ...emptyFixture.response, operateurs: [{ id: 'op-serin', nom: 'Sérin', prenom: 'Maya', metiers: ['Rectification'] }] },
};

const givenInMemory = (scene: SceneFixture): ReadHarness => ({
  port: new InMemoryDonneesDeSupervision(scene.donnees),
  answer: () => undefined,
});

const givenHttp = (scene: SceneFixture): ReadHarness => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      ApiClient,
      HttpDonneesDeSupervision,
      { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  return {
    port: TestBed.inject(HttpDonneesDeSupervision),
    answer: () => {
      http.expectOne({ method: 'GET', url: '/api/atelier/supervision' }).flush(scene.response);
    },
  };
};

const whenRead = async (harness: ReadHarness): Promise<DonneesDeSupervision> => {
  const reading = harness.port.read();
  harness.answer();
  return reading;
};

describe.each([
  { name: 'InMemory', given: givenInMemory },
  { name: 'HTTP', given: givenHttp },
])('$name complete supervision acquisition', ({ given }) => {
  afterEach(() => vi.useRealTimers());

  it('should read a complete empty workshop without fabricating operators or activities', async () => {
    givenEvaluationAt(EVALUATION.value);
    const harness = given(emptyFixture);

    const donnees = await whenRead(harness);

    expect(donnees).toEqual(emptyFixture.donnees);
  });

  it('should retain a declared operator and trades even without any activity', async () => {
    givenEvaluationAt(EVALUATION.value);
    const harness = given(oneOperatorFixture);

    const donnees = await whenRead(harness);

    expect(donnees).toEqual(oneOperatorFixture.donnees);
  });
});
