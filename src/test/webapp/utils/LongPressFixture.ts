import { requiredFixture } from './RequiredFixture';

export const CONFIRMATION_PRESS_FIXTURE_MS = 1_500;

type ElapseFixture = (milliseconds: number) => void;

const realTimeFixture: ElapseFixture = milliseconds => {
  cy.wait(milliseconds);
};

export const controlledTimeFixture: ElapseFixture = milliseconds => {
  cy.tick(milliseconds);
};

export const longPressFixture = (target: Cypress.Chainable<JQuery<HTMLElement>>, elapse: ElapseFixture = realTimeFixture): void => {
  target.trigger('pointerdown').then(pressed => {
    elapse(CONFIRMATION_PRESS_FIXTURE_MS);
    cy.then(() => {
      requiredFixture(pressed[0], 'held target').dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });
  });
};
