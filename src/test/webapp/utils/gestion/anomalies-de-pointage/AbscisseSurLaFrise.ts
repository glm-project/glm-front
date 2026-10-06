import { dataSelector } from '../../DataSelector';
import { requiredFixture } from '../../RequiredFixture';

const UNE_HEURE_PAR_GRADUATION = 1;

const graduationAt = (graduations: JQuery<HTMLElement>, rang: number): HTMLElement =>
  requiredFixture(graduations[rang], `graduation ${rang} of the frise`);

const gaucheEnPourcentage = (graduation: HTMLElement): number => Number.parseFloat(graduation.style.left);

const heureLueSur = (graduation: HTMLElement): number =>
  Number.parseInt(
    requiredFixture(graduation.querySelector(dataSelector('anomalie-frise-graduation-heure')), 'hour of a graduation').textContent.trim(),
    10,
  );

export const abscisseDeLHeureLueSurLesGraduations = (heures: number, largeur: number): Cypress.Chainable<number> =>
  cy.get(dataSelector('anomalie-frise-graduation')).then(graduations => {
    const premiere = graduationAt(graduations, 0);
    const ecart = (heures - heureLueSur(premiere)) / UNE_HEURE_PAR_GRADUATION;
    const rang = Math.floor(ecart);
    const avant = gaucheEnPourcentage(graduationAt(graduations, rang));
    const apres = gaucheEnPourcentage(graduationAt(graduations, rang + 1));
    return (largeur * (avant + (ecart - rang) * (apres - avant))) / 100;
  });
