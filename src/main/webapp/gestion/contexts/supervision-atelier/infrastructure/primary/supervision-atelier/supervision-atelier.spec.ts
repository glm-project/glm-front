import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { DeferredFixture } from '@test/unit/fixtures/DeferredFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActiviteDeSupervision } from '../../../domain/activite/ActiviteDeSupervision';
import { CategorieActivite, ValeurCategorieActivite } from '../../../domain/activite/CategorieActivite';
import { ElementTravaille } from '../../../domain/activite/ElementTravaille';
import { HorsOf } from '../../../domain/activite/HorsOf';
import { IdentifiantActivite } from '../../../domain/activite/IdentifiantActivite';
import { ObjetDeLActivite } from '../../../domain/activite/ObjetDeLActivite';
import { ReferenceDElement } from '../../../domain/activite/ReferenceDElement';
import { Instant } from '../../../domain/instant/Instant';
import { IdentifiantOperateur } from '../../../domain/operateur/IdentifiantOperateur';
import { OperateurDeclare } from '../../../domain/operateur/OperateurDeclare';
import { IdentifiantPoste } from '../../../domain/poste/IdentifiantPoste';
import { NatureDeTravail } from '../../../domain/poste/NatureDeTravail';
import { PosteDeSupervision } from '../../../domain/poste/PosteDeSupervision';
import { FenetreDePresence } from '../../../domain/presence/FenetreDePresence';
import { JourneeDeTravail } from '../../../domain/presence/JourneeDeTravail';
import { DonneesDeSupervision, DonneesDeSupervisionPort } from '../../../domain/supervision/DonneesDeSupervisionPort';
import { SupervisionAtelier } from './supervision-atelier';

class DonneesDeSupervisionFixture extends DonneesDeSupervisionPort {
  reads = 0;
  arrival = new DeferredFixture<void>();
  response = new DeferredFixture<DonneesDeSupervision>();

  read(): Promise<DonneesDeSupervision> {
    this.reads += 1;
    this.arrival.resolve();
    return this.response.promise;
  }

  prepare(): void {
    this.arrival = new DeferredFixture<void>();
    this.response = new DeferredFixture<DonneesDeSupervision>();
  }
}

const operateurFixture = (id: string, nom: string, prenom: string, metiers: readonly string[] = []): OperateurDeclare =>
  new OperateurDeclare({ id: new IdentifiantOperateur(id), nom, prenom, metiers: metiers.map(metier => new NatureDeTravail(metier)) });

const posteFixture = (libelle: string, nature: string): PosteDeSupervision =>
  new PosteDeSupervision({ id: new IdentifiantPoste(`poste-${libelle}`), libelle, nature: new NatureDeTravail(nature) });

/** L'écran affiche les instants dans le fuseau du navigateur : partir d'une heure locale garde les attentes vraies partout. */
const instantFixture = (heure: number, minute = 0, jour = 13): Instant => new Instant(new Date(2026, 8, jour, heure, minute).toISOString());
const veilleFixture = (heure: number, minute = 0): Instant => instantFixture(heure, minute, 12);

const mouleFixture = (reference: string, nom = 'PRD-2026-000001'): ElementTravaille =>
  new ElementTravaille({ type: 'PRODUIT', nom, reference: new ReferenceDElement(reference) });
const ofFixture = (reference: string, nom = 'OF-2026-000042'): ElementTravaille =>
  new ElementTravaille({ type: 'ORDRE_DE_FABRICATION', nom, reference: new ReferenceDElement(reference) });
const ofSansReferenceFixture = (nom: string): ElementTravaille => new ElementTravaille({ type: 'ORDRE_DE_FABRICATION', nom });

interface ActiviteFixture {
  readonly id: string;
  readonly objet: ObjetDeLActivite;
  readonly debut: Instant;
  readonly poste?: PosteDeSupervision;
  readonly categorie?: ValeurCategorieActivite;
}

const activiteFixture = (
  operateur: OperateurDeclare,
  { id, objet, debut, poste, categorie = 'TRAVAIL' }: ActiviteFixture,
): ActiviteDeSupervision =>
  new ActiviteDeSupervision({
    id: new IdentifiantActivite(id),
    operateurId: operateur.id,
    objet,
    categorie: new CategorieActivite(categorie),
    debut,
    ...(poste === undefined ? {} : { poste }),
  });

const aliceFixture = operateurFixture('alice', 'Martin', 'Alice');
const bobFixture = operateurFixture('bob', 'Durand', 'Bob');
const chloeFixture = operateurFixture('chloe', 'Bernard', 'Chloé');
const donneesFixture: DonneesDeSupervision = {
  operateurs: [aliceFixture, bobFixture, chloeFixture],
  journees: [JourneeDeTravail.open(aliceFixture.id, 'PRESENT'), JourneeDeTravail.open(bobFixture.id, 'EN_PAUSE')],
  activites: [],
};

const aubertFixture = operateurFixture('op-aubert', 'Aubert', 'Lucas');
const dumasFixture = operateurFixture('op-dumas', 'Dumas', 'Julien');
const fabreFixture = operateurFixture('op-fabre', 'Fabre', 'Lucie', ['Fraisage']);
const lefevreFixture = operateurFixture('op-lefevre', 'Lefèvre', 'Sophie', ['Dessin']);
const marchandFixture = operateurFixture('op-marchand', 'Marchand', 'Kevin');
const perrinFixture = operateurFixture('op-perrin', 'Perrin', 'Loïc');
const rouxFixture = operateurFixture('op-roux', 'Roux', 'Nathalie', ['Soudage', 'Tournage']);
const schmittFixture = operateurFixture('op-schmitt', 'Schmitt', 'Yanis');
const vidalFixture = operateurFixture('op-vidal', 'Vidal', 'Hugo');

const atelierFixture: DonneesDeSupervision = {
  operateurs: [
    vidalFixture,
    schmittFixture,
    rouxFixture,
    perrinFixture,
    marchandFixture,
    lefevreFixture,
    fabreFixture,
    dumasFixture,
    aubertFixture,
  ],
  journees: [
    JourneeDeTravail.open(aubertFixture.id, 'PRESENT', [new FenetreDePresence(instantFixture(6, 58))]),
    JourneeDeTravail.open(dumasFixture.id, 'EN_PAUSE', [new FenetreDePresence(instantFixture(6, 45), instantFixture(9, 0))]),
    JourneeDeTravail.open(lefevreFixture.id, 'PRESENT', [new FenetreDePresence(instantFixture(8, 55))]),
    JourneeDeTravail.open(marchandFixture.id, 'PRESENT', [new FenetreDePresence(veilleFixture(6, 4))]),
    JourneeDeTravail.closed(perrinFixture.id, [new FenetreDePresence(instantFixture(6, 30), instantFixture(9, 20))]),
    JourneeDeTravail.open(rouxFixture.id, 'EN_PAUSE', [new FenetreDePresence(instantFixture(6, 40), instantFixture(9, 45))]),
    JourneeDeTravail.open(schmittFixture.id, 'EN_PAUSE'),
    JourneeDeTravail.open(vidalFixture.id, 'PRESENT', [new FenetreDePresence(instantFixture(9, 48))]),
  ],
  activites: [
    activiteFixture(aubertFixture, {
      id: 'act-aubert-3004',
      objet: ofFixture('3004'),
      poste: posteFixture('Tour 1', 'Tournage'),
      categorie: 'NON_CONFORMITE',
      debut: instantFixture(9, 40),
    }),
    activiteFixture(aubertFixture, {
      id: 'act-aubert-1015',
      objet: mouleFixture('1015'),
      poste: posteFixture('Fraiseuse 1', 'Fraisage'),
      debut: instantFixture(7, 5),
    }),
    activiteFixture(dumasFixture, {
      id: 'act-dumas',
      objet: ofFixture('3002', 'OF-2026-000040'),
      poste: posteFixture('Scie 1', 'Sciage'),
      debut: instantFixture(7, 10),
    }),
    activiteFixture(marchandFixture, {
      id: 'act-marchand',
      objet: ofFixture('3001', 'OF-2026-000039'),
      poste: posteFixture('Fraiseuse 2', 'Fraisage'),
      debut: veilleFixture(14, 20),
    }),
    activiteFixture(perrinFixture, {
      id: 'act-perrin',
      objet: ofFixture('3006', 'OF-2026-000044'),
      poste: posteFixture('Tour 1', 'Tournage'),
      categorie: 'NON_CONFORMITE',
      debut: instantFixture(7, 0),
    }),
    activiteFixture(vidalFixture, { id: 'act-vidal', objet: ofSansReferenceFixture('OF-2026-000048'), debut: instantFixture(9, 52) }),
  ],
};

const absentsActifsFixture = (nombre: number): DonneesDeSupervision => {
  const operateurs = Array.from({ length: nombre }, (_, index) => operateurFixture(`op-${index}`, `Absent ${index}`, 'Actif'));
  return {
    operateurs,
    journees: [],
    activites: operateurs.map(operateur =>
      activiteFixture(operateur, { id: `act-${operateur.id.value}`, objet: ofFixture('3001', 'OF-2026-000039'), debut: instantFixture(7) }),
    ),
  };
};

const nonConformitesFixture = ({
  auTravail,
  enPause,
}: {
  readonly auTravail: readonly OperateurDeclare[];
  readonly enPause: readonly OperateurDeclare[];
}): DonneesDeSupervision => ({
  operateurs: [...auTravail, ...enPause],
  journees: [
    ...auTravail.map(operateur => JourneeDeTravail.open(operateur.id, 'PRESENT', [new FenetreDePresence(instantFixture(7))])),
    ...enPause.map(operateur =>
      JourneeDeTravail.open(operateur.id, 'EN_PAUSE', [new FenetreDePresence(instantFixture(7), instantFixture(9))]),
    ),
  ],
  activites: [...auTravail, ...enPause].map(operateur =>
    activiteFixture(operateur, {
      id: `act-${operateur.id.value}`,
      objet: mouleFixture('1015'),
      categorie: 'NON_CONFORMITE',
      debut: instantFixture(8),
    }),
  ),
});

const nonConformitesSuspenduesFixture = (operateurs: readonly OperateurDeclare[]): DonneesDeSupervision => ({
  operateurs,
  journees: operateurs.map(operateur =>
    JourneeDeTravail.open(operateur.id, 'EN_PAUSE', [new FenetreDePresence(instantFixture(7), instantFixture(9))]),
  ),
  activites: operateurs.map(operateur =>
    activiteFixture(operateur, {
      id: `act-${operateur.id.value}`,
      objet: mouleFixture('1015'),
      categorie: 'NON_CONFORMITE',
      debut: instantFixture(8),
    }),
  ),
});

interface ActiviteAffichee {
  readonly element: string | undefined;
  readonly poste: string | undefined;
  readonly debut: string | undefined;
  readonly nc: string | undefined;
  readonly suspendue: string | undefined;
}

describe('Supervision atelier component', () => {
  let componentFixture: ComponentFixture<SupervisionAtelier>;
  let sourceFixture: DonneesDeSupervisionFixture;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date(2026, 8, 13, 10, 0));
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    sourceFixture = new DonneesDeSupervisionFixture();
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: DonneesDeSupervisionPort, useValue: sourceFixture },
      ],
    });
    componentFixture = TestBed.createComponent(SupervisionAtelier);
  });

  afterEach(async () => {
    sourceFixture.response.resolve({ operateurs: [], journees: [], activites: [] });
    await componentFixture.whenStable();
    componentFixture.destroy();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should keep the lanes displayed while reloading at thirty seconds, and leave them unchanged before then', async () => {
    await givenDonneesDisplayed();

    sourceFixture.prepare();
    await whenTimePasses(29_999);
    const beforeDeadline = { cards: displayedOperatorCount(), reading: isReadingAgain() };
    await whenTimePasses(1);
    const atDeadline = { cards: displayedOperatorCount(), reading: isReadingAgain() };
    await whenDonneesArrive({ operateurs: [], journees: [], activites: [] });

    expect(beforeDeadline).toEqual({ cards: 3, reading: false });
    expect(atDeadline).toEqual({ cards: 3, reading: true });
    thenEmptyStateIsDisplayed();
  });

  it('should suspend hidden polling and restart immediately with a new thirty-second cadence', async () => {
    await givenDonneesDisplayed();

    await whenTimePasses(10_000);
    whenVisibilityChanges('hidden');
    sourceFixture.prepare();
    await whenTimePasses(60_000);
    const whileHidden = displayedOperatorCount();
    whenVisibilityChanges('visible');
    await whenSupervisionOpened();
    const onReturn = isReadingAgain();
    await whenDonneesArrive();
    sourceFixture.prepare();
    await whenTimePasses(29_999);
    const beforeNextDeadline = displayedOperatorCount();
    await whenTimePasses(1);
    const atNextDeadline = isReadingAgain();
    await whenDonneesArrive({ operateurs: [], journees: [], activites: [] });

    expect(whileHidden).toBe(3);
    expect(onReturn).toBe(true);
    expect(beforeNextDeadline).toBe(3);
    expect(atNextDeadline).toBe(true);
    thenEmptyStateIsDisplayed();
  });

  it('should finish a slow read before reading again on visibility return without displaying its obsolete result', async () => {
    await givenDonneesDisplayed();
    await refresh();
    const obsoleteResponse = sourceFixture.response;

    whenVisibilityChanges('hidden');
    whenVisibilityChanges('visible');
    await whenTimePasses(60_000);
    const readsBeforeRelease = sourceFixture.reads;
    sourceFixture.prepare();
    obsoleteResponse.resolve({ operateurs: [], journees: [], activites: [] });
    await whenSupervisionOpened();
    const obsoleteResultWasWithheld = { cards: displayedOperatorCount(), reading: isReadingAgain() };
    const readsAfterRelease = sourceFixture.reads;
    await whenDonneesArrive();

    expect(readsBeforeRelease).toBe(2);
    expect(readsAfterRelease).toBe(3);
    expect(obsoleteResultWasWithheld).toEqual({ cards: 3, reading: true });
    expect(displayedOperatorCount()).toBe(3);
  });

  it('should perform the visibility return read even when the pending acquisition fails', async () => {
    await givenAcquisitionInProgress();
    const obsoleteResponse = sourceFixture.response;

    whenVisibilityChanges('hidden');
    whenVisibilityChanges('visible');
    sourceFixture.prepare();
    obsoleteResponse.reject(new Error('Old acquisition failed'));
    await whenSupervisionOpened();
    const readsAfterFailure = sourceFixture.reads;
    await whenDonneesArrive();

    expect(readsAfterFailure).toBe(2);
    expect(displayedOperatorCount()).toBe(3);
  });

  it('should discard a pending visibility refresh when unmounted and protect a newly mounted view', async () => {
    await givenDonneesDisplayed();
    await refresh();
    const obsoleteResponse = sourceFixture.response;
    whenVisibilityChanges('hidden');
    whenVisibilityChanges('visible');

    whenSupervisionClosed();
    sourceFixture.prepare();
    whenSupervisionRemounted();
    await whenSupervisionOpened();
    await whenDonneesArrive();
    obsoleteResponse.resolve({ operateurs: [], journees: [], activites: [] });
    await obsoleteResponse.promise;
    await whenViewSettles();

    expect(sourceFixture.reads).toBe(3);
    expect(displayedOperatorCount()).toBe(3);
  });

  it('should cancel a deferred visibility read when the tab is hidden again before completion', async () => {
    await givenAcquisitionInProgress();

    whenVisibilityChanges('hidden');
    whenVisibilityChanges('visible');
    whenVisibilityChanges('hidden');
    await whenDonneesArrive();
    await whenTimePasses(60_000);

    expect(sourceFixture.reads).toBe(1);
    expect(displayedOperatorCount()).toBe(3);
  });

  it('should skip elapsed polling deadlines and disabled manual refresh during a slow read without queuing retries', async () => {
    await givenDonneesDisplayed();
    await refresh();

    await whenTimePasses(90_000);
    whenRefreshClicked();
    const readsWhilePending = sourceFixture.reads;
    const manualRefreshDisabled = isRefreshDisabled();
    await whenDonneesArrive({ operateurs: [], journees: [], activites: [] });

    expect(readsWhilePending).toBe(2);
    expect(sourceFixture.reads).toBe(2);
    expect(manualRefreshDisabled).toBe(true);
    thenEmptyStateIsDisplayed();
  });

  it('should replace an automatic refresh failure with fresh data at the next deadline', async () => {
    await givenDonneesDisplayed();
    sourceFixture.prepare();
    await whenTimePasses(30_000);
    await whenAcquisitionFails();
    const failure = { cards: displayedOperatorCount(), error: isErrorDisplayed() };

    sourceFixture.prepare();
    await whenTimePasses(30_000);
    await whenDonneesArrive();

    expect(failure).toEqual({ cards: 0, error: true });
    expect(displayedOperatorCount()).toBe(3);
    expect(isErrorDisplayed()).toBe(false);
  });

  it('should reevaluate the same acquired data at each read while keeping absolute times fixed between reads', async () => {
    await givenAcquisitionInProgress();
    const donneesAtThreshold = {
      ...donneesFixture,
      journees: [
        JourneeDeTravail.open(aliceFixture.id, 'PRESENT', [new FenetreDePresence(new Instant(new Date(2026, 8, 12, 18, 0).toISOString()))]),
      ],
      activites: [activiteFixture(aliceFixture, { id: 'act-1', objet: mouleFixture('1015'), debut: instantFixture(8, 12) })],
    };
    await whenDonneesArrive(donneesAtThreshold);

    await whenTimePasses(29_999);
    const beforeRead = displayedAnomalies();
    sourceFixture.prepare();
    await whenTimePasses(1);
    await whenDonneesArrive(donneesAtThreshold);

    expect(beforeRead).toEqual([]);
    expect(displayedAnomalies()).toEqual(['Aucun départ pointé depuis plus de 16 h']);
    expect(displayedActivityStart()).toBe('depuis 08:12');
  });

  it('should leave no polling timer after unmount and restart one cadence on remount', async () => {
    await givenDonneesDisplayed();

    whenSupervisionClosed();
    const timersAfterClosing = pollingTimerCount();
    whenVisibilityChanges('hidden');
    whenVisibilityChanges('visible');
    await whenTimePasses(60_000);
    const readsAfterClosing = sourceFixture.reads;
    sourceFixture.prepare();
    whenSupervisionRemounted();
    await whenSupervisionOpened();
    await whenDonneesArrive();
    sourceFixture.prepare();
    await whenTimePasses(30_000);
    await whenDonneesArrive({ operateurs: [], journees: [], activites: [] });

    expect(timersAfterClosing).toBe(0);
    expect(readsAfterClosing).toBe(1);
    expect(sourceFixture.reads).toBe(3);
    expect(pollingTimerCount()).toBe(1);
    thenEmptyStateIsDisplayed();
  });

  it('should keep polling suspended when mounted in an already hidden tab', async () => {
    whenSupervisionClosed();
    whenVisibilityChanges('hidden');
    whenSupervisionRemounted();
    await givenDonneesDisplayed();

    await whenTimePasses(60_000);

    expect(sourceFixture.reads).toBe(1);
    expect(pollingTimerCount()).toBe(0);
    expect(displayedOperatorCount()).toBe(3);
  });

  const pollingTimerCount = (): number => vi.getTimerCount();

  const displayedAnomalies = (): string[] => elements('supervision-anomalie').map(anomalie => texte(anomalie));
  const displayedActivityStart = (): string => texte(requiredFixture(element('supervision-activite-debut'), 'activity start'));

  const isErrorDisplayed = (): boolean => element('supervision-error') !== null;

  const whenRefreshClicked = (): void => {
    refreshButton().click();
  };
  const isRefreshDisabled = (): boolean => refreshButton().disabled;

  const whenSupervisionClosed = (): void => {
    componentFixture.destroy();
  };
  const whenSupervisionRemounted = (): void => {
    componentFixture = TestBed.createComponent(SupervisionAtelier);
  };

  const displayedOperatorCount = (): number => elements('supervision-carte').length;
  const isReadingAgain = (): boolean => element('supervision-plateau')?.getAttribute('aria-busy') === 'true';

  const whenVisibilityChanges = (visibility: DocumentVisibilityState): void => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(visibility);
    document.dispatchEvent(new Event('visibilitychange'));
    componentFixture.detectChanges();
  };

  const whenViewSettles = async (): Promise<void> => {
    await componentFixture.whenStable();
  };

  const whenTimePasses = async (milliseconds: number): Promise<void> => {
    await vi.advanceTimersByTimeAsync(milliseconds);
    componentFixture.detectChanges();
  };

  it('should display loading until the data arrives', async () => {
    givenDonneesPending();

    await whenSupervisionOpened();

    thenLoadingIsDisplayed();
  });

  it('should render each lane with its count and its operators', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive(atelierFixture);

    thenLanesAre([
      { couloir: 'au-travail', nombre: '3', operateurs: ['Aubert Lucas', 'Marchand Kevin', 'Vidal Hugo'] },
      { couloir: 'sans-affectation', nombre: '1', operateurs: ['Lefèvre Sophie'] },
      { couloir: 'en-pause', nombre: '3', operateurs: ['Dumas Julien', 'Roux Nathalie', 'Schmitt Yanis'] },
      { couloir: 'absents', nombre: '2', operateurs: ['Fabre Lucie', 'Perrin Loïc'] },
    ]);
  });

  it('should show « Personne » in an empty lane', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive();

    expect(texte(lane('au-travail'))).toContain('Personne');
    expect(texte(lane('sans-affectation'))).not.toContain('Personne');
  });

  it('should show the activity reference, workstation, trade and start without interaction', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive(atelierFixture);

    expect(activitiesOf('op-aubert').map(({ element, poste, debut }) => ({ element, poste, debut }))).toEqual([
      { element: 'Moule 1015', poste: 'Fraiseuse 1 · Fraisage', debut: 'depuis 07:05' },
      { element: 'OF 3004', poste: 'Tour 1 · Tournage', debut: 'depuis 09:40' },
    ]);
  });

  it('should name an element by its name when it has no reference, and say it has no workstation', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive(atelierFixture);

    expect(activitiesOf('op-vidal').map(({ element, poste }) => ({ element, poste }))).toEqual([
      { element: 'OF OF-2026-000048', poste: 'Sans poste' },
    ]);
  });

  it('should label non-billable work « Hors OF » without any reference', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive({
      operateurs: [aubertFixture],
      journees: [JourneeDeTravail.open(aubertFixture.id, 'PRESENT', [new FenetreDePresence(instantFixture(6, 58))])],
      activites: [
        activiteFixture(aubertFixture, {
          id: 'act-hors-of',
          objet: new HorsOf(),
          poste: posteFixture('Tour 3', 'Tournage'),
          debut: instantFixture(7, 45),
        }),
      ],
    });

    expect(activitiesOf('op-aubert').map(({ element, poste, debut }) => ({ element, poste, debut }))).toEqual([
      { element: 'Hors OF', poste: 'Tour 3 · Tournage', debut: 'depuis 07:45' },
    ]);
  });

  it('should say that an unassigned or paused operator has no activity in progress, and nothing for an absent one', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive(atelierFixture);

    expect([idleNoticeOf('op-lefevre'), idleNoticeOf('op-roux'), idleNoticeOf('op-fabre')]).toEqual([
      'Aucune activité en cours',
      'Aucune activité en cours',
      undefined,
    ]);
  });

  it('should list the trades of an unassigned or paused operator without activity, never those of an absent one', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive(atelierFixture);

    expect(['op-lefevre', 'op-roux', 'op-schmitt', 'op-fabre'].map(id => tradesOf(id))).toEqual([
      'Métier : Dessin',
      'Métiers : Soudage, Tournage',
      undefined,
      undefined,
    ]);
  });

  it('should mark a nonconforming activity with its NC label', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive(atelierFixture);

    expect(activitiesOf('op-aubert').map(({ nc }) => nc)).toEqual([undefined, 'NC']);
  });

  it('should mark the activities of a paused operator as suspended', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive(atelierFixture);

    expect(activitiesOf('op-dumas').map(({ suspendue }) => suspendue)).toEqual(['suspendue']);
    expect(activitiesOf('op-aubert').map(({ suspendue }) => suspendue)).toEqual([undefined, undefined]);
  });

  it('should show an absent operator’s activities, NC included, without naming them in the NC signal', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive(atelierFixture);

    expect(activitiesOf('op-perrin')).toEqual([
      { element: 'OF 3006', poste: 'Tour 1 · Tournage', debut: 'depuis 07:00', nc: 'NC', suspendue: undefined },
    ]);
    expect(signal('supervision-signal-nc')).toBe('1 en NC : Aubert Lucas');
  });

  it('should show the arrival and pause start times, with the date when they fall on another day than the evaluation instant', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive(atelierFixture);

    expect(['op-aubert', 'op-marchand', 'op-lefevre', 'op-dumas', 'op-schmitt', 'op-perrin'].map(id => hourOf(id))).toEqual([
      'arrivée 06:58',
      'arrivée le 12/09 à 06:04',
      'arrivée 08:55',
      'pause depuis 09:00',
      undefined,
      undefined,
    ]);
    expect(activitiesOf('op-marchand').map(({ debut }) => debut)).toEqual(['depuis le 12/09 à 14:20']);
  });

  it('should show an anomaly band without moving the operator out of the lane', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive(atelierFixture);

    expect(anomaliesIn('au-travail')).toEqual({ 'op-marchand': ['Aucun départ pointé depuis plus de 16 h'] });
    expect(anomaliesIn('en-pause')).toEqual({ 'op-schmitt': ['Venue ouverte sans heure d’arrivée'] });
    expect(anomaliesIn('absents')).toEqual({ 'op-perrin': ['Activité d’un opérateur absent'] });
  });

  it('should name nonconforming and to-check operators in the signal line', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive(atelierFixture);

    expect([signal('supervision-signal-nc'), signal('supervision-signal-a-verifier')]).toEqual([
      '1 en NC : Aubert Lucas',
      '3 à vérifier : Marchand Kevin, Perrin Loïc, Schmitt Yanis',
    ]);
  });

  it('should still name six operators to check', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive(absentsActifsFixture(6));

    expect(signal('supervision-signal-a-verifier')).toBe(
      '6 à vérifier : Absent 0 Actif, Absent 1 Actif, Absent 2 Actif, Absent 3 Actif, Absent 4 Actif, Absent 5 Actif',
    );
  });

  it('should count the operators to check without naming them beyond six', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive(absentsActifsFixture(7));

    expect([signal('supervision-signal-nc'), signal('supervision-signal-a-verifier')]).toEqual(['0 en NC', '7 à vérifier']);
  });

  it.each([
    { operateurs: [dumasFixture], attendu: '1 en NC : Dumas Julien (suspendue)' },
    { operateurs: [dumasFixture, rouxFixture], attendu: '2 en NC : Dumas Julien, Roux Nathalie (suspendues)' },
  ])('should say when every counted nonconformity is suspended: $attendu', async ({ operateurs, attendu }) => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive(nonConformitesSuspenduesFixture(operateurs));

    expect(signal('supervision-signal-nc')).toBe(attendu);
  });

  it('should not call the nonconformities suspended while one of them is being worked on', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive(nonConformitesFixture({ auTravail: [aubertFixture], enPause: [dumasFixture] }));

    expect(signal('supervision-signal-nc')).toBe('2 en NC : Aubert Lucas, Dumas Julien');
  });

  it('should count present operators, paused and absent ones excluded', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive(atelierFixture);

    expect([signal('supervision-presents'), signal('supervision-presents-compact')]).toEqual(['Présents 4', '4 présents']);
  });

  it('should speak of a single operator and a single present one in the singular', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive({
      operateurs: [lefevreFixture],
      journees: [JourneeDeTravail.open(lefevreFixture.id, 'PRESENT', [new FenetreDePresence(instantFixture(8, 55))])],
      activites: [],
    });

    expect([signal('supervision-derniere-lecture'), signal('supervision-presents-compact')]).toEqual([
      '1 opérateur · d’après les pointages reçus jusqu’à 10:00 · actualisé toutes les 30 s',
      '1 présent',
    ]);
  });

  it('should date the freshness of the lanes from the evaluation instant', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive(atelierFixture);

    expect(signal('supervision-derniere-lecture')).toBe(
      '9 opérateurs · d’après les pointages reçus jusqu’à 10:00 · actualisé toutes les 30 s',
    );
  });

  it('should display an empty state when there are no declared operators', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive({ operateurs: [], journees: [], activites: [] });

    thenEmptyStateIsDisplayed();
  });

  it('should display an error without lanes when acquired data produces an unexploitable supervision result', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive({
      operateurs: [aliceFixture],
      journees: [],
      activites: [
        new ActiviteDeSupervision({
          id: new IdentifiantActivite('act-orphan'),
          operateurId: undefined,
          objet: ofFixture('42'),
          categorie: new CategorieActivite('NON_CONFORMITE'),
          debut: new Instant('2026-09-13T10:00:00Z'),
        }),
      ],
    });

    thenErrorReplacesDataAndRetryIsAvailable();
  });

  it('should display an acquisition error without data', async () => {
    await givenAcquisitionInProgress();

    await whenAcquisitionFails();

    thenErrorReplacesDataAndRetryIsAvailable();
  });

  it('should replace previously displayed data with an error when refresh fails', async () => {
    await givenDonneesDisplayed();

    await whenRefreshFails();

    thenErrorReplacesDataAndRetryIsAvailable();
  });

  it('should replace previously displayed data with an error when refresh returns an unexploitable result', async () => {
    await givenDonneesDisplayed();

    await refresh();
    await whenDonneesArrive({
      operateurs: [aliceFixture],
      journees: [],
      activites: [
        new ActiviteDeSupervision({
          id: new IdentifiantActivite('act-orphan-refresh'),
          operateurId: undefined,
          objet: ofFixture('42'),
          categorie: new CategorieActivite('NON_CONFORMITE'),
          debut: new Instant('2026-09-13T10:00:00Z'),
        }),
      ],
    });

    thenErrorReplacesDataAndRetryIsAvailable();
  });

  it('should display fresh data when the user retries after an error', async () => {
    await givenAcquisitionFailed();

    await whenRetrySucceeds();

    thenLanesAre([
      { couloir: 'au-travail', nombre: '0', operateurs: [] },
      { couloir: 'sans-affectation', nombre: '1', operateurs: ['Martin Alice'] },
      { couloir: 'en-pause', nombre: '1', operateurs: ['Durand Bob'] },
      { couloir: 'absents', nombre: '1', operateurs: ['Bernard Chloé'] },
    ]);
  });

  const givenDonneesPending = (): void => {
    sourceFixture.prepare();
  };

  const givenAcquisitionInProgress = async (): Promise<void> => {
    givenDonneesPending();
    await whenSupervisionOpened();
  };

  const givenDonneesDisplayed = async (): Promise<void> => {
    await givenAcquisitionInProgress();
    await whenDonneesArrive();
  };

  const givenAcquisitionFailed = async (): Promise<void> => {
    await givenAcquisitionInProgress();
    await whenAcquisitionFails();
  };

  const whenSupervisionOpened = async (): Promise<void> => {
    componentFixture.detectChanges();
    await sourceFixture.arrival.promise;
  };

  const whenDonneesArrive = async (donnees: DonneesDeSupervision = donneesFixture): Promise<void> => {
    sourceFixture.response.resolve(donnees);
    await componentFixture.whenStable();
  };

  const whenAcquisitionFails = async (): Promise<void> => {
    sourceFixture.response.reject(new Error('Source unavailable'));
    await componentFixture.whenStable();
  };

  const whenRefreshFails = async (): Promise<void> => {
    await refresh();
    await whenAcquisitionFails();
  };

  const whenRetrySucceeds = async (): Promise<void> => {
    await refresh();
    await whenDonneesArrive();
  };

  const thenLoadingIsDisplayed = (): void => {
    expect(texte(requiredFixture(element('supervision-loading'), 'loading'))).toContain('Chargement');
    expect(element('supervision-plateau')).toBeNull();
    expect(refreshButton().disabled).toBe(true);
  };

  const thenLanesAre = (expected: readonly { couloir: string; nombre: string; operateurs: readonly string[] }[]): void => {
    expect(
      expected.map(({ couloir }) => ({
        couloir,
        nombre: texte(requiredFixture(lane(couloir).querySelector<HTMLElement>(dataSelector('supervision-couloir-nombre')), 'lane count')),
        operateurs: [...lane(couloir).querySelectorAll<HTMLElement>(dataSelector('supervision-operateur-nom'))].map(nom => texte(nom)),
      })),
    ).toEqual(expected);
    expect(element('supervision-loading')).toBeNull();
    expect(element('supervision-error')).toBeNull();
  };

  const thenEmptyStateIsDisplayed = (): void => {
    expect(texte(requiredFixture(element('supervision-empty'), 'empty state'))).toContain('Aucun opérateur déclaré');
    expect(elements('supervision-carte')).toHaveLength(0);
    expect(element('supervision-loading')).toBeNull();
    expect(element('supervision-error')).toBeNull();
  };

  const thenErrorReplacesDataAndRetryIsAvailable = (): void => {
    expect(texte(requiredFixture(element('supervision-error'), 'error'))).toContain('Impossible de charger');
    expect(element('supervision-plateau')).toBeNull();
    expect(refreshButton().disabled).toBe(false);
  };

  const refresh = async (): Promise<void> => {
    sourceFixture.prepare();
    refreshButton().click();
    await whenSupervisionOpened();
  };

  const lane = (couloir: string): HTMLElement => requiredFixture(element(`supervision-couloir-${couloir}`), `lane ${couloir}`);

  const card = (id: string): HTMLElement =>
    requiredFixture(
      elements('supervision-carte').find(carte => carte.dataset['operateurId'] === id),
      `card ${id}`,
    );

  const textIn = (parent: HTMLElement, selector: string): string | undefined => {
    const child = parent.querySelector<HTMLElement>(dataSelector(selector));
    return child === null ? undefined : texte(child);
  };

  const activitiesOf = (id: string): ActiviteAffichee[] =>
    [...card(id).querySelectorAll<HTMLElement>(dataSelector('supervision-activite'))].map(activite => ({
      element: textIn(activite, 'supervision-activite-element'),
      poste: textIn(activite, 'supervision-activite-poste'),
      debut: textIn(activite, 'supervision-activite-debut'),
      nc: textIn(activite, 'supervision-marque-nc'),
      suspendue: textIn(activite, 'supervision-suspendue'),
    }));

  const hourOf = (id: string): string | undefined => textIn(card(id), 'supervision-heure');

  const idleNoticeOf = (id: string): string | undefined => textIn(card(id), 'supervision-aucune-activite');

  const tradesOf = (id: string): string | undefined => textIn(card(id), 'supervision-metiers');

  const anomaliesIn = (couloir: string): Record<string, string[]> => {
    const anomaliesParCarte: [string, string[]][] = [...lane(couloir).querySelectorAll<HTMLElement>(dataSelector('supervision-carte'))].map(
      carte => [
        carte.dataset['operateurId'] ?? '',
        [...carte.querySelectorAll<HTMLElement>(dataSelector('supervision-anomalie'))].map(texte),
      ],
    );
    return Object.fromEntries(anomaliesParCarte.filter(([, anomalies]) => anomalies.length > 0));
  };

  const signal = (selector: string): string => texte(requiredFixture(element(selector), selector));

  /** `\s` couvre aussi les espaces insécables des libellés : les attentes s'écrivent avec des espaces simples. */
  const texte = (node: HTMLElement): string => node.textContent.replace(/\s+/g, ' ').trim();

  const element = (selector: string): HTMLElement | null => {
    const host = componentFixture.nativeElement as HTMLElement;
    return host.querySelector(dataSelector(selector));
  };

  const elements = (selector: string): HTMLElement[] => {
    const host = componentFixture.nativeElement as HTMLElement;
    return Array.from(host.querySelectorAll(dataSelector(selector)));
  };

  const refreshButton = (): HTMLButtonElement => {
    const button = element('supervision-refresh');
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error('Missing refresh button');
    }
    return button;
  };
});
