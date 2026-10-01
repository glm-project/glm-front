import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { InMemoryAuthentication } from '@/app/shared/authentication/infrastructure/secondary/in-memory/InMemoryAuthentication';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { HttpBackend, HttpEvent, HttpResponse, provideHttpClient } from '@angular/common/http';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { Observable, of } from 'rxjs';
import { Supervision } from './supervision';

describe('Connected supervision view', () => {
  let fixture: ComponentFixture<Supervision>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: AuthenticationPort, useClass: InMemoryAuthentication },
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
        { provide: HttpBackend, useClass: EmptyWorkshopFixture },
      ],
    });
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('should display an empty workshop when the company has no declared operator', async () => {
    await whenOpeningTheConnectedWorkshop();

    thenTheEmptyWorkshopIsDisplayed();
  });

  const whenOpeningTheConnectedWorkshop = async (): Promise<void> => {
    fixture = TestBed.createComponent(Supervision);
    await fixture.whenStable();
  };

  const thenTheEmptyWorkshopIsDisplayed = (): void => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector(dataSelector('supervision-empty'))?.textContent).toContain('Aucun opérateur');
    expect(host.querySelector(dataSelector('supervision-error'))).toBeNull();
  };
});

class EmptyWorkshopFixture implements HttpBackend {
  handle(): Observable<HttpEvent<unknown>> {
    return of(new HttpResponse({ body: { content: [], currentPage: 0, pageSize: 100, totalElementsCount: 0 } }));
  }
}
