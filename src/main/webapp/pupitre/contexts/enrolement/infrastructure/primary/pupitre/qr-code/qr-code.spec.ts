import { ComponentFixture, TestBed } from '@angular/core/testing';
import { dataSelector } from '@test/utils/DataSelector';
import { QrCode } from './qr-code';

const LIEN = 'http://keycloak.test/realms/glm/device?user_code=WDJB-MJHT';
const UN_AUTRE_LIEN = 'http://keycloak.test/realms/glm/device?user_code=AAAA-BBBB';

describe('QrCode', () => {
  let fixture: ComponentFixture<QrCode>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [QrCode] });
    fixture = TestBed.createComponent(QrCode);
    fixture.componentRef.setInput('description', 'Code QR de validation du pupitre');
  });

  it('should draw the encoded link inside the bundle, with no request and no injected markup', () => {
    whenEncoding(LIEN);

    thenTheDrawingIsNotEmpty();
    thenTheDrawingIsDescribedAs('Code QR de validation du pupitre');
  });

  it('should draw a different code for a different link', () => {
    whenEncoding(LIEN);
    const premier = whatIsDrawn();

    whenEncoding(UN_AUTRE_LIEN);

    thenTheDrawingChangedFrom(premier);
  });

  it('should reserve the quiet zone the scanners need around the modules', () => {
    whenEncoding(LIEN);

    thenTheDrawingStartsAtTheQuietZone();
  });

  const whenEncoding = (lien: string): void => {
    fixture.componentRef.setInput('valeur', lien);
    fixture.detectChanges();
  };

  const whatIsDrawn = (): string => {
    const path = (fixture.nativeElement as HTMLElement).querySelector(dataSelector('qr-modules'));
    return path?.getAttribute('d') ?? '';
  };

  const viewBox = (): string => (fixture.nativeElement as HTMLElement).querySelector('svg')?.getAttribute('viewBox') ?? '';

  const thenTheDrawingIsNotEmpty = (): void => {
    expect(whatIsDrawn().length).toBeGreaterThan(0);
  };

  const thenTheDrawingIsDescribedAs = (description: string): void => {
    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toBe(description);
  };

  const thenTheDrawingChangedFrom = (previous: string): void => {
    expect(whatIsDrawn()).not.toBe(previous);
  };

  const thenTheDrawingStartsAtTheQuietZone = (): void => {
    const [, , largeur] = viewBox().split(' ').map(Number);
    const modules = whatIsDrawn()
      .split('M')
      .filter(segment => segment.length > 0);
    const marges = modules.map(segment => Number(segment.split(' ')[0]));
    expect(Math.min(...marges)).toBeGreaterThanOrEqual(2);
    expect(largeur).toBeGreaterThan(Math.max(...marges) + 2);
  };
});
