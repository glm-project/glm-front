import { requiredFixture } from './RequiredFixture';

interface TouchPointFixture {
  x: number;
  y: number;
}

const SLIDE_STEPS_FIXTURE = 10;

const dispatchTouchFixture = (type: string, touchPoints: TouchPointFixture[]): Promise<void> =>
  Cypress.automation('remote:debugger:protocol', { command: 'Input.dispatchTouchEvent', params: { type, touchPoints } });

const centerOfFixture = (element: HTMLElement): TouchPointFixture => {
  const rect = element.getBoundingClientRect();
  const topWindow = requiredFixture(window.top, 'Cypress top window');
  const frame = requiredFixture(topWindow.document.querySelector<HTMLIFrameElement>('iframe.aut-iframe'), 'Cypress application frame');
  const viewport = frame.getBoundingClientRect();
  const scale = viewport.width / frame.clientWidth;
  return { x: viewport.x + (rect.x + rect.width / 2) * scale, y: viewport.y + (rect.y + rect.height / 2) * scale };
};

export const holdTouchFixture = (selector: string): void => {
  cy.get(selector).then(element => dispatchTouchFixture('touchStart', [centerOfFixture(requiredFixture(element[0], 'pressed element'))]));
};

export const slideTouchFixture = (selector: string, distance: number): void => {
  cy.get(selector).then(async element => {
    const start = centerOfFixture(requiredFixture(element[0], 'slid element'));
    for (let step = 1; step <= SLIDE_STEPS_FIXTURE; step += 1) {
      await dispatchTouchFixture('touchMove', [{ x: start.x, y: start.y + (distance * step) / SLIDE_STEPS_FIXTURE }]);
    }
  });
};

export const releaseTouchFixture = (): void => {
  cy.then(() => dispatchTouchFixture('touchEnd', []));
};

export const touchFixture = (selector: string): void => {
  holdTouchFixture(selector);
  releaseTouchFixture();
};
