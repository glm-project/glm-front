import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { HttpClient, HttpRequest, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { httpAuthInterceptor } from './http-auth.interceptor';

const URL = 'http://localhost:8080/api/dummy';
const HTTP_METHOD = 'GET';
const TOKEN = '1a2b3c';

class AuthenticationFixture extends AuthenticationPort {
  constructor(private bearerToken: string | undefined) {
    super();
  }

  override authenticate(): Promise<void> {
    return Promise.resolve();
  }

  override currentToken(): string | undefined {
    return this.bearerToken;
  }

  override logout(): void {
    this.bearerToken = undefined;
  }
}

const buildHttpRequest = () => {
  const originalRequest: HttpRequest<unknown> = new HttpRequest<unknown>(HTTP_METHOD, URL);
  return originalRequest.clone({
    headers: originalRequest.headers.append('ContentType', 'application/json'),
  });
};

const givenAnAuthenticationHolding = (bearerToken: string | undefined): void => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([httpAuthInterceptor])),
      provideHttpClientTesting(),
      { provide: AuthenticationPort, useValue: new AuthenticationFixture(bearerToken) },
    ],
  });
};

describe('httpAuthInterceptor', () => {
  describe('Bearer Token', () => {
    it('should add authorization bearer token in request when defined', () => {
      givenAnAuthenticationHolding(TOKEN);
      const originalRequest = buildHttpRequest();

      whenSending(originalRequest);

      thenRequestCarriesItsOriginalPropertiesAnd(TOKEN, originalRequest.url);
    });

    it('should not add authorization bearer token in request when it is not defined', () => {
      givenAnAuthenticationHolding(undefined);
      const originalRequest = buildHttpRequest();

      whenSending(originalRequest);

      thenRequestCarriesNoAuthorization(originalRequest.url);
    });
  });

  const whenSending = (request: HttpRequest<unknown>): void => {
    TestBed.inject(HttpClient).request(request).subscribe();
  };

  const thenRequestCarriesItsOriginalPropertiesAnd = (token: string, url: string): void => {
    const request = TestBed.inject(HttpTestingController).expectOne(url).request;
    expect(request.method).toEqual(HTTP_METHOD);
    expect(request.url).toEqual(URL);
    expect(request.headers.get('ContentType')).toBe('application/json');
    expect(request.headers.get('Authorization')).toEqual(`Bearer ${token}`);
  };

  const thenRequestCarriesNoAuthorization = (url: string): void => {
    const request = TestBed.inject(HttpTestingController).expectOne(url).request;
    expect(request.headers.get('ContentType')).toBe('application/json');
    expect(request.headers.get('Authorization')).toBeFalsy();
  };
});
