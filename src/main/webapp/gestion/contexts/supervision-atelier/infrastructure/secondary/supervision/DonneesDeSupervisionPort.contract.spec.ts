import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { InMemoryAuthentication } from '@/app/shared/authentication/infrastructure/secondary/in-memory/InMemoryAuthentication';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { HttpBackend, HttpErrorResponse, HttpEvent, HttpRequest, HttpResponse, provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { DeferredFixture } from '@test/unit/fixtures/DeferredFixture';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { defer, Observable, of, switchMap, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DonneesDeSupervisionPort } from '../../../domain/supervision/DonneesDeSupervisionPort';
import { HttpDonneesDeSupervision } from './HttpDonneesDeSupervision';
import { InMemoryDonneesDeSupervision } from './InMemoryDonneesDeSupervision';

describe.each([
  {
    name: 'InMemory',
    create: (): DonneesDeSupervisionPort => new InMemoryDonneesDeSupervision(),
  },
  {
    name: 'HTTP',
    create: (): DonneesDeSupervisionPort => {
      const acquisitionFixture = new HttpSupervisionFixture();
      acquisitionFixture.givenPage('/api/operateurs', pageFixture([operateurHttpFixture('op-1')]));
      acquisitionFixture.givenPage(
        '/api/atelier/suivis',
        pageFixture([
          {
            ...suiviHttpFixture('suivi-1'),
            conflits: [{ operateur: operateurHttpFixture('op-1'), activites: [], pointages: ['contradiction'] }],
          },
        ]),
      );
      return acquisitionFixture.port;
    },
  },
])('$name supervision data read contract', ({ create }) => {
  afterEach(() => TestBed.resetTestingModule());
  it('should read supervision data in which every activity belongs to a declared operator', async () => {
    const port = create();

    const donnees = await port.read();

    expect(donnees.activites.filter(activite => !activite.hasOperateurIdentifiable(donnees.operateurs))).toEqual([]);
    expect(donnees.conflits.filter(conflit => !conflit.hasOperateurIdentifiable(donnees.operateurs))).toEqual([]);
  });
});

describe('InMemory beyond the supervision contract', () => {
  it('should omit the demonstration activity that already reached its automatic deadline', async () => {
    const port = new InMemoryDonneesDeSupervision();

    const donnees = await port.read();

    expect(donnees.activites.some(activite => activite.operateurId?.value === 'op-marchand')).toBe(false);
  });

  it('should demonstrate a conflict without a current activity', async () => {
    const port = new InMemoryDonneesDeSupervision();

    const donnees = await port.read();

    expect(donnees.conflits.map(conflit => conflit.operateurId?.value)).toContain('op-dumas');
    expect(donnees.activites.some(activite => activite.operateurId?.value === 'op-dumas')).toBe(false);
  });
});

describe('HTTP beyond the supervision contract', () => {
  let acquisitionFixture: HttpSupervisionFixture;

  beforeEach(() => {
    acquisitionFixture = new HttpSupervisionFixture();
  });

  afterEach(() => TestBed.resetTestingModule());

  it.each([
    { position: 'first', first: [], second: [operateurHttpFixture('op-1')] },
    { position: 'intermediate', first: [operateurHttpFixture('op-1')], second: [] },
  ])('should reject an empty $position page even when a later page compensates its missing elements', async ({ first, second }) => {
    acquisitionFixture.givenPages('/api/operateurs', [
      { ...pageFixture(first, 0, 3), pageSize: 1 },
      { ...pageFixture(second, 1, 3), pageSize: 1 },
      { ...pageFixture([operateurHttpFixture('op-2'), operateurHttpFixture('op-3')], 2, 3), pageSize: 1 },
    ]);

    const read = acquisitionFixture.port.read();

    await expect(read).rejects.toThrow('Incomplete supervision acquisition');
  });

  it.each([
    { problem: 'initial page number', first: { ...pageFixture([], 0, 0), currentPage: 1 } },
    { problem: 'zero page size', first: { ...pageFixture([], 0, 0), pageSize: 0 } },
    { problem: 'negative total', first: pageFixture([], 0, -1) },
  ])('should reject invalid first-page metadata: $problem', async ({ first }) => {
    acquisitionFixture.givenPages('/api/operateurs', [first]);

    const read = acquisitionFixture.port.read();

    await expect(read).rejects.toThrow('Incomplete supervision acquisition');
  });

  it.each([
    { problem: 'missing page number', next: { ...pageFixture([operateurHttpFixture('op-3')], 1, 3), currentPage: 2 } },
    { problem: 'duplicate identity', next: pageFixture([operateurHttpFixture('op-1')], 1, 3) },
    { problem: 'changing page size', next: { ...pageFixture([operateurHttpFixture('op-3')], 1, 3), pageSize: 1 } },
    { problem: 'changing total', next: pageFixture([operateurHttpFixture('op-3')], 1, 4) },
    { problem: 'premature empty page', next: pageFixture([], 1, 3) },
    { problem: 'excess data', next: pageFixture([operateurHttpFixture('op-3'), operateurHttpFixture('op-4')], 1, 3) },
  ])('should reject an incomplete acquisition caused by $problem', async ({ next }) => {
    acquisitionFixture.givenPages('/api/operateurs', [
      pageFixture([operateurHttpFixture('op-1'), operateurHttpFixture('op-2')], 0, 3),
      next,
    ]);

    const read = acquisitionFixture.port.read();

    await expect(read).rejects.toThrow('Incomplete supervision acquisition');
    expect(acquisitionFixture.errors.errors).toHaveLength(1);
  });

  it('should stop paging the former company as soon as its session changes', async () => {
    acquisitionFixture.givenPages('/api/operateurs', [
      pageFixture([operateurHttpFixture('op-1'), operateurHttpFixture('op-2')], 0, 3),
      pageFixture([operateurHttpFixture('op-3')], 1, 3),
    ]);
    const gate = acquisitionFixture.hold('/api/operateurs');

    const pending = acquisitionFixture.port.read();
    await gate.arrived.promise;
    acquisitionFixture.session.tenant = 'company-b';
    gate.release.resolve();
    const failure = await pending.catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(Error);
    expect(acquisitionFixture.requestCount('/api/operateurs')).toBe(1);
  });

  it('should reject an acquisition when the connected company changes before it completes', async () => {
    acquisitionFixture.givenPage('/api/operateurs', pageFixture([operateurHttpFixture('company-a-operator')]));
    const gate = acquisitionFixture.hold('/api/operateurs');

    const pending = acquisitionFixture.port.read();
    await gate.arrived.promise;
    acquisitionFixture.session.tenant = 'company-b';
    gate.release.resolve();

    await expect(pending).rejects.toThrow('Supervision company changed');
    expect(acquisitionFixture.errors.errors).toHaveLength(1);
  });

  it('should start an independent acquisition for a newly connected company', async () => {
    acquisitionFixture.givenPage('/api/operateurs', pageFixture([operateurHttpFixture('op-1')]));
    const gate = acquisitionFixture.hold('/api/operateurs');

    const oldRead = acquisitionFixture.port.read().catch((failure: unknown) => failure);
    await gate.arrived.promise;
    acquisitionFixture.session.tenant = 'company-b';
    const currentRead = acquisitionFixture.port.read();
    gate.release.resolve();
    const oldResult = await oldRead;
    const current = await currentRead;

    expect(oldResult).toBeInstanceOf(Error);
    expect(current.operateurs.map(operateur => operateur.id.value)).toEqual(['op-1']);
    expect(acquisitionFixture.requestCount('/api/operateurs')).toBe(2);
  });

  it('should reload names and trades even when operator identities remain unchanged', async () => {
    acquisitionFixture.givenPage('/api/operateurs', pageFixture([operateurHttpFixture('op-1')]));

    const previous = await acquisitionFixture.port.read();
    acquisitionFixture.givenPage(
      '/api/operateurs',
      pageFixture([{ ...operateurHttpFixture('op-1'), nom: 'Martin', natures: ['Fraisage'] }]),
    );
    const current = await acquisitionFixture.port.read();

    expect(previous.operateurs[0]?.nom).toBe('Dupont');
    expect(current.operateurs[0]).toMatchObject({ id: { value: 'op-1' }, nom: 'Martin', metiers: [{ value: 'Fraisage' }] });
    expect(acquisitionFixture.requestCount('/api/operateurs')).toBe(2);
  });

  it('should share an acquisition only while it is in progress', async () => {
    acquisitionFixture.givenPage('/api/operateurs', pageFixture([operateurHttpFixture('op-1')]));

    const donnees = await Promise.all([acquisitionFixture.port.read(), acquisitionFixture.port.read()]);

    expect(donnees.map(donnee => donnee.operateurs[0]?.id.value)).toEqual(['op-1', 'op-1']);
    expect(acquisitionFixture.requestCount('/api/operateurs')).toBe(1);
  });

  it('should acquire every operator across all pages before evaluating presence', async () => {
    acquisitionFixture.givenPage('/api/operateurs', pageFixture([operateurHttpFixture('op-1'), operateurHttpFixture('op-2')], 0, 3));
    acquisitionFixture.givenPage('/api/operateurs', pageFixture([operateurHttpFixture('op-3')], 1, 3));

    const donnees = await acquisitionFixture.port.read();

    expect(donnees.operateurs.map(operateur => operateur.id.value)).toEqual(['op-1', 'op-2', 'op-3']);
  });

  it('should wait for every engaged source before reporting and rejecting a failed acquisition', async () => {
    acquisitionFixture.failSource('/api/atelier/journees');
    const lastSource = acquisitionFixture.hold('/api/postes-de-travail');

    let settled = false;
    const pending = acquisitionFixture.port.read().catch((failure: unknown) => {
      settled = true;
      return failure;
    });
    await lastSource.arrived.promise;
    const beforeLastResponse = { settled, reports: acquisitionFixture.errors.errors.length };
    lastSource.release.resolve();
    const result = await pending;

    expect(beforeLastResponse).toEqual({ settled: false, reports: 0 });
    expect(result).toBeInstanceOf(HttpErrorResponse);
    expect(acquisitionFixture.errors.errors).toHaveLength(1);
  });

  it.each(['/api/operateurs', '/api/atelier/journees', '/api/atelier/suivis', '/api/postes-de-travail'])(
    'should engage all required sources and report a failure once from %s',
    async source => {
      acquisitionFixture.failSource(source);

      const result = await acquisitionFixture.port.read().catch((failure: unknown) => failure);

      expect(result).toBeInstanceOf(HttpErrorResponse);
      expect(acquisitionFixture.requestCount('/api/operateurs')).toBe(1);
      expect(acquisitionFixture.requestCount('/api/atelier/journees')).toBe(1);
      expect(acquisitionFixture.requestCount('/api/atelier/suivis')).toBe(1);
      expect(acquisitionFixture.requestCount('/api/postes-de-travail')).toBe(1);
      expect(acquisitionFixture.errors.errors).toHaveLength(1);
    },
  );

  it('should preserve unresolved activity and conflict operators for the domain refusal', async () => {
    acquisitionFixture.givenPage(
      '/api/atelier/suivis',
      pageFixture([
        {
          ...suiviHttpFixture('suivi-1'),
          activitesEnCours: [
            { ouverture: 'orpheline', categorie: 'TRAVAIL', depuis: '2026-09-30T08:00:00Z', echeance: '2026-09-30T21:00:00Z' },
          ],
          conflits: [{ activites: [], pointages: ['pointage-contradictoire'] }],
        },
      ]),
    );

    const donnees = await acquisitionFixture.port.read();

    expect(donnees.activites).toMatchObject([{ operateurId: undefined }]);
    expect(donnees.conflits).toMatchObject([{ operateurId: undefined }]);
    expect(acquisitionFixture.errors.errors).toEqual([]);
  });

  it('should preserve a workstation whose trade is unavailable', async () => {
    const suivi = suiviHttpFixture('suivi-1');
    acquisitionFixture.givenPage(
      '/api/atelier/suivis',
      pageFixture([
        { ...suivi, activitesEnCours: [{ ...suivi.activitesEnCours[0], poste: { id: 'poste-introuvable', libelle: 'Ancien tour' } }] },
      ]),
    );

    const donnees = await acquisitionFixture.port.read();

    expect(donnees.activites).toMatchObject([{ poste: { libelle: 'Ancien tour', nature: undefined } }]);
  });

  it('should reject a visit whose operator cannot be resolved instead of making someone absent', async () => {
    acquisitionFixture.givenPage('/api/atelier/journees', pageFixture([{ id: 'venue-1', etat: 'PRESENT', journal: [], fenetres: [] }]));

    const pending = acquisitionFixture.port.read();

    await expect(pending).rejects.toThrow('journee.operateur');
    expect(acquisitionFixture.errors.errors).toHaveLength(1);
  });

  it('should acquire every follow-up page including conflicts independent from the ongoing activities', async () => {
    acquisitionFixture.givenPages('/api/atelier/suivis', [
      pageFixture([suiviHttpFixture('suivi-1'), suiviHttpFixture('suivi-2')], 0, 3),
      pageFixture(
        [
          {
            ...suiviHttpFixture('suivi-3'),
            activitesEnCours: [],
            conflits: [{ operateur: operateurHttpFixture('op-1'), activites: [], pointages: ['conflit'] }],
          },
        ],
        1,
        3,
      ),
    ]);

    const donnees = await acquisitionFixture.port.read();

    expect(donnees.activites.map(activite => activite.id.value)).toEqual(['ouverture-suivi-1', 'ouverture-suivi-2']);
    expect(donnees.conflits).toHaveLength(1);
  });

  it('should retain a conflict from a closed follow-up even when its sequence contains no activity', async () => {
    acquisitionFixture.givenPage(
      '/api/atelier/suivis',
      pageFixture([
        {
          ...suiviHttpFixture('suivi-conflit'),
          etat: 'CLOTURE',
          activitesEnCours: [],
          conflits: [{ operateur: operateurHttpFixture('op-1'), activites: [], pointages: ['pointage-contradictoire'] }],
        },
      ]),
    );

    const donnees = await acquisitionFixture.port.read();

    expect(donnees.activites).toEqual([]);
    expect(donnees.conflits).toMatchObject([{ operateurId: { value: 'op-1' } }]);
  });

  it('should resolve a workstation trade beyond the first reference page and preserve the element reference', async () => {
    const suivi = suiviHttpFixture('suivi-1');
    acquisitionFixture.givenPage(
      '/api/atelier/suivis',
      pageFixture([
        {
          ...suivi,
          reference: 'M-1187',
          activitesEnCours: [{ ...suivi.activitesEnCours[0], poste: { id: 'poste-3', libelle: 'Tour 3' } }],
        },
      ]),
    );
    acquisitionFixture.givenPages('/api/postes-de-travail', [
      pageFixture(
        [
          { id: 'poste-1', libelle: 'Tour 1', nature: 'Tournage' },
          { id: 'poste-2', libelle: 'Tour 2', nature: 'Tournage' },
        ],
        0,
        3,
      ),
      pageFixture([{ id: 'poste-3', libelle: 'Tour 3', nature: 'Tournage' }], 1, 3),
    ]);

    const donnees = await acquisitionFixture.port.read();

    expect(donnees.activites).toMatchObject([
      { objet: { reference: { value: 'M-1187' } }, poste: { id: { value: 'poste-3' }, libelle: 'Tour 3', nature: { value: 'Tournage' } } },
    ]);
  });

  it('should translate a current NC activity with its stable identity and preserve an element without reference or workstation', async () => {
    acquisitionFixture.givenPage('/api/atelier/suivis', pageFixture([suiviHttpFixture('suivi-1')]));

    const donnees = await acquisitionFixture.port.read();

    expect(donnees.activites).toMatchObject([
      {
        id: { value: 'ouverture-suivi-1' },
        operateurId: { value: 'op-1' },
        debut: { value: '2026-09-30T08:00:00.000Z' },
        objet: { kind: 'ELEMENT_TRAVAILLE', nom: 'Moule sans référence', reference: undefined },
        poste: undefined,
      },
    ]);
    expect(donnees.activites[0]?.categorie.isNc()).toBe(true);
    expect(acquisitionFixture.query('/api/atelier/suivis')).toEqual({ page: '0', size: '100', etats: 'EN_COURS', inclureConflits: 'true' });
  });

  it('should acquire every open visit before interpreting absences', async () => {
    acquisitionFixture.givenPages('/api/atelier/journees', [
      pageFixture([venueHttpFixture('venue-1', 'op-1'), venueHttpFixture('venue-2', 'op-2')], 0, 3),
      pageFixture([venueHttpFixture('venue-3', 'op-3')], 1, 3),
    ]);

    const donnees = await acquisitionFixture.port.read();

    expect(donnees.journees).toHaveLength(3);
  });

  it('should accept the microsecond and nanosecond precision supplied by the backend', async () => {
    const suivi = suiviHttpFixture('suivi-1');
    acquisitionFixture.givenPage(
      '/api/atelier/journees',
      pageFixture([{ ...venueHttpFixture('venue-1', 'op-1'), fenetres: [{ debut: '2026-09-30T07:00:00.123456Z' }] }]),
    );
    acquisitionFixture.givenPage(
      '/api/atelier/suivis',
      pageFixture([{ ...suivi, activitesEnCours: [{ ...suivi.activitesEnCours[0], depuis: '2026-09-30T08:00:00.987654321Z' }] }]),
    );

    const donnees = await acquisitionFixture.port.read();

    expect(donnees.journees[0]?.openingInstant()?.value).toBe('2026-09-30T07:00:00.123Z');
    expect(donnees.activites[0]?.debut.value).toBe('2026-09-30T08:00:00.987Z');
  });

  it('should retain open visits across midnight without applying a calendar filter', async () => {
    acquisitionFixture.givenPage(
      '/api/atelier/journees',
      pageFixture([
        {
          id: 'venue-1',
          etat: 'PRESENT',
          operateur: operateurHttpFixture('op-1'),
          journal: [],
          fenetres: [{ debut: '2026-09-29T23:00:00Z' }],
        },
      ]),
    );

    const donnees = await acquisitionFixture.port.read();

    expect(donnees.journees.map(journee => journee.openingInstant()?.value)).toEqual(['2026-09-29T23:00:00.000Z']);
    expect(acquisitionFixture.query('/api/atelier/journees')).toEqual({ page: '0', size: '100', etat: 'PRESENT' });
  });

  it('should acquire the declared operators and their current trades', async () => {
    acquisitionFixture.givenPage('/api/operateurs', pageFixture([operateurHttpFixture('op-1')]));

    const donnees = await acquisitionFixture.port.read();

    expect(donnees.operateurs).toMatchObject([{ id: { value: 'op-1' }, nom: 'Dupont', prenom: 'Jean', metiers: [{ value: 'Tournage' }] }]);
  });
});

interface PageFixture {
  readonly content: readonly unknown[];
  readonly currentPage: number;
  readonly pageSize: number;
  readonly totalElementsCount: number;
}

const pageFixture = (content: readonly unknown[], currentPage = 0, totalElementsCount = content.length): PageFixture => ({
  content,
  currentPage,
  pageSize: 2,
  totalElementsCount,
});

const suiviHttpFixture = (id: string) => ({
  id,
  element: `element-${id}`,
  nom: 'Moule sans référence',
  type: 'PRODUIT' as const,
  etat: 'EN_COURS' as const,
  engageLe: '2026-09-29T08:00:00Z',
  engagePar: 'gestionnaire',
  evaluation: '2026-09-30T09:00:00Z',
  conflits: [],
  activitesEnCours: [
    {
      ouverture: `ouverture-${id}`,
      categorie: 'NON_CONFORMITE' as const,
      depuis: '2026-09-30T08:00:00Z',
      echeance: '2026-09-30T21:00:00Z',
      operateur: operateurHttpFixture('op-1'),
    },
  ],
});

const venueHttpFixture = (id: string, operateur: string) => ({
  id,
  etat: 'PRESENT',
  operateur: operateurHttpFixture(operateur),
  journal: [],
  fenetres: [],
});

const operateurHttpFixture = (id: string) => ({ id, nom: 'Dupont', prenom: 'Jean', natures: ['Tournage'], postes: [] });

class SessionSupervisionFixture extends InMemoryAuthentication {
  tenant = 'company-a';
  override currentTenant(): string {
    return this.tenant;
  }
}

class HttpSupervisionFixture implements HttpBackend {
  readonly failures = new Map<string, HttpErrorResponse>();
  readonly session = new SessionSupervisionFixture();
  readonly gates = new Map<string, { arrived: DeferredFixture<void>; release: DeferredFixture<void> }>();
  readonly requests: URL[] = [];
  readonly pages = new Map<string, PageFixture[]>();
  readonly errors = new ErrorHandlerFixture();
  readonly port: DonneesDeSupervisionPort;

  constructor() {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        ApiClient,
        { provide: HttpBackend, useValue: this },
        { provide: AuthenticationPort, useValue: this.session },
        { provide: ErrorHandlerPort, useValue: this.errors },
        { provide: DonneesDeSupervisionPort, useClass: HttpDonneesDeSupervision },
      ],
    });
    this.port = TestBed.inject(DonneesDeSupervisionPort);
  }

  failSource(path: string): void {
    this.failures.set(path, new HttpErrorResponse({ status: 503, statusText: 'Unavailable' }));
  }

  hold(path: string) {
    const gate = { arrived: new DeferredFixture<void>(), release: new DeferredFixture<void>() };
    this.gates.set(path, gate);
    return gate;
  }

  query(path: string): Record<string, string> {
    return Object.fromEntries(this.requests.find(request => request.pathname === path)?.searchParams ?? []);
  }

  requestCount(path: string): number {
    return this.requests.filter(request => request.pathname === path).length;
  }

  givenPage(path: string, page: PageFixture): void {
    const pages = this.pages.get(path) ?? [];
    pages[page.currentPage] = page;
    this.pages.set(path, pages);
  }

  givenPages(path: string, pages: PageFixture[]): void {
    this.pages.set(path, pages);
  }

  handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    return defer(() => this.answer(request)).pipe(
      switchMap(answer => (answer instanceof HttpErrorResponse ? throwError(() => answer) : of(answer))),
    );
  }

  private async answer(request: HttpRequest<unknown>): Promise<HttpResponse<unknown> | HttpErrorResponse> {
    const url = new URL(request.urlWithParams, 'http://localhost');
    this.requests.push(url);
    await new Promise(resolve => setTimeout(resolve));
    const gate = this.gates.get(url.pathname);
    gate?.arrived.resolve();
    await gate?.release.promise;
    const failure = this.failures.get(url.pathname);
    if (failure !== undefined) {
      return failure;
    }
    const index = Number(url.searchParams.get('page') ?? 0);
    return new HttpResponse({ body: this.pages.get(url.pathname)?.[index] ?? pageFixture([], index) });
  }
}
