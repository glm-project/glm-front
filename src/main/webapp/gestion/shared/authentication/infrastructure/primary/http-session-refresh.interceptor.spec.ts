import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { httpAuthInterceptor } from '@/app/shared/authentication/infrastructure/primary/http-auth.interceptor';
import { HttpBackend, HttpClient, HttpEvent, HttpRequest, HttpResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, Observable, of } from 'rxjs';
import { httpSessionRefreshInterceptor } from './http-session-refresh.interceptor';

const INITIAL_TOKEN = 'initial-token';
const RENEWED_TOKEN = 'renewed-token';

class AuthenticationFixture extends AuthenticationPort {
  token: string | undefined = INITIAL_TOKEN;
  shouldFailRefresh = false;

  override authenticate(): Promise<void> {
    return Promise.resolve();
  }

  override currentToken(): string | undefined {
    return this.token;
  }

  override async synchronizeSession(): Promise<void> {
    await new Promise<void>(resolve => setTimeout(resolve));
    if (this.shouldFailRefresh) {
      throw new Error('refresh refused');
    }
    this.token = RENEWED_TOKEN;
  }

  override logout(): void {
    this.token = undefined;
  }
}

describe('httpSessionRefreshInterceptor', () => {
  let authentication: AuthenticationFixture;
  let sentAuthorizations: string[];

  beforeEach(() => {
    authentication = new AuthenticationFixture();
    sentAuthorizations = [];
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([httpSessionRefreshInterceptor, httpAuthInterceptor])),
        { provide: AuthenticationPort, useValue: authentication },
        {
          provide: HttpBackend,
          useValue: {
            handle: (request: HttpRequest<unknown>): Observable<HttpEvent<string>> => {
              const authorization = request.headers.get('Authorization') ?? '';
              sentAuthorizations.push(authorization);
              return of(new HttpResponse({ body: authorization }));
            },
          },
        },
      ],
    });
  });

  it('should sign a request after boot with the renewed token', async () => {
    givenAnAuthenticatedSession();

    const authorization = await whenRequestingProtectedData();

    expect(authorization).toBe(`Bearer ${RENEWED_TOKEN}`);
  });

  it('should await renewal for every concurrent request', async () => {
    givenAnAuthenticatedSession();

    const authorizations = await Promise.all([whenRequestingProtectedData(), whenRequestingProtectedData()]);

    expect(authorizations).toEqual([`Bearer ${RENEWED_TOKEN}`, `Bearer ${RENEWED_TOKEN}`]);
  });

  it('should fail without sending a stale bearer when session renewal is refused', async () => {
    givenSessionRenewalWillFail();

    const request = whenRequestingProtectedData();

    await expect(request).rejects.toThrow('refresh refused');
    expect(sentAuthorizations).toEqual([]);
  });

  it('should sign a later request after session renewal recovers from refusal', async () => {
    await givenAnInitialRefreshFailure();

    const authorization = await whenRequestingProtectedData();

    expect(authorization).toBe(`Bearer ${RENEWED_TOKEN}`);
  });

  const givenAnAuthenticatedSession = (): void => {
    authentication.token = INITIAL_TOKEN;
  };
  const givenSessionRenewalWillFail = (): void => {
    authentication.shouldFailRefresh = true;
  };
  const givenAnInitialRefreshFailure = async (): Promise<void> => {
    authentication.shouldFailRefresh = true;
    await whenRequestingProtectedData().catch(() => undefined);
    authentication.shouldFailRefresh = false;
  };
  const whenRequestingProtectedData = (): Promise<string> =>
    firstValueFrom(TestBed.inject(HttpClient).get('/protected', { responseType: 'text' }));
});
