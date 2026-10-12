import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { JourACorriger } from '@/gestion/contexts/correction-des-activites/domain/journee/JourACorriger';
import { JourneeACorrigerPort } from '@/gestion/contexts/correction-des-activites/domain/journee/JourneeACorrigerPort';
import { OperateurDeLaJourneeId } from '@/gestion/contexts/correction-des-activites/domain/journee/OperateurDeLaJourneeId';
import { HttpJourneeACorriger } from '@/gestion/contexts/correction-des-activites/infrastructure/secondary/HttpJourneeACorriger';
import { correctionDesActivitesProvider } from '@/gestion/correction-des-activites.provider';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';

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
});
