import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { DeferredFixture } from '@test/unit/fixtures/DeferredFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActiviteDeSupervision } from '../../domain/ActiviteDeSupervision';
import { CategorieActivite } from '../../domain/CategorieActivite';
import { DonneesDeSupervision, DonneesDeSupervisionPort } from '../../domain/DonneesDeSupervisionPort';
import { FenetreDePresence } from '../../domain/FenetreDePresence';
import { IdentifiantActivite } from '../../domain/IdentifiantActivite';
import { IdentifiantOperateur } from '../../domain/IdentifiantOperateur';
import { Instant } from '../../domain/Instant';
import { JourneeDeTravail } from '../../domain/JourneeDeTravail';
import { OperateurDeclare } from '../../domain/OperateurDeclare';
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

const aliceFixture = new OperateurDeclare(new IdentifiantOperateur('alice'), 'Martin', 'Alice');
const bobFixture = new OperateurDeclare(new IdentifiantOperateur('bob'), 'Durand', 'Bob');
const chloeFixture = new OperateurDeclare(new IdentifiantOperateur('chloe'), 'Bernard', 'Chloé');
const donneesFixture: DonneesDeSupervision = {
  operateurs: [aliceFixture, bobFixture, chloeFixture],
  journees: [JourneeDeTravail.open(aliceFixture.id, 'PRESENT'), JourneeDeTravail.open(bobFixture.id, 'EN_PAUSE')],
  activites: [],
};

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

  it('should reload at thirty seconds and leave the grid unchanged before then', async () => {
    await givenDonneesDisplayed();

    sourceFixture.prepare();
    await whenTimePasses(29_999);
    const beforeDeadline = displayedOperatorCount();
    await whenTimePasses(1);
    const atDeadline = isLoadingDisplayed();
    await whenDonneesArrive({ operateurs: [], journees: [], activites: [] });

    expect(beforeDeadline).toBe(3);
    expect(atDeadline).toBe(true);
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
    const onReturn = isLoadingDisplayed();
    await whenDonneesArrive();
    sourceFixture.prepare();
    await whenTimePasses(29_999);
    const beforeNextDeadline = displayedOperatorCount();
    await whenTimePasses(1);
    const atNextDeadline = isLoadingDisplayed();
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
    const obsoleteResultWasWithheld = isLoadingDisplayed();
    const readsAfterRelease = sourceFixture.reads;
    await whenDonneesArrive();

    expect(readsBeforeRelease).toBe(2);
    expect(readsAfterRelease).toBe(3);
    expect(obsoleteResultWasWithheld).toBe(true);
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
    const failure = { gridSize: displayedOperatorCount(), error: isErrorDisplayed() };

    sourceFixture.prepare();
    await whenTimePasses(30_000);
    await whenDonneesArrive();

    expect(failure).toEqual({ gridSize: 0, error: true });
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
      activites: [activiteFixture('act-1', 'Moule 1015')],
    };
    await whenDonneesArrive(donneesAtThreshold);

    await whenTimePasses(29_999);
    const beforeRead = displayedAnomalies();
    sourceFixture.prepare();
    await whenTimePasses(1);
    await whenDonneesArrive(donneesAtThreshold);

    expect(beforeRead).toEqual([]);
    expect(displayedAnomalies()).toEqual(['Journée ouverte depuis plus de 16 h']);
    expect(displayedActivityStart()).toBe('08:12');
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

  const displayedAnomalies = (): string[] => elements('supervision-anomalie').map(anomalie => anomalie.textContent.trim());
  const displayedActivityStart = (): string | undefined => element('supervision-activite-debut')?.textContent.trim();

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

  const displayedOperatorCount = (): number => elements('supervision-ligne').length;
  const isLoadingDisplayed = (): boolean => element('supervision-loading') !== null;

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

  it('should display a row for each declared operator with their presence status', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive();

    thenOperatorsAreDisplayed([
      { nomComplet: 'Bernard Chloé', presence: 'Absent' },
      { nomComplet: 'Durand Bob', presence: 'En pause' },
      { nomComplet: 'Martin Alice', presence: 'Présent' },
    ]);
  });

  it('should expose a collapsed journal that can be expanded and stays open after polling', async () => {
    await givenDonneesDisplayed();
    const initiallyCollapsed = journalState('alice');

    await whenJournalToggled('alice');
    sourceFixture.prepare();
    await whenTimePasses(30_000);
    await whenDonneesArrive();

    expect(initiallyCollapsed).toEqual({ expanded: 'false', hidden: true, linked: true });
    expect(journalState('alice')).toEqual({ expanded: 'true', hidden: false, linked: true });
    expect(journalState('bob').expanded).toBe('false');
  });

  it('should close the previous journal when another row is expanded and retain that selection after polling', async () => {
    await givenDonneesDisplayed();
    await whenJournalToggled('alice');

    await whenJournalToggled('bob');
    sourceFixture.prepare();
    await whenTimePasses(30_000);
    await whenDonneesArrive();

    expect(journalState('alice')).toEqual({ expanded: 'false', hidden: true, linked: true });
    expect(journalState('bob')).toEqual({ expanded: 'true', hidden: false, linked: true });
  });

  it('should select only the activity owner journal and keep it open on repeated activity clicks', async () => {
    await givenAcquisitionInProgress();
    await whenDonneesArrive({ ...donneesFixture, activites: [activiteFixture('act', 'OF-42')] });
    await whenJournalToggled('bob');

    await whenActivityOpened();
    await whenActivityOpened();

    expect(journalState('alice')).toEqual({ expanded: 'true', hidden: false, linked: true });
    expect(journalState('bob')).toEqual({ expanded: 'false', hidden: true, linked: true });
  });

  it('should use native titles for activity and operator hover details', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive({ ...donneesFixture, activites: [activiteFixture('act', 'OF-42', 'Tour 1')] });

    thenNativeTitlesDescribeTheActivityAndOperator();
  });

  const thenNativeTitlesDescribeTheActivityAndOperator = (): void => {
    const activity = requiredFixture(element('supervision-segment-activite'), 'activity');
    expect(activity.title).toBe('OF-42 · FABRICATION · Tour 1 · Depuis 08:12 · 108 min · En cours');
    expect(activity.getAttribute('aria-label')).toBe(activity.title);
    expect(operatorRow('alice').querySelector<HTMLElement>(dataSelector('supervision-identite'))?.title).toContain(
      'Martin Alice · Présent',
    );
  };

  it('should share a 06 to 22 scale and place now at 10 without a timer per row', async () => {
    await givenDonneesDisplayed();

    await whenViewSettles();

    expect(displayedTexts('supervision-repere-heure')).toEqual([
      '06:00',
      '08:00',
      '10:00',
      '12:00',
      '14:00',
      '16:00',
      '18:00',
      '20:00',
      '22:00',
    ]);
    thenNowIsAnUnlabelledMarker();
    expect(pollingTimerCount()).toBe(1);
  });

  it('should display actual presence and breaks in chronological proportions', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive({
      operateurs: [aliceFixture],
      activites: [],
      journees: [
        JourneeDeTravail.open(aliceFixture.id, 'PRESENT', [
          new FenetreDePresence(instantFixture(9)),
          new FenetreDePresence(instantFixture(6), instantFixture(8)),
        ]),
      ],
    });
    await whenJournalToggled('alice');

    expect(segmentPositions('supervision-segment-presence')).toEqual([
      { left: '0%', width: '12.5%', label: 'Présence · 06:00 – 08:00' },
      { left: '12.5%', width: '6.25%', label: 'Pause · 08:00 – 09:00' },
      { left: '18.75%', width: '6.25%', label: 'Présence · 09:00 – 10:00 (en cours)' },
    ]);
    expect(displayedText('supervision-journal')).toContain('Pause · 08:00 – 09:00');
  });

  it('should show only coloured activity markers while keeping full accessible details', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive({
      ...donneesFixture,
      activites: [
        activiteFixture('long', 'Fabrication', 'Tour 1'),
        new ActiviteDeSupervision({
          id: new IdentifiantActivite('short'),
          operateurId: aliceFixture.id,
          nom: 'Contrôle de non-conformité très court',
          categorie: new CategorieActivite('NC'),
          debut: instantFixture(9, 55),
          poste: 'Tour 2',
        }),
      ],
    });

    thenActivitiesHaveSeparateTracksAndCompleteDetails();
  });

  it.each([5, 23])('should report now outside the scale at %i without a clamped time bar', async heure => {
    await givenAcquisitionInProgress();
    givenCurrentHour(heure);

    await whenDonneesArrive();

    expect(element('supervision-maintenant')).toBeNull();
    expect(displayedText('supervision-maintenant-hors-plage')).toContain(`Maintenant (${String(heure).padStart(2, '0')}:00) — hors plage`);
  });

  it('should show an activity starting exactly now as a small marker rather than outside the scale', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive({
      ...donneesFixture,
      activites: [
        new ActiviteDeSupervision({
          id: new IdentifiantActivite('just-started'),
          operateurId: aliceFixture.id,
          nom: 'Démarrage',
          categorie: new CategorieActivite('FABRICATION'),
          debut: instantFixture(10),
        }),
      ],
    });
    await whenActivityOpened();

    expect(displayedActivityLabel()).toContain('Depuis 10:00 · 0 min');
    expect(element('supervision-position-activite')?.style.left).toBe('25%');
    expect(journalState('alice').expanded).toBe('true');
  });

  const displayedActivityLabel = (): string | null | undefined => element('supervision-segment-activite')?.getAttribute('aria-label');

  const whenActivityOpened = async (): Promise<void> => {
    requiredFixture(element('supervision-segment-activite'), 'activity segment').click();
    await whenViewSettles();
  };

  it('should keep an old activity legible when only five minutes fit after the scale opening', async () => {
    await givenAcquisitionInProgress();
    givenCurrentTime(6, 5);

    await whenDonneesArrive({
      ...donneesFixture,
      activites: [
        new ActiviteDeSupervision({
          id: new IdentifiantActivite('early'),
          operateurId: aliceFixture.id,
          nom: 'Fabrication commencée avant la plage',
          categorie: new CategorieActivite('FABRICATION'),
          debut: instantFixture(5),
        }),
      ],
    });

    expect(elements('supervision-marque-activite')).toHaveLength(1);
    expect(displayedActivityLabel()).toContain('Depuis 05:00 · 65 min');
  });

  const givenCurrentTime = (heure: number, minute: number): void => {
    vi.setSystemTime(new Date(2026, 8, 13, heure, minute));
  };

  it('should keep activities available in text when the current time precedes the scale', async () => {
    await givenAcquisitionInProgress();
    givenCurrentHour(5);

    await whenDonneesArrive({
      ...donneesFixture,
      activites: [
        new ActiviteDeSupervision({
          id: new IdentifiantActivite('night'),
          operateurId: aliceFixture.id,
          nom: 'Fabrication de nuit',
          categorie: new CategorieActivite('FABRICATION'),
          debut: instantFixture(4),
        }),
      ],
    });
    await whenJournalToggled('alice');

    expect(element('supervision-segment-activite')).toBeNull();
    expect(displayedTexts('supervision-piste-activite')).toEqual(['Activité hors plage']);
    expect(displayedTexts('supervision-activite-nom')).toEqual(['Fabrication de nuit']);
    expect(journalState('alice').hidden).toBe(false);
  });

  it('should draw a current pause only after the last real presence window', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive({
      operateurs: [aliceFixture],
      activites: [],
      journees: [JourneeDeTravail.open(aliceFixture.id, 'EN_PAUSE', [new FenetreDePresence(instantFixture(7), instantFixture(9))])],
    });

    expect(segmentPositions('supervision-segment-presence')).toEqual([
      { left: '6.25%', width: '12.5%', label: 'Présence · 07:00 – 09:00' },
      { left: '18.75%', width: '6.25%', label: 'Pause · 09:00 – 10:00 (en cours)' },
    ]);
    expect(displayedTexts('supervision-indicateur-glm')).toEqual([]);
  });

  it('should clip overnight presence and omit old windows without joining separate visits with a pause', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive({
      operateurs: [aliceFixture],
      activites: [],
      journees: [
        JourneeDeTravail.closed(aliceFixture.id, [new FenetreDePresence(instantFixture(-4), instantFixture(7))]),
        JourneeDeTravail.closed(aliceFixture.id, [new FenetreDePresence(instantFixture(-22), instantFixture(-20))]),
        JourneeDeTravail.open(aliceFixture.id, 'PRESENT', [new FenetreDePresence(instantFixture(9))]),
      ],
    });

    expect(segmentPositions('supervision-segment-presence')).toEqual([
      { left: '0%', width: '6.25%', label: 'Présence · 20:00 – 07:00' },
      { left: '18.75%', width: '6.25%', label: 'Présence · 09:00 – 10:00 (en cours)' },
    ]);
  });

  it('should retain expanded journals across filters', async () => {
    await givenDonneesDisplayed();
    await whenJournalToggled('alice');

    await whenFilterClicked('supervision-filtre-absent');
    await whenFilterClicked('supervision-filtre-tous');

    expect(journalState('alice').expanded).toBe('true');
  });

  it('should close an expanded journal when toggled again', async () => {
    await givenDonneesDisplayed();
    await whenJournalToggled('alice');

    await whenJournalToggled('alice');

    expect(journalState('alice').hidden).toBe(true);
  });

  it.each([
    ['supervision-filtre-en-pause', 'Durand Bob'],
    ['supervision-filtre-absent', 'Bernard Chloé'],
  ])('should retain the %s presence filter', async (filtre, nom) => {
    await givenDonneesDisplayed();

    await whenFilterClicked(filtre);

    expect(displayedTexts('supervision-operateur-nom')).toEqual([nom]);
  });

  it('should filter anomalies independently of presence and GLM', async () => {
    await givenDonneesDisplayed();

    await whenFilterClicked('supervision-filtre-anomalie');

    expect(displayedTexts('supervision-operateur-nom')).toEqual(['Durand Bob', 'Martin Alice']);
    expect(displayedTexts('supervision-indicateur-glm')).toEqual(['⚡ GLM']);
    expect(displayedTexts('supervision-indicateur-anomalies')).toHaveLength(2);
  });

  it.each(['TOUR 1', 'fabrication', 'alice martin'])('should search names, activities and workstations using %s', async recherche => {
    await givenAcquisitionInProgress();
    await whenDonneesArrive({
      ...donneesFixture,
      activites: [activiteFixture('act', 'Fabrication', 'Tour 1'), activiteFixture('other', 'Contrôle')],
    });

    await whenSearchInputChanged(recherche);

    expect(displayedTexts('supervision-operateur-nom')).toEqual(['Martin Alice']);
  });

  it('should omit missing workstations from search results', async () => {
    await givenAcquisitionInProgress();
    await whenDonneesArrive({
      ...donneesFixture,
      activites: [activiteFixture('act', 'Fabrication'), activiteFixture('other', 'Contrôle', 'Tour 2')],
    });

    await whenSearchInputChanged('Tour 1');

    thenEmptySearchResultIsDisplayed();
  });

  it('should preserve the name, firstname and identifier ordering independently of presence', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive({
      operateurs: [
        new OperateurDeclare(new IdentifiantOperateur('z'), 'Martin', 'Alice'),
        new OperateurDeclare(new IdentifiantOperateur('b'), 'Martin', 'Zoé'),
        new OperateurDeclare(new IdentifiantOperateur('a'), 'Martin', 'Alice'),
      ],
      journees: [JourneeDeTravail.open(new IdentifiantOperateur('z'), 'PRESENT')],
      activites: [],
    });

    expect(displayedOperatorIds()).toEqual(['a', 'z', 'b']);
  });

  const displayedOperatorIds = (): (string | undefined)[] => elements('supervision-ligne').map(row => row.dataset['operateurId']);

  const givenCurrentHour = (heure: number): void => {
    vi.setSystemTime(new Date(2026, 8, 13, heure));
  };
  const thenActivitiesHaveSeparateTracksAndCompleteDetails = (): void => {
    const tracks = elements('supervision-piste-activite');
    expect(tracks).toHaveLength(2);
    expect(tracks.map(track => track.querySelectorAll(dataSelector('supervision-segment-activite')).length)).toEqual([1, 1]);
    const short = requiredFixture(elements('supervision-segment-activite')[1], 'short activity');
    expect(short.getAttribute('aria-label')).toContain('Contrôle de non-conformité très court · NC · Tour 2 · Depuis 09:55 · 5 min');
    expect(
      Number.parseFloat(requiredFixture(elements('supervision-position-activite')[1], 'short segment position').style.width),
    ).toBeCloseTo(0.5208, 4);
    expect(displayedTexts('supervision-marque-activite')).toEqual(['', '']);
    expect(short.tabIndex).toBe(0);
    expect(short.title).toBe(short.getAttribute('aria-label'));
    expect(operatorRow('alice').querySelector<HTMLElement>(dataSelector('supervision-identite'))?.title).toContain(
      'Martin Alice · Présent',
    );
  };

  const thenNowIsAnUnlabelledMarker = (): void => {
    const marker = requiredFixture(element('supervision-maintenant'), 'current time marker');
    expect(marker.textContent.trim()).toBe('');
    expect(marker.title).toBe('Maintenant (10:00)');
    expect(marker.getAttribute('aria-label')).toBe('Maintenant (10:00)');
    expect(marker.style.left).toBe('25%');
  };

  const displayedText = (selector: string): string | undefined => element(selector)?.textContent;

  const displayedTexts = (selector: string): string[] => elements(selector).map(item => item.textContent.trim());
  const segmentPositions = (selector: string): { left: string; width: string; label: string | null }[] =>
    elements(selector).map(segment => ({
      left: segment.style.left,
      width: segment.style.width,
      label: segment.getAttribute('aria-label'),
    }));

  const operatorRow = (id: string): HTMLElement =>
    requiredFixture(
      elements('supervision-ligne').find(row => row.dataset['operateurId'] === id),
      `operator ${id}`,
    );

  const journalState = (id: string): { expanded: string | null; hidden: boolean; linked: boolean } => {
    const row = operatorRow(id);
    const button = requiredFixture(row.querySelector(dataSelector('supervision-deplier')), 'journal button');
    const journal = requiredFixture(row.querySelector<HTMLElement>(dataSelector('supervision-journal')), 'journal');
    return {
      expanded: button.getAttribute('aria-expanded'),
      hidden: journal.hidden,
      linked: button.getAttribute('aria-controls') === journal.id,
    };
  };

  const whenJournalToggled = async (id: string): Promise<void> => {
    const button = requiredFixture(operatorRow(id).querySelector<HTMLButtonElement>(dataSelector('supervision-deplier')), 'journal button');
    button.click();
    await whenViewSettles();
  };

  it('should display an empty state when there are no declared operators', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive({ operateurs: [], journees: [], activites: [] });

    thenEmptyStateIsDisplayed();
  });

  it('should display an error without grid when acquired data produces an unexploitable supervision result', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive({
      operateurs: [aliceFixture],
      journees: [],
      activites: [
        new ActiviteDeSupervision({
          id: new IdentifiantActivite('act-orphan'),
          operateurId: undefined,
          nom: 'OF-42',
          categorie: new CategorieActivite('NC'),
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
          nom: 'OF-42',
          categorie: new CategorieActivite('NC'),
          debut: new Instant('2026-09-13T10:00:00Z'),
        }),
      ],
    });

    thenErrorReplacesDataAndRetryIsAvailable();
  });

  it('should display fresh data when the user retries after an error', async () => {
    await givenAcquisitionFailed();

    await whenRetrySucceeds();

    thenOperatorsAreDisplayed([
      { nomComplet: 'Bernard Chloé', presence: 'Absent' },
      { nomComplet: 'Durand Bob', presence: 'En pause' },
      { nomComplet: 'Martin Alice', presence: 'Présent' },
    ]);
  });

  it('should display every ongoing element in its operator row', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive({
      ...donneesFixture,
      activites: [activiteFixture('act-1', 'Moule 1015'), activiteFixture('act-2', 'OF-2026-000042')],
    });

    await whenJournalToggled('alice');

    thenEveryElementIsInItsOperatorRow();
  });

  it('should display an absolute start time and omit a missing workstation', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive({
      ...donneesFixture,
      activites: [activiteFixture('act-1', 'Moule 1015', 'Tour 1'), activiteFixture('act-2', 'OF-2026-000042')],
    });

    await whenJournalToggled('alice');

    thenActivityDetailsShowAbsoluteTimesAndOnlyKnownWorkstations();
  });

  it('should mark only a present operator without activities as GLM', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive();

    thenOnlyThePresentIdleOperatorIsInGlm();
  });

  it('should remove GLM when an activity arrives for a present operator', async () => {
    await givenDonneesDisplayed();

    await refresh();
    await whenDonneesArrive({ ...donneesFixture, activites: [activiteFixture('act-1', 'Moule 1015')] });

    thenNoOperatorIsInGlm();
  });

  it('should mark the nonconforming activity without changing presence or hiding other activities', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive({
      ...donneesFixture,
      activites: [activiteFixture('act-nc', 'Moule 1015', 'Tour 1', 'NC'), activiteFixture('act-bon', 'OF-42')],
    });

    await whenJournalToggled('alice');

    thenOnlyTheNonconformingActivityIsMarked();
  });

  it('should display the absolute opening date and time supplied by the working visit', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive({
      ...donneesFixture,
      journees: [
        JourneeDeTravail.open(aliceFixture.id, 'PRESENT', [new FenetreDePresence(new Instant(new Date(2026, 8, 12, 6, 4).toISOString()))]),
      ],
    });

    await whenJournalToggled('alice');

    thenTheWorkingVisitOpeningIsDated();
  });

  it('should flag an old open visit while retaining its presence and activity', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive({
      ...donneesFixture,
      journees: [
        JourneeDeTravail.open(aliceFixture.id, 'PRESENT', [new FenetreDePresence(new Instant(new Date(2026, 8, 12, 6, 4).toISOString()))]),
      ],
      activites: [activiteFixture('act-1', 'Moule 1015')],
    });

    await whenJournalToggled('alice');

    thenTheOldVisitIsFlaggedWithoutCorrectingIt();
  });

  it('should explain a working visit without windows without inventing an opening time', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive();

    await whenJournalToggled('alice');
    await whenJournalToggled('bob');

    thenVisitsWithoutWindowsHaveNoInventedOpening();
  });

  it('should flag an absent operator activity while retaining its details and absent status', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive({
      ...donneesFixture,
      journees: [],
      activites: [activiteFixture('act-1', 'Moule 1015', 'Tour 1')],
    });

    await whenJournalToggled('alice');

    thenTheAbsentOperatorKeepsTheActivityDetails();
  });

  it('should compute workshop counters accurately on success', async () => {
    await givenDonneesDisplayed();

    thenWorkshopCountersMatch({
      total: '(3)',
      presents: '(1)',
      enPause: '(1)',
      absents: '(1)',
      glm: '(1)',
      anomalies: '(2)',
    });
  });

  it('should filter operators by presence status while preserving alphabetical order', async () => {
    await givenDonneesDisplayed();

    await whenFilterClicked('supervision-filtre-present');

    thenOperatorsAreDisplayed([{ nomComplet: 'Martin Alice', presence: 'Présent' }]);
  });

  it('should filter operators by GLM state', async () => {
    await givenDonneesDisplayed();

    await whenFilterClicked('supervision-filtre-glm');

    thenOperatorsAreDisplayed([{ nomComplet: 'Martin Alice', presence: 'Présent' }]);
  });

  it('should toggle off active filter and restore full list', async () => {
    await givenDonneesDisplayed();

    await whenFilterClicked('supervision-filtre-present');
    await whenFilterClicked('supervision-filtre-present');

    thenAllThreeOperatorsAreDisplayed();
  });

  it('should filter operators by search query matching name', async () => {
    await givenDonneesDisplayed();

    await whenSearchInputChanged('Durand');

    thenOperatorsAreDisplayed([{ nomComplet: 'Durand Bob', presence: 'En pause' }]);
  });

  it('should restore all operators when resetting filters and search', async () => {
    await givenDonneesDisplayed();

    await whenSearchInputChanged('Durand');
    await whenResetClicked();

    thenAllThreeOperatorsAreDisplayed();
  });

  it('should display empty search state when no operator matches criteria', async () => {
    await givenDonneesDisplayed();

    await whenSearchInputChanged('Introuvable');

    thenEmptySearchResultIsDisplayed();
  });

  const thenEveryElementIsInItsOperatorRow = (): void => {
    expect(journalState('alice').hidden).toBe(false);
    expect(elements('supervision-activite-nom').map(activite => activite.textContent.trim())).toEqual(['Moule 1015', 'OF-2026-000042']);
    expect(rowFor('alice').querySelectorAll(dataSelector('supervision-activite'))).toHaveLength(2);
    expect(rowFor('bob').querySelectorAll(dataSelector('supervision-activite'))).toHaveLength(0);
  };

  const thenActivityDetailsShowAbsoluteTimesAndOnlyKnownWorkstations = (): void => {
    expect(journalState('alice').hidden).toBe(false);
    expect(elements('supervision-activite-debut').map(debut => debut.textContent.trim())).toEqual(['08:12', '08:12']);
    expect(element('supervision-activite-debut')?.getAttribute('datetime')).toBe(new Date(2026, 8, 13, 8, 12).toISOString());
    expect(elements('supervision-activite-poste').map(poste => poste.textContent.trim())).toEqual(['Tour 1']);
    expect(elements('supervision-activite')[1]?.querySelector(dataSelector('supervision-activite-poste'))).toBeNull();
  };

  const thenOnlyThePresentIdleOperatorIsInGlm = (): void => {
    expect(rowFor('alice').querySelector(dataSelector('supervision-indicateur-glm'))?.textContent).toContain('GLM');
    expect(elements('supervision-indicateur-glm')).toHaveLength(1);
    expect(rowFor('alice').querySelector(dataSelector('supervision-presence'))?.textContent).toContain('Présent');
  };

  const thenNoOperatorIsInGlm = (): void => {
    expect(elements('supervision-indicateur-glm')).toHaveLength(0);
  };

  const thenOnlyTheNonconformingActivityIsMarked = (): void => {
    expect(journalState('alice').hidden).toBe(false);
    expect(elements('supervision-nc').map(marque => marque.textContent.trim())).toEqual(['NC']);
    expect(elements('supervision-activite')[0]?.querySelector(dataSelector('supervision-nc'))).not.toBeNull();
    expect(elements('supervision-activite')[1]?.querySelector(dataSelector('supervision-nc'))).toBeNull();
    expect(rowFor('alice').querySelector(dataSelector('supervision-presence'))?.textContent).toContain('Présent');
    expect(elements('supervision-activite')).toHaveLength(2);
  };

  const thenTheWorkingVisitOpeningIsDated = (): void => {
    expect(journalState('alice').hidden).toBe(false);
    expect(rowFor('alice').querySelector(dataSelector('supervision-ouverture'))?.textContent).toContain('12/09/2026 06:04');
    expect(elements('supervision-ouverture')).toHaveLength(1);
    expect(element('supervision-ouverture')?.getAttribute('datetime')).toBe(new Date(2026, 8, 12, 6, 4).toISOString());
  };

  const thenTheOldVisitIsFlaggedWithoutCorrectingIt = (): void => {
    expect(journalState('alice').hidden).toBe(false);
    expect(rowFor('alice').querySelector(dataSelector('supervision-anomalie'))?.textContent).toContain(
      'Journée ouverte depuis plus de 16 h',
    );
    expect(rowFor('alice').querySelector(dataSelector('supervision-presence'))?.textContent).toContain('Présent');
    expect(rowFor('alice').querySelector(dataSelector('supervision-activite-nom'))?.textContent).toContain('Moule 1015');
    expect(rowFor('bob').querySelector(dataSelector('supervision-anomalie'))).toBeNull();
  };

  const thenVisitsWithoutWindowsHaveNoInventedOpening = (): void => {
    expect(rowFor('alice').querySelector(dataSelector('supervision-anomalie'))?.textContent).toBe("Journée ouverte sans heure d'ouverture");
    expect(rowFor('alice').querySelector(dataSelector('supervision-ouverture'))).toBeNull();
    expect(rowFor('alice').querySelector(dataSelector('supervision-presence'))?.textContent).toContain('Présent');
    expect(rowFor('bob').querySelector(dataSelector('supervision-anomalie'))?.textContent).toBe("Journée ouverte sans heure d'ouverture");
    expect(rowFor('bob').querySelector(dataSelector('supervision-presence'))?.textContent).toContain('En pause');
  };

  const thenTheAbsentOperatorKeepsTheActivityDetails = (): void => {
    expect(journalState('alice').hidden).toBe(false);
    expect(rowFor('alice').querySelector(dataSelector('supervision-anomalie'))?.textContent).toBe('Activité d’un opérateur absent');
    expect(rowFor('alice').querySelector(dataSelector('supervision-presence'))?.textContent).toContain('Absent');
    expect(rowFor('alice').querySelector(dataSelector('supervision-activite-nom'))?.textContent).toContain('Moule 1015');
    expect(rowFor('alice').querySelector(dataSelector('supervision-activite-poste'))?.textContent).toContain('Tour 1');
    expect(rowFor('alice').querySelector(dataSelector('supervision-activite-debut'))?.textContent).toBe('08:12');
    expect(rowFor('alice').querySelector(dataSelector('supervision-ouverture'))).toBeNull();
    expect(rowFor('alice').querySelector(dataSelector('supervision-indicateur-glm'))).toBeNull();
  };

  const rowFor = (id: string): HTMLElement =>
    requiredFixture(
      elements('supervision-ligne').find(tile => tile.dataset['operateurId'] === id),
      'operator row',
    );

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
    expect(displayedText('supervision-loading')).toContain('Chargement');
    expect(element('supervision-grille')).toBeNull();
    expect(refreshButton().disabled).toBe(true);
  };

  const thenOperatorsAreDisplayed = (expected: readonly { nomComplet: string; presence: string }[]): void => {
    const tiles = elements('supervision-ligne');
    expect(tiles).toHaveLength(expected.length);
    tiles.forEach((tile, index) => {
      const exp = requiredFixture(expected[index], `expected operator at ${index}`);
      const nom = tile.querySelector(dataSelector('supervision-operateur-nom'))?.textContent.trim();
      const presence = tile.querySelector(dataSelector('supervision-presence'))?.textContent.trim();
      expect(nom).toBe(exp.nomComplet);
      expect(presence).toBe(exp.presence);
    });
    expect(element('supervision-loading')).toBeNull();
    expect(element('supervision-error')).toBeNull();
  };

  const thenEmptyStateIsDisplayed = (): void => {
    expect(displayedText('supervision-empty')).toContain('Aucun opérateur déclaré');
    expect(elements('supervision-ligne')).toHaveLength(0);
    expect(element('supervision-loading')).toBeNull();
    expect(element('supervision-error')).toBeNull();
  };

  const thenErrorReplacesDataAndRetryIsAvailable = (): void => {
    expect(displayedText('supervision-error')).toContain('Impossible de charger');
    expect(element('supervision-grille')).toBeNull();
    expect(refreshButton().disabled).toBe(false);
  };

  const thenWorkshopCountersMatch = (expected: {
    total: string;
    presents: string;
    enPause: string;
    absents: string;
    glm: string;
    anomalies: string;
  }): void => {
    expect(element('supervision-compteur-total')?.textContent.trim()).toBe(expected.total);
    expect(element('supervision-compteur-present')?.textContent.trim()).toBe(expected.presents);
    expect(element('supervision-compteur-en-pause')?.textContent.trim()).toBe(expected.enPause);
    expect(element('supervision-compteur-absent')?.textContent.trim()).toBe(expected.absents);
    expect(element('supervision-compteur-glm')?.textContent.trim()).toBe(expected.glm);
    expect(element('supervision-compteur-anomalie')?.textContent.trim()).toBe(expected.anomalies);
  };

  const whenFilterClicked = async (selector: string): Promise<void> => {
    const button = element(selector);
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error(`Missing filter button ${selector}`);
    }
    button.click();
    componentFixture.detectChanges();
    await componentFixture.whenStable();
  };

  const whenSearchInputChanged = async (query: string): Promise<void> => {
    const input = element('supervision-recherche-input');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Missing search input');
    }
    input.value = query;
    input.dispatchEvent(new Event('input'));
    componentFixture.detectChanges();
    await componentFixture.whenStable();
  };

  const whenResetClicked = async (): Promise<void> => {
    const button = element('supervision-reset-filtres');
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error('Missing reset button');
    }
    button.click();
    componentFixture.detectChanges();
    await componentFixture.whenStable();
  };

  const thenAllThreeOperatorsAreDisplayed = (): void => {
    thenOperatorsAreDisplayed([
      { nomComplet: 'Bernard Chloé', presence: 'Absent' },
      { nomComplet: 'Durand Bob', presence: 'En pause' },
      { nomComplet: 'Martin Alice', presence: 'Présent' },
    ]);
  };

  const thenEmptySearchResultIsDisplayed = (): void => {
    expect(displayedText('supervision-aucun-resultat')).toContain('Aucun opérateur ne correspond');
    expect(elements('supervision-ligne')).toHaveLength(0);
  };

  const refresh = async (): Promise<void> => {
    sourceFixture.prepare();
    refreshButton().click();
    await whenSupervisionOpened();
  };

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

const activiteFixture = (id: string, nom: string, poste?: string, categorie = 'FABRICATION'): ActiviteDeSupervision =>
  new ActiviteDeSupervision({
    id: new IdentifiantActivite(id),
    operateurId: aliceFixture.id,
    nom,
    categorie: new CategorieActivite(categorie),
    debut: new Instant(new Date(2026, 8, 13, 8, 12).toISOString()),
    ...(poste === undefined ? {} : { poste }),
  });

const instantFixture = (heure: number, minute = 0): Instant => new Instant(new Date(2026, 8, 13, heure, minute).toISOString());
