import { dataSelector } from '../../DataSelector';
import { requiredFixture } from '../../RequiredFixture';

const UNE_HEURE_PAR_GRADUATION = 1;

const graduationAt = (graduations: JQuery<HTMLElement>, rang: number): HTMLElement =>
  requiredFixture(graduations[rang], `graduation ${rang} of the frise`);

const traitDe = (graduation: HTMLElement): number => graduation.getBoundingClientRect().left;

const heureLueSur = (graduation: HTMLElement): number =>
  Number.parseInt(
    requiredFixture(graduation.querySelector(dataSelector('anomalie-frise-graduation-heure')), 'hour of a graduation').textContent.trim(),
    10,
  );

const entreDeuxTraits = (graduations: JQuery<HTMLElement>, ecart: number): number => {
  const rang = Math.floor(ecart);
  const avant = traitDe(graduationAt(graduations, rang));
  return rang === ecart ? avant : avant + (ecart - rang) * (traitDe(graduationAt(graduations, rang + 1)) - avant);
};

export const abscisseDeLHeure = (heures: number): Cypress.Chainable<number> =>
  cy
    .get(dataSelector('anomalie-frise-graduation'))
    .then(graduations => entreDeuxTraits(graduations, (heures - heureLueSur(graduationAt(graduations, 0))) / UNE_HEURE_PAR_GRADUATION));

export const abscisseDuDernierTrait = (): Cypress.Chainable<number> =>
  cy.get(dataSelector('anomalie-frise-graduation')).then(graduations => traitDe(graduationAt(graduations, graduations.length - 1)));

export const centreDe = (element: HTMLElement): number => {
  const { left, width } = element.getBoundingClientRect();
  return left + width / 2;
};
