import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { DeferredFixture } from '@test/unit/fixtures/DeferredFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { ExecutionDePointage, IntentionDePointage, PointageCommand } from '../../../../application/PointageCommand';
import { CommandesGlobales } from '../../../../domain/designation/fenetre-operateur/CommandesGlobales';
import { ElementDePointage, VueDePointage } from '../../../../domain/designation/fenetre-operateur/VueDePointage';
import { NumeroDElement } from '../../../../domain/designation/NumeroDElement';
import { Pointage } from './pointage';

const CONFIRMATION_PRESS_FIXTURE_MS = 1_000;

const pointageFixture: VueDePointage = {
  conflits: [],
  moules: [new ElementDePointage('moule-1015', NumeroDElement.assigned('1015'), { categorie: 'TRAVAIL', dureeMs: 8_040_000 })],
  ordresDeFabrication: [
    new ElementDePointage('of-204', NumeroDElement.assigned('204'), { categorie: 'NON_CONFORMITE', dureeMs: 1_320_000 }),
    new ElementDePointage('of-generated', NumeroDElement.generated('OF-2026-000042'), undefined),
  ],
};

describe('Pointage screen', () => {
  let fixture: ComponentFixture<Pointage>;
  let nextExecution: ExecutionDePointage;
  let intentions: IntentionDePointage[];
  let emitted: string[];
  let chosenWorkstations: string[];
  let capture: DeferredFixture<void>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await TestBed.configureTestingModule({ providers: [{ provide: ComponentFixtureAutoDetect, useValue: true }] }).compileComponents();
    fixture = TestBed.createComponent(Pointage);
    intentions = [];
    emitted = [];
    chosenWorkstations = [];
    capture = new DeferredFixture<void>();
    nextExecution = { kind: 'CAPTURE', completion: capture.promise };
    const commander: PointageCommand = {
      execute: intention => {
        intentions.push(intention);
        return nextExecution;
      },
    };
    fixture.componentRef.setInput('vue', pointageFixture);
    fixture.componentRef.setInput('commander', commander);
    fixture.componentRef.setInput('commandesGlobales', commandesGlobalesFixture({ activiteEnCours: true, pauseEnCours: true }));
    fixture.componentInstance.pauseRequested.subscribe(() => emitted.push('pause'));
    fixture.componentInstance.repriseRequested.subscribe(() => emitted.push('reprendre'));
    fixture.componentInstance.arretTotalRequested.subscribe(() => emitted.push('tout-arreter'));
    fixture.componentInstance.mesPointagesRequested.subscribe(() => emitted.push('mes-pointages'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should state the conflict and the possible new opening even without any current activity', async () => {
    givenAConflictWithoutCurrentActivity();

    await whenRendering();

    thenConflictIsExplainedWithoutDuration();
  });

  it('should declare no tile intention before its target has been held for one second', async () => {
    await whenRendering();
    whenPressingDown('moule-1015', 'primary-target');
    whenTimePasses(999);

    thenIntentionsAre([]);
  });

  it('should declare the tile intention once its target has been held for one second', async () => {
    await whenRendering();
    whenPressingDown('moule-1015', 'primary-target');
    whenTimePasses(1_000);

    thenIntentionsAre([{ suiviId: 'moule-1015', cible: 'PRINCIPALE' }]);
  });

  it.each(['primary-target', 'secondary-target'])('should declare no tile intention on a brief tap of its %s', async target => {
    await whenRendering();
    whenTapping('moule-1015', target);
    whenTimePasses(5_000);

    thenIntentionsAre([]);
  });

  it('should declare no tile intention when its target is released before one second', async () => {
    await whenRendering();
    whenPressingDown('moule-1015', 'primary-target');
    whenTimePasses(500);
    whenReleasing('moule-1015', 'primary-target');
    whenTimePasses(5_000);

    thenIntentionsAre([]);
  });

  it.each(['pointercancel', 'pointerleave'])('should declare no tile intention when the hold is interrupted by %s', async interruption => {
    await whenRendering();
    whenPressingDown('moule-1015', 'primary-target');
    whenTheHoldIsInterruptedBy('moule-1015', 'primary-target', interruption);
    whenTimePasses(1_000);

    thenIntentionsAre([]);
  });

  it('should declare no tile intention when gestures become unavailable during the hold', async () => {
    await whenRendering();
    whenPressingDown('moule-1015', 'primary-target');
    givenGlobalGesturesAreUnavailable();
    await whenRendering();
    whenTimePasses(1_000);

    thenIntentionsAre([]);
  });

  it('should declare no tile intention when the hold began while gestures were unavailable', async () => {
    givenGlobalGesturesAreUnavailable();
    await whenRendering();
    whenPressingDown('moule-1015', 'primary-target');
    givenGlobalGesturesAreAvailable();
    await whenRendering();
    whenTimePasses(1_000);

    thenIntentionsAre([]);
  });

  it.each(['pause', 'resume', 'stop-all'])('should expose no global intention on a brief tap of the %s command', async selector => {
    await whenRendering();
    whenTappingGlobalCommand(selector);
    whenTimePasses(5_000);

    thenNoGlobalIntentionIsExposed();
  });

  it('should expose no pause intention before its command has been held for one second', async () => {
    await whenRendering();
    whenPressingDownGlobalCommand('pause');
    whenTimePasses(999);

    thenNoGlobalIntentionIsExposed();
  });

  it('should request my pointages on a brief tap, without holding', async () => {
    await whenRendering();

    whenTappingGlobalCommand('show-mes-pointages');

    thenMyPointagesAreRequested();
  });

  it('should choose no workstation on a brief tap', async () => {
    givenAWorkstationChoice();
    await whenRendering();
    whenHolding('of-generated', 'secondary-target');
    await whenRendering();
    whenTappingWorkstation('fraiseuse');
    whenTimePasses(5_000);
    await whenRendering();

    thenWorkstationChoiceIsVisible();
    thenEveryWorkstationChoiceIsAvailable();
  });

  it('should choose no workstation before its choice has been held for one second', async () => {
    givenAWorkstationChoice();
    await whenRendering();
    whenHolding('of-generated', 'secondary-target');
    await whenRendering();
    whenPressingDownWorkstation('fraiseuse');
    whenTimePasses(999);
    await whenRendering();

    thenEveryWorkstationChoiceIsAvailable();
  });

  it('should declare a single tile intention when both targets of a tile are held together', async () => {
    await whenRendering();
    whenPressingDown('moule-1015', 'primary-target');
    whenPressingDown('moule-1015', 'secondary-target');
    whenTimePasses(1_000);

    thenIntentionsAre([{ suiviId: 'moule-1015', cible: 'PRINCIPALE' }]);
  });

  it('should choose a single workstation when two choices are held together', async () => {
    givenAWorkstationChoice();
    await whenRendering();
    whenHolding('of-generated', 'secondary-target');
    await whenRendering();
    whenPressingDownWorkstation('tour');
    whenPressingDownWorkstation('fraiseuse');
    whenTimePasses(1_000);
    await whenRendering();

    thenChosenWorkstationsAre(['tour']);
  });

  it('should keep the context menu closed while a gesture target is held', async () => {
    await whenRendering();
    whenPressingDown('moule-1015', 'primary-target');
    const contextMenu = whenTheBrowserRequestsAContextMenu('moule-1015', 'primary-target');

    thenTheContextMenuIsSuppressed(contextMenu);
  });

  it('should render the two workshop zones, personal states and frozen durations', async () => {
    await whenRendering();

    thenThePersonalPointageViewIsRendered();
  });

  it('should hide empty zones when no element is active', async () => {
    givenAnEmptyWorkshop();

    await whenRendering();

    thenNoZoneIsRendered();
  });

  it('should disable both targets of only the pressed tile during acceptance', async () => {
    await whenRendering();
    whenHolding('moule-1015', 'primary-target');
    await whenRendering();

    thenOnlyThePressedTileIsBusy();
  });

  it('should ignore a second target press and release the tile after acceptance', async () => {
    await whenRendering();
    whenHolding('moule-1015', 'primary-target');
    await whenRendering();
    whenHolding('moule-1015', 'secondary-target');
    await whenCaptureSucceeds();

    thenIntentionsAre([{ suiviId: 'moule-1015', cible: 'PRINCIPALE' }]);
    thenEveryTileIsAvailable();
  });

  it('should request a workstation when an activity requires a choice', async () => {
    givenAWorkstationChoice();
    await whenRendering();
    whenHolding('of-generated', 'secondary-target');
    await whenRendering();

    thenWorkstationChoiceIsVisible();
  });

  it('should disable workstation choices and cancellation during acceptance', async () => {
    givenAWorkstationChoice();
    await whenRendering();
    whenHolding('of-generated', 'secondary-target');
    await whenRendering();
    whenChoosing('fraiseuse');
    await whenRendering();

    thenEveryWorkstationChoiceIsDisabled();
    thenCancellingWorkstationIsDisabled();
  });

  it('should dismiss workstation choices after acceptance fails', async () => {
    givenAWorkstationChoice();
    await whenRendering();
    whenHolding('of-generated', 'secondary-target');
    await whenRendering();
    whenChoosing('fraiseuse');
    await whenRendering();
    whenChoosing('tour');
    await whenCaptureFails();

    thenWorkstationChoiceIsClosed();
  });

  it('should re-enable workstation choices when retrying after failure', async () => {
    givenAWorkstationChoice();
    await whenRendering();
    whenHolding('of-generated', 'secondary-target');
    await whenRendering();
    whenChoosing('fraiseuse');
    await whenRendering();
    whenChoosing('tour');
    await whenCaptureFails();
    whenHolding('of-generated', 'secondary-target');
    await whenRendering();

    thenWorkstationChoiceIsVisible();
    thenEveryWorkstationChoiceIsAvailable();
  });

  it('should cancel an uncommitted workstation choice and expose global intentions', async () => {
    givenAWorkstationChoice();
    await whenRendering();

    whenHolding('of-generated', 'primary-target');
    await whenRendering();
    whenCancellingWorkstation();
    whenHoldingGlobalActions();
    await whenRendering();

    thenWorkstationChoiceIsClosed();
    thenGlobalIntentionsAreExposed();
  });

  it('should disable every tile and global command while global gestures are unavailable', async () => {
    givenGlobalGesturesAreUnavailable();

    await whenRendering();

    expect(targetsFor('moule-1015').every(target => target.disabled)).toBe(true);
    expect(['pause', 'resume', 'stop-all'].map(selector => button(selector).disabled)).toEqual([true, true, true]);
  });

  it('should disable every prepared workstation choice while global gestures are unavailable', async () => {
    givenAWorkstationChoice();
    await whenRendering();
    whenHolding('of-generated', 'primary-target');

    givenGlobalGesturesAreUnavailable();
    await whenRendering();

    thenEveryWorkstationChoiceIsDisabled();
  });

  it.each<[string, ConstatDActivitesFixture, readonly boolean[]]>([
    ['nothing to suspend nor to reopen', { activiteEnCours: false, pauseEnCours: false }, [true, true, false]],
    ['a personal activity to suspend', { activiteEnCours: true, pauseEnCours: false }, [false, true, false]],
    ['a pause in progress to reopen', { activiteEnCours: false, pauseEnCours: true }, [true, false, false]],
  ])('should disable PAUSE, REPRENDRE and TOUT ARRÊTER for an operator with %s', async (_name, constat, expectedDisabled) => {
    givenGlobalCommands(constat);
    await whenRendering();

    thenGlobalCommandsDisabledStatesAre(expectedDisabled);
  });

  it('should emit no gesture when a command illegal for the current activities is pressed', async () => {
    givenGlobalCommands({ activiteEnCours: true, pauseEnCours: false });
    await whenRendering();

    whenHoldingGlobalCommand('resume');
    await whenRendering();

    thenNoGlobalIntentionIsExposed();
  });

  it('should leave a tile available when the command boundary refuses a stale reentry', async () => {
    givenTheNextPointageIsUnavailable();
    await whenRendering();

    whenHolding('moule-1015', 'primary-target');
    await whenRendering();

    thenEveryTileIsAvailable();
  });

  const givenAnEmptyWorkshop = (): void => {
    fixture.componentRef.setInput('vue', { conflits: [], moules: [], ordresDeFabrication: [] });
  };
  const givenGlobalGesturesAreUnavailable = (): void => {
    fixture.componentRef.setInput('gestesDisponibles', false);
  };
  const givenGlobalGesturesAreAvailable = (): void => {
    fixture.componentRef.setInput('gestesDisponibles', true);
  };
  const givenGlobalCommands = (constat: ConstatDActivitesFixture): void => {
    fixture.componentRef.setInput('commandesGlobales', commandesGlobalesFixture(constat));
  };
  const givenTheNextPointageIsUnavailable = (): void => {
    nextExecution = { kind: 'INDISPONIBLE' };
  };
  const givenAWorkstationChoice = (): void => {
    nextExecution = {
      kind: 'CHOIX_POSTE_REQUIS',
      numero: NumeroDElement.assigned('OF-2026-000042'),
      postes: [
        { id: 'tour', libelle: 'Tour' },
        { id: 'fraiseuse', libelle: 'Fraiseuse' },
      ],
      choose: posteId => {
        chosenWorkstations.push(posteId);
        return capture.promise;
      },
    };
  };
  const whenRendering = (): Promise<void> => fixture.whenStable();
  const whenCaptureSucceeds = async (): Promise<void> => {
    capture.resolve();
    await capture.promise;
    await Promise.resolve();
    await whenRendering();
  };
  const whenCaptureFails = async (): Promise<void> => {
    capture.reject(new Error('disk failure'));
    await capture.promise.catch(() => undefined);
    await Promise.resolve();
    await Promise.resolve();
    await whenRendering();
  };
  const whenPressingDown = (elementId: string, target: string): void => {
    pressDown(targetOf(elementId, target));
  };
  const whenReleasing = (elementId: string, target: string): void => {
    release(targetOf(elementId, target));
  };
  const whenTheHoldIsInterruptedBy = (elementId: string, target: string, interruption: string): void => {
    targetOf(elementId, target).dispatchEvent(new Event(interruption, { bubbles: true }));
  };
  const whenTapping = (elementId: string, target: string): void => {
    tap(targetOf(elementId, target));
  };
  const whenHolding = (elementId: string, target: string): void => {
    hold(targetOf(elementId, target));
  };
  const whenTimePasses = (milliseconds: number): void => {
    vi.advanceTimersByTime(milliseconds);
  };
  const whenChoosing = (posteId: string): void => {
    hold(workstationFor(posteId));
  };
  const whenTappingWorkstation = (posteId: string): void => {
    tap(workstationFor(posteId));
  };
  const whenPressingDownWorkstation = (posteId: string): void => {
    pressDown(workstationFor(posteId));
  };
  const whenTheBrowserRequestsAContextMenu = (elementId: string, target: string): Event => {
    const contextMenu = new Event('contextmenu', { bubbles: true, cancelable: true });
    targetOf(elementId, target).dispatchEvent(contextMenu);
    return contextMenu;
  };
  const whenCancellingWorkstation = (): void => {
    requiredElement(root().querySelector<HTMLButtonElement>(dataSelector('cancel-workstation')), 'cancel').click();
  };
  const whenHoldingGlobalActions = (): void => {
    whenHoldingGlobalCommand('pause');
    whenHoldingGlobalCommand('resume');
    whenHoldingGlobalCommand('stop-all');
  };
  const whenPressingDownGlobalCommand = (selector: string): void => {
    pressDown(button(selector));
  };
  const whenHoldingGlobalCommand = (selector: string): void => {
    hold(button(selector));
  };
  const whenTappingGlobalCommand = (selector: string): void => {
    tap(button(selector));
  };
  const pressDown = (pressed: HTMLElement): void => {
    pressed.dispatchEvent(new Event('pointerdown', { bubbles: true }));
  };
  const release = (pressed: HTMLElement): void => {
    pressed.dispatchEvent(new Event('pointerup', { bubbles: true }));
  };
  const tap = (pressed: HTMLElement): void => {
    pressDown(pressed);
    release(pressed);
    pressed.click();
  };
  const hold = (pressed: HTMLElement): void => {
    pressDown(pressed);
    whenTimePasses(CONFIRMATION_PRESS_FIXTURE_MS);
    release(pressed);
  };
  const thenThePersonalPointageViewIsRendered = (): void => {
    expect(root().querySelector(dataSelector('moules-zone'))).not.toBeNull();
    expect(root().querySelector(dataSelector('of-zone'))).not.toBeNull();
    expect(requiredElement(root().querySelector(dataSelector('tile-of-204')), 'NC tile').textContent).toContain('BON');
    expect(requiredElement(root().querySelector(dataSelector('tile-moule-1015')), 'active tile').textContent).toContain('depuis 2 h 14');
    expect(requiredElement(root().querySelector(dataSelector('tile-of-generated')), 'inactive tile').textContent).toContain('DÉMARRER');
  };
  const thenNoZoneIsRendered = (): void => {
    expect(root().querySelector(dataSelector('moules-zone'))).toBeNull();
    expect(root().querySelector(dataSelector('of-zone'))).toBeNull();
  };
  const thenOnlyThePressedTileIsBusy = (): void => {
    expect(targetsFor('moule-1015').every(target => target.disabled)).toBe(true);
    expect(targetsFor('of-204').every(target => !target.disabled)).toBe(true);
  };
  const thenEveryTileIsAvailable = (): void => {
    expect(targetsFor('moule-1015').every(target => !target.disabled)).toBe(true);
  };
  const thenIntentionsAre = (expected: IntentionDePointage[]): void => {
    expect(intentions).toEqual(expected);
  };
  const thenWorkstationChoiceIsVisible = (): void => {
    const dialog = requiredElement(root().querySelector(dataSelector('workstation-dialog')), 'workstation dialog');
    expect(dialog.textContent).toContain('Sur quel poste ?');
    expect(dialog.textContent).toContain('Élément OF-2026-000042');
    expect(dialog.textContent).not.toContain('of-generated');
  };
  const thenEveryWorkstationChoiceIsDisabled = (): void => {
    expect(['tour', 'fraiseuse'].map(poste => workstationFor(poste).disabled)).toEqual([true, true]);
  };
  const thenCancellingWorkstationIsDisabled = (): void => {
    expect(button('cancel-workstation').disabled).toBe(true);
  };
  const thenEveryWorkstationChoiceIsAvailable = (): void => {
    expect(['tour', 'fraiseuse'].map(poste => workstationFor(poste).disabled)).toEqual([false, false]);
    expect(button('cancel-workstation').disabled).toBe(false);
  };
  const thenWorkstationChoiceIsClosed = (): void => {
    expect(root().querySelector(dataSelector('workstation-dialog'))).toBeNull();
  };
  const thenGlobalIntentionsAreExposed = (): void => {
    expect(emitted).toEqual(['pause', 'reprendre', 'tout-arreter']);
  };
  const thenMyPointagesAreRequested = (): void => {
    expect(emitted).toEqual(['mes-pointages']);
  };
  const thenNoGlobalIntentionIsExposed = (): void => {
    expect(emitted).toEqual([]);
  };
  const thenChosenWorkstationsAre = (expected: string[]): void => {
    expect(chosenWorkstations).toEqual(expected);
  };
  const thenTheContextMenuIsSuppressed = (contextMenu: Event): void => {
    expect(contextMenu.defaultPrevented).toBe(true);
  };
  const thenGlobalCommandsDisabledStatesAre = (expected: readonly boolean[]): void => {
    expect(['pause', 'resume', 'stop-all'].map(selector => button(selector).disabled)).toEqual(expected);
  };
  const targetOf = (elementId: string, target: string): HTMLButtonElement => {
    const tile = requiredElement(root().querySelector(dataSelector(`tile-${elementId}`)), 'tile');
    return requiredElement(tile.querySelector<HTMLButtonElement>(dataSelector(target)), 'target');
  };
  const targetsFor = (elementId: string): HTMLButtonElement[] => {
    const tile = requiredElement(root().querySelector(dataSelector(`tile-${elementId}`)), 'tile');
    return Array.from(tile.querySelectorAll<HTMLButtonElement>('button'));
  };
  const workstationFor = (posteId: string): HTMLButtonElement =>
    requiredElement(root().querySelector<HTMLButtonElement>(dataSelector(`workstation-${posteId}`)), 'workstation');
  const button = (selector: string): HTMLButtonElement =>
    requiredElement(root().querySelector<HTMLButtonElement>(dataSelector(selector)), selector);
  const givenAConflictWithoutCurrentActivity = (): void => {
    fixture.componentRef.setInput('vue', {
      moules: [new ElementDePointage('piece', NumeroDElement.assigned('1015'), undefined)],
      ordresDeFabrication: [],
      conflits: [{ id: 'piece', numero: NumeroDElement.assigned('1015') }],
    } satisfies VueDePointage);
  };
  const thenConflictIsExplainedWithoutDuration = (): void => {
    const notice = root().querySelector(dataSelector('pointage-conflict-piece'));
    expect(notice?.textContent).toContain('1015');
    expect(notice?.textContent).toContain('En conflit — nouvelle ouverture possible');
    expect(root().querySelector(dataSelector('duration'))).toBeNull();
  };
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
});

interface ConstatDActivitesFixture {
  readonly activiteEnCours: boolean;
  readonly pauseEnCours: boolean;
}

const commandesGlobalesFixture = (constat: ConstatDActivitesFixture): CommandesGlobales => new CommandesGlobales(constat);

const requiredElement = <T>(element: T | null, description: string): T => {
  if (element === null) throw new Error(`Missing ${description} fixture.`);
  return element;
};
