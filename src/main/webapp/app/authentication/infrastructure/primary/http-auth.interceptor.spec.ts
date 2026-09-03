import { AuthenticationPort } from '@/app/authentication/domain/AuthenticationPort';
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

      TestBed.inject(HttpClient).request(originalRequest).subscribe();

      const req = TestBed.inject(HttpTestingController).expectOne(originalRequest.url);
      expect(req.request.method).toEqual(HTTP_METHOD);
      expect(req.request.url).toEqual(URL);
      expect(req.request.headers.get('ContentType')).toBe('application/json');
      expect(req.request.headers.get('Authorization')).toEqual(`Bearer ${TOKEN}`);
    });

    it('should not add authorization bearer token in request when it is not defined', () => {
      givenAnAuthenticationHolding(undefined);
      const originalRequest = buildHttpRequest();

      TestBed.inject(HttpClient).request(originalRequest).subscribe();

      const req = TestBed.inject(HttpTestingController).expectOne(originalRequest.url);
      expect(req.request.headers.get('ContentType')).toBe('application/json');
      expect(req.request.headers.get('Authorization')).toBeFalsy();
    });
  });
});
