import { requiredFixture } from './RequiredFixture';

interface TouchPointFixture {
  x: number;
  y: number;
}

const dispatchTouchFixture = (type: string, touchPoints: TouchPointFixture[]): Promise<void> =>
  Cypress.automation('remote:debugger:protocol', { command: 'Input.dispatchTouchEvent', params: { type, touchPoints } });

export const holdTouchFixture = (selector: string): void => {
  cy.get(selector).then(element => {
    const rect = requiredFixture(element[0], 'pressed element').getBoundingClientRect();
    const topWindow = requiredFixture(window.top, 'Cypress top window');
    const frame = requiredFixture(topWindow.document.querySelector<HTMLIFrameElement>('iframe.aut-iframe'), 'Cypress application frame');
    const viewport = frame.getBoundingClientRect();
    const scale = viewport.width / frame.clientWidth;
    return dispatchTouchFixture('touchStart', [
      { x: viewport.x + (rect.x + rect.width / 2) * scale, y: viewport.y + (rect.y + rect.height / 2) * scale },
    ]);
  });
};

export const releaseTouchFixture = (): void => {
  cy.then(() => dispatchTouchFixture('touchEnd', []));
};

export const touchFixture = (selector: string): void => {
  holdTouchFixture(selector);
  releaseTouchFixture();
};
