import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { CorrectionsPort, ResultatDeCorrection } from '@/gestion/contexts/correction-des-activites/domain/correction/CorrectionsPort';
import { SaisieDeRetrait } from '@/gestion/contexts/correction-des-activites/domain/correction/SaisieDeRetrait';
import { JourACorriger } from '@/gestion/contexts/correction-des-activites/domain/journee/JourACorriger';
import { JourneeACorrigerPort } from '@/gestion/contexts/correction-des-activites/domain/journee/JourneeACorrigerPort';
import { OperateurDeLaJourneeId } from '@/gestion/contexts/correction-des-activites/domain/journee/OperateurDeLaJourneeId';
import { HttpCorrections } from '@/gestion/contexts/correction-des-activites/infrastructure/secondary/HttpCorrections';
import { HttpJourneeACorriger } from '@/gestion/contexts/correction-des-activites/infrastructure/secondary/HttpJourneeACorriger';
import { correctionDesActivitesProvider } from '@/gestion/correction-des-activites.provider';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import {
  activiteTerminee,
  elementFixture,
  instantLocal,
  journeeFixture,
  terminee,
  tourFixture,
} from '@test/unit/fixtures/gestion/correction-des-activites/JourneeACorrigerFixture';

describe('Real composition of the activity correction', () => {
  let server: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...correctionDesActivitesProvider,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ErrorHandlerPort, useValue: new ErrorHandlerFixture() },
      ],
    });
    server = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    server.verify();
  });

  it('should resolve the day reading port to its HTTP adapter', () => {
    const port = whenResolvingTheDayReadingPort();

    thenItIsTheHttpAdapter(port);
  });

  const whenResolvingTheDayReadingPort = (): JourneeACorrigerPort => TestBed.inject(JourneeACorrigerPort);

  const thenItIsTheHttpAdapter = (port: JourneeACorrigerPort): void => {
    expect(port).toBeInstanceOf(HttpJourneeACorriger);
  };

  it('should read the day to correct through the public port on the same-origin API', async () => {
    const lecture = whenReadingTheDayOfAnUnknownOperator();
    whenTheOperatorIsUnknown();

    expect(await lecture).toBeUndefined();
  });

  const whenReadingTheDayOfAnUnknownOperator = (): Promise<unknown> =>
    TestBed.inject(JourneeACorrigerPort).lire(new OperateurDeLaJourneeId('op-1'), new JourACorriger('2026-10-05'));

  const whenTheOperatorIsUnknown = (): void => {
    server
      .expectOne('/api/atelier/operateurs/op-1/journees/2026-10-05')
      .flush({ type: 'urn:glm:erreur:atelier:operateur-introuvable' }, { status: 404, statusText: 'Not Found' });
  };

  it('should resolve the corrections port to its HTTP adapter', () => {
    const port = whenResolvingTheCorrectionsPort();

    thenItIsTheHttpCorrections(port);
  });

  const whenResolvingTheCorrectionsPort = (): CorrectionsPort => TestBed.inject(CorrectionsPort);

  const thenItIsTheHttpCorrections = (port: CorrectionsPort): void => {
    expect(port).toBeInstanceOf(HttpCorrections);
  };

  it('should remove an activity through the public port on the same-origin API', async () => {
    const retrait = whenRemovingAnActivity();
    whenTheRemovalIsRecorded();

    expect(await retrait).toEqual({ kind: 'ENREGISTREE' });
  });

  const whenRemovingAnActivity = (): Promise<ResultatDeCorrection> => {
    const journee = journeeFixture({
      jour: 5,
      suivis: [{ suivi: 'suivi-1', element: elementFixture('1') }],
      activites: [
        {
          id: 'debut-8',
          suivi: 'suivi-1',
          poste: tourFixture,
          debut: instantLocal(5, 18, 30),
          etat: terminee(instantLocal(5, 21, 45), 'PT3H15M'),
        },
      ],
    });
    return TestBed.inject(CorrectionsPort).retirer(SaisieDeRetrait.pour(undefined, activiteTerminee(journee, 'debut-8'), () => 'saisie-1'));
  };

  const whenTheRemovalIsRecorded = (): void => {
    server.expectOne('/api/atelier/suivis/suivi-1/activites/debut-8/retrait').flush({}, { status: 201, statusText: 'Created' });
  };
});
