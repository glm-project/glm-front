import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { httpDeviceAuthorizationInterceptor } from './http-device-authorization.interceptor';

class AuthenticationFixture extends AuthenticationPort {
  token: string | undefined = 'autorise';
  reenrolments = 0;
  remoteToken: string | undefined;
  override currentToken(): string | undefined {
    return this.token;
  }
  override authenticate(): Promise<void> {
    this.reenrolments++;
    return Promise.resolve();
  }
  override logout(): void {
    this.token = undefined;
  }
  override synchronizeSession(): Promise<void> {
    return new Promise(resolve =>
      setTimeout(() => {
        if (this.remoteToken !== undefined) {
          this.token = this.remoteToken;
        }
        resolve();
      }),
    );
  }
}

describe('Pupitre authorization refusal', () => {
  let authentication: AuthenticationFixture;
  let http: HttpTestingController;
  let client: HttpClient;

  beforeEach(() => {
    vi.useFakeTimers();
    authentication = new AuthenticationFixture();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([httpDeviceAuthorizationInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthenticationPort, useValue: authentication },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
  });
  afterEach(() => {
    http.verify();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it.each([401, 403])('should require reenrolment after a refused device authorization (%s)', async status => {
    const response = whenReading();

    await whenServerRefuses(response, status);

    thenReenrolmentsAre(1);
    thenTokenIs(undefined);
  });

  it('should keep its enrolment when the server or the network is unavailable', async () => {
    const response = whenReading();

    await whenNetworkFails(response);

    thenReenrolmentsAre(0);
    thenTokenIs('autorise');
  });

  it('should leave a newer company session intact when a former request is refused', async () => {
    givenAnotherCompanySessionOnDisk();

    const response = whenReading();

    await whenServerRefuses(response, 403);

    thenReenrolmentsAre(0);
    thenTokenIs('autre-entreprise');
  });

  it('should let the existing enrolment finish when there is no device token yet', async () => {
    givenNoDeviceTokenYet();

    const response = whenReading();

    await whenServerRefuses(response, 401);

    thenReenrolmentsAre(0);
  });

  it('should let an authorized response through', async () => {
    const response = whenReading();

    whenServerAuthorizes();

    thenResponseIs(await response);
  });

  const givenAnotherCompanySessionOnDisk = (): void => {
    authentication.remoteToken = 'autre-entreprise';
  };
  const givenNoDeviceTokenYet = (): void => {
    authentication.token = undefined;
  };
  const whenReading = (): Promise<unknown> => firstValueFrom(client.get('/api/operateurs')).catch((failure: unknown) => failure);
  const whenServerRefuses = async (response: Promise<unknown>, status: number): Promise<void> => {
    http.expectOne('/api/operateurs').flush({}, { status, statusText: 'Refused' });
    await vi.runAllTimersAsync();
    await response;
  };
  const whenNetworkFails = async (response: Promise<unknown>): Promise<void> => {
    http.expectOne('/api/operateurs').error(new ProgressEvent('error'));
    await response;
  };
  const whenServerAuthorizes = (): void => {
    http.expectOne('/api/operateurs').flush({ content: [] });
  };
  const thenReenrolmentsAre = (count: number): void => {
    expect(authentication.reenrolments).toBe(count);
  };
  const thenTokenIs = (token: string | undefined): void => {
    expect(authentication.currentToken()).toBe(token);
  };
  const thenResponseIs = (response: unknown): void => {
    expect(response).toEqual({ content: [] });
  };
});
