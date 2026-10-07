import { dataSelector } from '../../DataSelector';
import { requiredFixture } from '../../RequiredFixture';

const HEURES_PAR_JOUR = 24;

const graduationAt = (graduations: JQuery<HTMLElement>, rang: number): HTMLElement =>
  requiredFixture(graduations[rang], `graduation ${rang} of the frise`);

const traitDe = (graduation: HTMLElement): number => graduation.getBoundingClientRect().left;

const heureLueSur = (graduation: HTMLElement): number =>
  Number.parseInt(
    requiredFixture(graduation.querySelector(dataSelector('anomalie-frise-graduation-heure')), 'hour of a graduation').textContent.trim(),
    10,
  );

const heureDuSecondTrait = (premiere: number, seconde: number): number => (seconde > premiere ? seconde : seconde + HEURES_PAR_JOUR);

export const abscisseDeLHeure = (heures: number): Cypress.Chainable<number> =>
  cy.get(dataSelector('anomalie-frise-graduation')).then(graduations => {
    const premier = graduationAt(graduations, 0);
    const second = graduationAt(graduations, 1);
    const heurePremier = heureLueSur(premier);
    const ecartEnHeures = heureDuSecondTrait(heurePremier, heureLueSur(second)) - heurePremier;
    return traitDe(premier) + ((heures - heurePremier) / ecartEnHeures) * (traitDe(second) - traitDe(premier));
  });

export const centreDe = (element: HTMLElement): number => {
  const { left, width } = element.getBoundingClientRect();
  return left + width / 2;
};
