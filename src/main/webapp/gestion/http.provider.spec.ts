import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { InMemoryAuthentication } from '@/app/shared/authentication/infrastructure/secondary/in-memory/InMemoryAuthentication';
import { HttpClient, HttpRequest } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { gestionHttpProvider } from './http.provider';

describe('Gestion HTTP policy', () => {
  let server: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [gestionHttpProvider, provideHttpClientTesting(), { provide: AuthenticationPort, useClass: InMemoryAuthentication }],
    });
    server = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    server.verify();
  });

  it.each(['GET', 'POST', 'PUT', 'DELETE'])('should reach the server without HTTP caching for an API %s', async method => {
    await givenAnAuthenticatedSession();

    const response = whenRequesting(method, '/api/postes-de-travail');
    const request = await whenTheServerAnswers('/api/postes-de-travail?page=1');
    await response;

    expect(request.cache).toBe('no-store');
    expect(request.headers.get('Cache-Control')).toBe('no-cache, no-store');
    expect(request.headers.get('Authorization')).toBe('Bearer in-memory-token');
    expect(request.headers.get('X-Correlation-Id')).toBe('request-identity');
    expect(request.body).toEqual({ libelle: 'Tour 1' });
  });

  it('should preserve the caller caching policy for a static asset', async () => {
    const response = whenRequesting('GET', '/assets/settings.json');
    const request = await whenTheServerAnswers('/assets/settings.json?page=1');
    await response;

    expect(request.cache).toBe('force-cache');
    expect(request.headers.get('Cache-Control')).toBeNull();
  });

  const givenAnAuthenticatedSession = (): Promise<void> => TestBed.inject(AuthenticationPort).authenticate();
  const whenRequesting = (method: string, url: string): Promise<unknown> =>
    firstValueFrom(
      TestBed.inject(HttpClient).request(method, url, {
        body: { libelle: 'Tour 1' },
        params: { page: 1 },
        headers: { 'X-Correlation-Id': 'request-identity' },
        cache: 'force-cache',
      }),
    );
  const whenTheServerAnswers = async (url: string): Promise<HttpRequest<unknown>> => {
    await new Promise<void>(resolve => setTimeout(resolve));
    const pending = server.expectOne(url);
    pending.flush({ libelle: 'Tour 1' });
    return pending.request;
  };
});
