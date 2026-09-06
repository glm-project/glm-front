import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { dataSelector } from '@test/utils/DataSelector';
import { ExecutionDePointage, IntentionDePointage, PointageCommand } from '../../../../application/PointageCommand';
import { ElementDePointage, VueDePointage } from '../../../../domain/designation/FenetreOperateur';
import { Pointage } from './pointage';

interface DeferredFixture {
  promise: Promise<void>;
  resolve: () => void;
  reject: () => void;
}

const pointageFixture: VueDePointage = {
  moules: [new ElementDePointage('moule-1015', '1015', false, { categorie: 'TRAVAIL', dureeMs: 8_040_000 })],
  ordresDeFabrication: [
    new ElementDePointage('of-204', '204', false, { categorie: 'NON_CONFORMITE', dureeMs: 1_320_000 }),
    new ElementDePointage('of-generated', 'OF-2026-000042', true, undefined),
  ],
  glmActif: false,
};

describe('Pointage screen', () => {
  let fixture: ComponentFixture<Pointage>;
  let nextExecution: ExecutionDePointage;
  let intentions: IntentionDePointage[];
  let emitted: string[];
  let capture: DeferredFixture;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ providers: [{ provide: ComponentFixtureAutoDetect, useValue: true }] }).compileComponents();
    fixture = TestBed.createComponent(Pointage);
    intentions = [];
    emitted = [];
    capture = deferredFixture();
    nextExecution = { kind: 'CAPTURE', completion: capture.promise };
    const commander: PointageCommand = {
      execute: intention => {
        intentions.push(intention);
        return nextExecution;
      },
    };
    fixture.componentRef.setInput('vue', pointageFixture);
    fixture.componentRef.setInput('commander', commander);
    fixture.componentInstance.pauseRequested.subscribe(() => emitted.push('pause'));
    fixture.componentInstance.repriseRequested.subscribe(() => emitted.push('reprendre'));
    fixture.componentInstance.arretTotalRequested.subscribe(() => emitted.push('tout-arreter'));
  });

  it('should render the two workshop zones, personal states, frozen durations and inactive GLM', async () => {
    await whenRendering();

    thenThePersonalPointageViewIsRendered();
  });

  it('should hide empty zones and light GLM when no element is active', async () => {
    givenAnEmptyWorkshop();

    await whenRendering();

    thenOnlyActiveGlmRemains();
  });

  it('should disable both targets of only the pressed tile until durable acceptance', async () => {
    await whenRendering();

    whenPressing('moule-1015', 'primary-target');
    await whenRendering();
    thenOnlyThePressedTileIsBusy();
    whenPressing('moule-1015', 'secondary-target');
    await whenCaptureSucceeds();

    thenIntentionsAre([{ suiviId: 'moule-1015', cible: 'PRINCIPALE' }]);
    thenEveryTileIsAvailable();
  });

  it('should request a workstation, disable every choice after selection and dismiss after a failed capture', async () => {
    givenAWorkstationChoice();
    await whenRendering();

    whenPressing('of-generated', 'secondary-target');
    await whenRendering();
    thenWorkstationChoiceIsVisible();
    whenChoosing('fraiseuse');
    await whenRendering();
    thenEveryWorkstationChoiceIsDisabled();
    whenChoosing('tour');
    await whenCaptureFails();

    thenWorkstationChoiceIsClosed();
  });

  it('should cancel an uncommitted workstation choice and expose global intentions', async () => {
    givenAWorkstationChoice();
    await whenRendering();

    whenPressing('of-generated', 'primary-target');
    await whenRendering();
    whenCancellingWorkstation();
    whenPressingGlobalActions();
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
    whenPressing('of-generated', 'primary-target');

    givenGlobalGesturesAreUnavailable();
    await whenRendering();

    thenEveryWorkstationChoiceIsDisabled();
  });

  it('should leave a tile available when the command boundary refuses a stale reentry', async () => {
    givenTheNextPointageIsUnavailable();
    await whenRendering();

    whenPressing('moule-1015', 'primary-target');
    await whenRendering();

    thenEveryTileIsAvailable();
  });

  const givenAnEmptyWorkshop = (): void => {
    fixture.componentRef.setInput('vue', { moules: [], ordresDeFabrication: [], glmActif: true });
  };
  const givenGlobalGesturesAreUnavailable = (): void => {
    fixture.componentRef.setInput('gestesDisponibles', false);
  };
  const givenTheNextPointageIsUnavailable = (): void => {
    nextExecution = { kind: 'INDISPONIBLE' };
  };
  const givenAWorkstationChoice = (): void => {
    nextExecution = {
      kind: 'CHOIX_POSTE_REQUIS',
      numero: 'OF-2026-000042',
      postes: [
        { id: 'tour', libelle: 'Tour' },
        { id: 'fraiseuse', libelle: 'Fraiseuse' },
      ],
      choose: () => capture.promise,
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
    capture.reject();
    await capture.promise.catch(() => undefined);
    await Promise.resolve();
    await Promise.resolve();
    await whenRendering();
  };
  const whenPressing = (elementId: string, target: string): void => {
    const tile = requiredElement(root().querySelector(dataSelector(`tile-${elementId}`)), 'tile');
    requiredElement(tile.querySelector<HTMLButtonElement>(dataSelector(target)), 'target').click();
  };
  const whenChoosing = (posteId: string): void => {
    requiredElement(root().querySelector<HTMLButtonElement>(dataSelector(`workstation-${posteId}`)), 'workstation').click();
  };
  const whenCancellingWorkstation = (): void => {
    requiredElement(root().querySelector<HTMLButtonElement>(dataSelector('cancel-workstation')), 'cancel').click();
  };
  const whenPressingGlobalActions = (): void => {
    requiredElement(root().querySelector<HTMLButtonElement>(dataSelector('pause')), 'pause').click();
    requiredElement(root().querySelector<HTMLButtonElement>(dataSelector('resume')), 'resume').click();
    requiredElement(root().querySelector<HTMLButtonElement>(dataSelector('stop-all')), 'stop all').click();
  };
  const thenThePersonalPointageViewIsRendered = (): void => {
    expect(root().querySelector(dataSelector('moules-zone'))).not.toBeNull();
    expect(root().querySelector(dataSelector('of-zone'))).not.toBeNull();
    expect(requiredElement(root().querySelector(dataSelector('tile-of-204')), 'NC tile').textContent).toContain('BON');
    expect(requiredElement(root().querySelector(dataSelector('tile-moule-1015')), 'active tile').textContent).toContain('depuis 2 h 14');
    expect(requiredElement(root().querySelector(dataSelector('tile-of-generated')), 'inactive tile').textContent).toContain('DÉMARRER');
    expect(requiredElement(root().querySelector(dataSelector('glm-band')), 'GLM').classList).not.toContain('glm--active');
  };
  const thenOnlyActiveGlmRemains = (): void => {
    expect(root().querySelector(dataSelector('moules-zone'))).toBeNull();
    expect(root().querySelector(dataSelector('of-zone'))).toBeNull();
    expect(requiredElement(root().querySelector(dataSelector('glm-band')), 'GLM').classList).toContain('glm--active');
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
  const thenWorkstationChoiceIsClosed = (): void => {
    expect(root().querySelector(dataSelector('workstation-dialog'))).toBeNull();
  };
  const thenGlobalIntentionsAreExposed = (): void => {
    expect(emitted).toEqual(['pause', 'reprendre', 'tout-arreter']);
  };
  const targetsFor = (elementId: string): HTMLButtonElement[] => {
    const tile = requiredElement(root().querySelector(dataSelector(`tile-${elementId}`)), 'tile');
    return Array.from(tile.querySelectorAll<HTMLButtonElement>('button'));
  };
  const workstationFor = (posteId: string): HTMLButtonElement =>
    requiredElement(root().querySelector<HTMLButtonElement>(dataSelector(`workstation-${posteId}`)), 'workstation');
  const button = (selector: string): HTMLButtonElement =>
    requiredElement(root().querySelector<HTMLButtonElement>(dataSelector(selector)), selector);
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
});

const requiredElement = <T>(element: T | null, description: string): T => {
  if (element === null) throw new Error(`Missing ${description} fixture.`);
  return element;
};

const deferredFixture = (): DeferredFixture => {
  let resolve: (() => void) | undefined;
  let reject: (() => void) | undefined;
  const promise = new Promise<void>((complete, fail) => {
    resolve = complete;
    reject = () => {
      fail(new Error('disk failure'));
    };
  });
  if (resolve === undefined || reject === undefined) throw new Error('Deferred fixture is not initialized.');
  return { promise, resolve, reject };
};
