import { GesteLocal, PUPITRE_VIDE, PupitreLocal, ReferentielDuPupitre } from '@/app/atelier/domain/PupitreLocal';
import { RefusDuPupitre } from '@/app/atelier/domain/RefusDuPupitre';
import { ServeurDuPupitrePort } from '@/app/atelier/domain/ServeurDuPupitrePort';
import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { StockageLocalPort } from '@/app/shared/stockage-local/domain/StockageLocalPort';
import { TestBed } from '@angular/core/testing';
import { PupitreHorsLigne } from './PupitreHorsLigne';

const roundTrip = (): Promise<void> => new Promise(resolve => setTimeout(resolve));
const referenceFixture: ReferentielDuPupitre = {
  operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049', postes: [{ id: 'tour', libelle: 'Tour' }] }],
  suivis: [{ id: 'piece', nom: 'OF-1', type: 'PRODUIT', etat: 'EN_ATTENTE', activites: [], evenements: [] }],
};
const arriveeFixture: GesteLocal = { nature: 'ARRIVEE', id: 'arrivee', dateDeSurvenue: '2026-09-05T08:00:00Z', operateurId: 'jean' };
const refusalFixture = (code: string): RefusDuPupitre => new RefusDuPupitre(`urn:glm:erreur:atelier:${code}`, 'cause conservee');

class AuthenticationFixture extends AuthenticationPort {
  tenant: string | undefined = 'entreprise-a';
  token: string | undefined;
  override async authenticate(): Promise<void> {
    await roundTrip();
  }
  override currentToken(): string | undefined {
    return this.token;
  }
  override currentTenant(): string | undefined {
    return this.tenant;
  }
  override logout(): void {
    this.token = undefined;
  }
}

class StockageFixture extends StockageLocalPort {
  readonly documents = new Map<string, PupitreLocal>();
  failWrite = false;
  afterRead: (() => void) | undefined;
  private readonly tails = new Map<string, Promise<void>>();

  override async read<T>(cle: string): Promise<T | undefined> {
    await roundTrip();
    const value = structuredClone(this.documents.get(cle)) as T | undefined;
    this.afterRead?.();
    this.afterRead = undefined;
    return value;
  }
  override async update<T>(cle: string, initial: T, change: (value: T) => T): Promise<T> {
    await roundTrip();
    if (this.failWrite) {
      this.failWrite = false;
      throw new Error('disque plein');
    }
    const updated = change((structuredClone(this.documents.get(cle)) as T | undefined) ?? initial);
    this.documents.set(cle, structuredClone(updated) as PupitreLocal);
    return updated;
  }
  override async lock<T>(cle: string, action: () => Promise<T>): Promise<T> {
    const locked = (this.tails.get(cle) ?? Promise.resolve()).then(action);
    this.tails.set(
      cle,
      locked.then(
        () => undefined,
        () => undefined,
      ),
    );
    return locked;
  }
}

class ServeurFixture extends ServeurDuPupitrePort {
  reference = structuredClone(referenceFixture);
  failures: (Error | undefined)[] = [];
  cacheFailure: Error | undefined;
  readonly journal: GesteLocal[] = [];
  readonly chronology: string[] = [];
  beforeSend: (() => void) | undefined;
  afterReread: (() => void) | undefined;
  afterReference: (() => void) | undefined;

  override async referentiel(): Promise<ReferentielDuPupitre> {
    await roundTrip();
    this.afterReference?.();
    if (this.cacheFailure !== undefined) {
      throw this.cacheFailure;
    }
    return this.reference;
  }
  override async send(geste: GesteLocal): Promise<void> {
    await roundTrip();
    this.chronology.push(geste.id);
    this.beforeSend?.();
    this.beforeSend = undefined;
    const failure = this.failures.shift();
    if (failure !== undefined) {
      throw failure;
    }
    this.journal.push(structuredClone(geste));
  }
  override async reread(): Promise<void> {
    await roundTrip();
    this.chronology.push('relecture');
    this.afterReread?.();
  }
}

describe('PupitreHorsLigne', () => {
  let pupitre: PupitreHorsLigne;
  let stockage: StockageFixture;
  let serveur: ServeurFixture;
  let authentication: AuthenticationFixture;

  beforeEach(() => {
    stockage = new StockageFixture();
    serveur = new ServeurFixture();
    authentication = new AuthenticationFixture();
    stockage.documents.set('atelier:entreprise-a', { ...PUPITRE_VIDE, referentiel: structuredClone(referenceFixture) });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [
        PupitreHorsLigne,
        { provide: StockageLocalPort, useValue: stockage },
        { provide: ServeurDuPupitrePort, useValue: serveur },
        { provide: AuthenticationPort, useValue: authentication },
      ],
    });
    pupitre = TestBed.inject(PupitreHorsLigne);
  });

  afterEach(async () => {
    await pupitre.synchronize();
    vi.restoreAllMocks();
  });

  it('should resolve an operator locally after a restart without a network', async () => {
    await whenOpening();
    await whenStarting();
    await pupitre.closeWindow();
    await pupitre.restore();

    thenActivityIs('TRAVAIL');
    thenQueueHas(3);
  });

  it('should commit arrival and implicit resumption before the first activity, only once per window', async () => {
    await whenOpening();

    await Promise.all([whenStarting(), pupitre.recordPointage({ suiviId: 'piece', type: 'NON_CONFORMITE', posteId: 'tour' })]);
    await pupitre.recordPresence('PAUSE');

    thenNatureOrderIs(['ARRIVEE', 'PRESENCE', 'POINTAGE', 'POINTAGE', 'PRESENCE']);
    thenActivityIs('NON_CONFORMITE');
    thenQueueHasUniqueStableIdentities();
  });

  it('should reject a gesture explicitly if local commit fails and accept the next retry durably', async () => {
    await whenOpening();
    stockage.failWrite = true;

    await thenFails(whenStarting(), 'disque plein');
    thenQueueHas(0);
    thenNoActivity();
    await whenStarting();

    thenQueueHas(3);
  });

  it('should retain the failed push and replay exactly the same identifiers and dates on reconnection', async () => {
    await givenPendingArrival();
    serveur.failures = [new Error('reseau absent')];
    authentication.token = 'autorise';

    await pupitre.synchronize();
    thenConnectedIs(false);
    thenPendingIs(1);
    await pupitre.synchronize();

    thenConnectedIs(true);
    thenJournalIs([arriveeFixture]);
  });

  it('should replay a server acceptance whose local acknowledgement was interrupted', async () => {
    await givenPendingArrival();
    authentication.token = 'autorise';
    serveur.beforeSend = () => {
      stockage.failWrite = true;
    };

    await thenFails(pupitre.synchronize(), 'disque plein');
    thenPendingIs(1);
    await pupitre.synchronize();

    thenJournalIs([arriveeFixture, arriveeFixture]);
    thenPendingIs(0);
  });

  it('should preserve a final refusal with its cause and continue subsequent gestures for the same operator', async () => {
    await whenOpening();
    await whenStarting();
    authentication.token = 'autorise';
    serveur.failures = [undefined, undefined, refusalFixture('suivi-d-atelier-cloture')];

    await pupitre.synchronize();
    thenActivityIs('TRAVAIL');
    await pupitre.recordPresence('DEPART');
    await pupitre.synchronize();
    await pupitre.closeWindow();

    thenNoActivity();
    thenPendingIs(0);
    await thenRefusalIs('suivi-d-atelier-cloture');
  });

  it('should absorb only an existing arrival and an implicitly resumed presence', async () => {
    await whenOpening();
    await whenStarting();
    await pupitre.recordPresence('REPRISE');
    authentication.token = 'autorise';
    serveur.failures = [
      refusalFixture('journee-de-travail-deja-ouverte'),
      refusalFixture('transition-de-presence-interdite'),
      undefined,
      refusalFixture('transition-de-presence-interdite'),
    ];

    await pupitre.synchronize();

    thenPendingIs(0);
    await thenRefusalIs('transition-de-presence-interdite');
  });

  it('should reread before retrying a concurrent gesture with its original body', async () => {
    await givenPendingArrival();
    authentication.token = 'autorise';
    serveur.failures = [refusalFixture('saisie-concurrente')];

    await pupitre.synchronize();

    thenChronologyIs(['arrivee', 'relecture', 'arrivee']);
    thenJournalIs([arriveeFixture]);
  });

  it('should preserve a repeated race as a final diagnostic after rereading and retrying', async () => {
    await givenPendingArrival();
    authentication.token = 'autorise';
    serveur.failures = [refusalFixture('saisie-concurrente'), refusalFixture('saisie-concurrente')];

    await pupitre.synchronize();

    thenPendingIs(0);
    thenConnectedIs(true);
    await thenRefusalIs('saisie-concurrente');
  });

  it('should apply the contextual allowlist to the response after a reread as well', async () => {
    await givenPendingArrival();
    authentication.token = 'autorise';
    serveur.failures = [refusalFixture('saisie-concurrente'), refusalFixture('journee-de-travail-deja-ouverte')];

    await pupitre.synchronize();

    thenPendingIs(0);
  });

  it('should never activate a refreshed referential under the operator’s fingers', async () => {
    await whenOpening();
    serveur.reference.operateurs[0].matricule = '050';
    authentication.token = 'autorise';

    await pupitre.synchronize();
    thenMatriculeIs('049');
    await pupitre.closeWindow();

    thenMatriculeIs('050');
  });

  it('should retain the last complete cache through failed refreshes without a time limit', async () => {
    serveur.cacheFailure = new Error('page manquante');
    authentication.token = 'autorise';

    await pupitre.synchronize();

    thenMatriculeIs('049');
    thenConnectedIs(true);
  });

  it('should suspend the old company queue and reject an active window after reenrolment', async () => {
    await whenOpening();
    await whenStarting();
    authentication.tenant = 'entreprise-b';
    authentication.token = 'nouveau';

    await thenFails(whenStarting(), 'fenetre operateur a change');
    await pupitre.synchronize();

    thenOldCompanyPendingIs(3);
    thenJournalIs([]);
    await thenFails(pupitre.openWindow('inconnu'), 'Matricule absent');
  });

  it('should discard a cache response received after the company changed', async () => {
    authentication.token = 'autorise';
    serveur.afterReference = () => {
      authentication.tenant = 'entreprise-b';
    };

    await pupitre.synchronize();

    thenNoCompanyBData();
  });

  it('should stop a replay when authorization changes during the reread', async () => {
    await givenPendingArrival();
    authentication.token = 'autorise';
    serveur.failures = [refusalFixture('saisie-concurrente')];
    serveur.afterReread = () => {
      authentication.tenant = 'entreprise-b';
    };

    await pupitre.synchronize();

    thenJournalIs([]);
    thenOldCompanyPendingIs(1);
  });

  it('should finish acknowledging the old company response without sending its next event under another token', async () => {
    await givenPendingArrival();
    authentication.token = 'autorise';
    serveur.beforeSend = () => {
      authentication.tenant = 'entreprise-b';
    };

    await pupitre.synchronize();

    thenOldCompanyPendingIs(0);
  });

  it('should preserve gestures appended while a push is in flight', async () => {
    await whenOpening();
    await whenStarting();
    authentication.token = 'autorise';
    serveur.beforeSend = () => {
      void pupitre.recordPresence('PAUSE');
    };

    await Promise.all([pupitre.synchronize(), pupitre.synchronize()]);
    await pupitre.closeWindow();

    thenQueueHas(4);
    thenPendingIs(0);
  });

  it('should reject unknown codes, overlapping windows and unauthorized workstations', async () => {
    await thenFails(pupitre.openWindow('inconnu'), 'Matricule absent');
    await whenOpening();

    await thenFails(pupitre.openWindow('049'), 'deja ouverte');
    await thenFails(pupitre.recordPointage({ suiviId: 'piece', type: 'DEBUT', posteId: 'interdit' }), 'habilitations');

    thenQueueHas(0);
  });

  it('should require an initial enrolment and an operator window', async () => {
    authentication.tenant = undefined;

    await pupitre.restore();
    await thenFails(pupitre.openWindow('049'), 'enrole');

    thenNoReference();
    thenGestureNeedsAWindow();
  });

  it('should reject a window when the company changes while restoring it', async () => {
    stockage.afterRead = () => {
      authentication.tenant = 'entreprise-b';
    };

    await thenFails(pupitre.openWindow('049'), 'entreprise du pupitre a change');
  });

  it('should expose an empty diagnostic before any gesture or reference exists', async () => {
    stockage.documents.clear();

    await pupitre.restore();

    thenNoReference();
    await thenFails(pupitre.openWindow('049'), 'Matricule absent');
    await thenDiagnosticsCountIs(0);
  });

  it('should contain a background synchronization failure after the gesture was durably accepted', async () => {
    await whenOpening();
    authentication.token = 'autorise';
    serveur.beforeSend = () => {
      stockage.failWrite = true;
    };

    await whenStarting();
    await roundTrip();
    await roundTrip();
    await roundTrip();
    await roundTrip();
    await roundTrip();

    thenQueueHas(3);
  });

  it('should push a gesture accepted while the reference is being refreshed without waiting for the next minute', async () => {
    await whenOpening();
    authentication.token = 'autorise';
    serveur.afterReference = () => {
      serveur.afterReference = undefined;
      void pupitre.recordPresence('PAUSE');
    };

    await pupitre.synchronize();
    await pupitre.closeWindow();

    thenQueueHas(1);
    thenPendingIs(0);
  });

  const whenOpening = (): Promise<unknown> => pupitre.openWindow('049');
  const whenStarting = (): Promise<void> => pupitre.recordPointage({ suiviId: 'piece', type: 'DEBUT' });
  const givenPendingArrival = async (): Promise<void> => {
    await stockage.update<PupitreLocal>('atelier:entreprise-a', PUPITRE_VIDE, current => ({
      ...current,
      evenements: [{ geste: arriveeFixture, etat: 'EN_ATTENTE' }],
    }));
  };
  const thenQueueHas = (count: number): void => {
    expect(stockage.documents.get('atelier:entreprise-a')?.evenements).toHaveLength(count);
  };
  const thenPendingIs = (count: number): void => thenOldCompanyPendingIs(count);
  const thenOldCompanyPendingIs = (count: number): void => {
    expect(stockage.documents.get('atelier:entreprise-a')?.evenements.filter(event => event.etat === 'EN_ATTENTE')).toHaveLength(count);
  };
  const thenActivityIs = (categorie: string): void => {
    expect(pupitre.referentiel()?.suivis[0].activites[0].categorie).toBe(categorie);
  };
  const thenNoActivity = (): void => {
    expect(pupitre.referentiel()?.suivis[0].activites).toHaveLength(0);
  };
  const thenNatureOrderIs = (natures: string[]): void => {
    expect(stockage.documents.get('atelier:entreprise-a')?.evenements.map(event => event.geste.nature)).toEqual(natures);
  };
  const thenQueueHasUniqueStableIdentities = (): void => {
    const gestes = stockage.documents.get('atelier:entreprise-a')?.evenements.map(event => event.geste) ?? [];
    expect(new Set(gestes.map(geste => geste.id)).size).toBe(gestes.length);
    expect(gestes[0].dateDeSurvenue).toBe(gestes[2].dateDeSurvenue);
    expect(gestes[1].dateDeSurvenue).toBe(gestes[2].dateDeSurvenue);
  };
  const thenFails = async (operation: Promise<unknown>, message: string): Promise<void> => {
    await expect(operation).rejects.toThrow(message);
  };
  const thenConnectedIs = (connected: boolean): void => {
    expect(pupitre.connected()).toBe(connected);
  };
  const thenJournalIs = (gestes: GesteLocal[]): void => {
    expect(serveur.journal).toEqual(gestes);
  };
  const thenChronologyIs = (events: string[]): void => {
    expect(serveur.chronology).toEqual(events);
  };
  const thenRefusalIs = async (code: string): Promise<void> => {
    const diagnostics = await pupitre.diagnostics();
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].refus).toEqual({ code: `urn:glm:erreur:atelier:${code}`, message: 'cause conservee' });
  };
  const thenDiagnosticsCountIs = async (count: number): Promise<void> => {
    expect(await pupitre.diagnostics()).toHaveLength(count);
  };
  const thenMatriculeIs = (code: string): void => {
    expect(pupitre.referentiel()?.operateurs[0].matricule).toBe(code);
  };
  const thenNoCompanyBData = (): void => {
    expect(stockage.documents.has('atelier:entreprise-b')).toBe(false);
  };
  const thenNoReference = (): void => {
    expect(pupitre.referentiel()).toBeUndefined();
  };
  const thenGestureNeedsAWindow = (): void => {
    expect(() => pupitre.recordPresence('PAUSE')).toThrow('Aucune fenetre');
  };
});
