import { Route } from '@angular/router';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { routes } from './app.route';
import { Atelier } from './contexts/atelier/infrastructure/primary/atelier/Atelier';
import { CoutDeRevientDeLElement } from './contexts/cout-de-revient/infrastructure/primary/cout-de-revient/CoutDeRevientDeLElement';
import { MoulesEtOf } from './contexts/element-de-fabrication/infrastructure/primary/moules-et-of/MoulesEtOf';
import { Operateurs } from './contexts/operateur/infrastructure/primary/operateurs/Operateurs';
import { PostesDeTravail } from './contexts/poste/infrastructure/primary/postes-de-travail/PostesDeTravail';
import { SyntheseDesHeures } from './contexts/releve-des-heures/infrastructure/primary/synthese-des-heures/SyntheseDesHeures';
import { SupervisionAtelier } from './contexts/supervision-atelier/infrastructure/primary/supervision-atelier/supervision-atelier';

/**
 * Chaque écran est chargé à la demande (ADR 0039). Un `import()` mal recopié désignerait le mauvais écran sans
 * que rien ne le dise à la compilation : ces scénarios appellent chaque chargeur et vérifient ce qu'il rend.
 * Qu'une URL monte bien sa vue reste la charge de la suite application, seule à faire tourner le routeur.
 */
const ECRANS: [string, unknown][] = [
  ['', SupervisionAtelier],
  ['atelier', Atelier],
  ['moules-et-of', MoulesEtOf],
  ['postes-de-travail', PostesDeTravail],
  ['operateurs', Operateurs],
  ['operateurs/:operateur/heures', SyntheseDesHeures],
  ['couts-de-revient/:element', CoutDeRevientDeLElement],
];

describe('Gestion routes', () => {
  it.each(ECRANS)('should load the screen of the %p route on demand', async (chemin, ecran) => {
    const chargeur = givenLeChargeurDe(chemin);

    const charge = await chargeur();

    expect(charge).toBe(ecran);
  });

  it('should declare every screen on demand, so that none of them weighs on the first paint', () => {
    const eagers = routes.filter(route => route.component !== undefined);

    expect(eagers).toEqual([]);
  });

  it('should name every screen the application suite drives', () => {
    expect(routes.map(route => route.path)).toEqual(ECRANS.map(([chemin]) => chemin));
  });

  const givenLeChargeurDe = (chemin: string): NonNullable<Route['loadComponent']> => {
    const route = routes.find(candidate => candidate.path === chemin);
    return requiredFixture(requiredFixture(route, `route ${chemin}`).loadComponent, `chargeur de la route ${chemin}`);
  };
});
