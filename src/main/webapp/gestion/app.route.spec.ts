import { Route } from '@angular/router';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { routes } from './app.route';
import { DossierAnomaliePage } from './contexts/anomalies-de-pointage/infrastructure/primary/dossier-anomalie/DossierAnomaliePage';
import { ListeAnomalies } from './contexts/anomalies-de-pointage/infrastructure/primary/liste-anomalies/ListeAnomalies';
import { Atelier } from './contexts/atelier/infrastructure/primary/atelier/Atelier';
import { CoutDeRevientDeLElement } from './contexts/cout-de-revient/infrastructure/primary/cout-de-revient/CoutDeRevientDeLElement';
import { MoulesEtOf } from './contexts/element-de-fabrication/infrastructure/primary/moules-et-of/MoulesEtOf';
import { Operateurs } from './contexts/operateur/infrastructure/primary/operateurs/Operateurs';
import { PostesDeTravail } from './contexts/poste/infrastructure/primary/postes-de-travail/PostesDeTravail';
import { SyntheseDesHeures } from './contexts/releve-des-heures/infrastructure/primary/synthese-des-heures/SyntheseDesHeures';
import { SupervisionAtelier } from './contexts/supervision-atelier/infrastructure/primary/supervision-atelier/supervision-atelier';

const ECRANS: [string, unknown][] = [
  ['anomalies/:suivi', DossierAnomaliePage],
  ['anomalies', ListeAnomalies],
  ['', SupervisionAtelier],
  ['atelier', Atelier],
  ['moules-et-of', MoulesEtOf],
  ['postes-de-travail', PostesDeTravail],
  ['operateurs', Operateurs],
  ['operateurs/:operateur/heures', SyntheseDesHeures],
  ['couts-de-revient/:element', CoutDeRevientDeLElement],
];

const routesEcrans = routes.flatMap(
  route => route.children?.map(enfant => ({ ...enfant, path: [route.path, enfant.path].filter(Boolean).join('/') })) ?? [route],
);

describe('Gestion routes', () => {
  it.each(ECRANS)('should load the screen of the %p route on demand', async (chemin, ecran) => {
    const chargeur = givenLeChargeurDe(chemin);

    const charge = await chargeur();

    expect(charge).toBe(ecran);
  });

  it('should declare every screen on demand, so that none of them weighs on the first paint', () => {
    const eagers = routesEcrans.filter(route => route.component !== undefined);

    expect(eagers).toEqual([]);
  });

  it('should no longer serve the former conflits path, without redirection', () => {
    const anciennes = routes.filter(route => route.path === 'conflits' || route.redirectTo !== undefined);

    expect(anciennes).toEqual([]);
  });

  it('should name every screen the application suite drives', () => {
    expect(routesEcrans.map(route => route.path)).toEqual(ECRANS.map(([chemin]) => chemin));
  });

  const givenLeChargeurDe = (chemin: string): NonNullable<Route['loadComponent']> => {
    const route = routesEcrans.find(candidate => candidate.path === chemin);
    return requiredFixture(requiredFixture(route, `route ${chemin}`).loadComponent, `chargeur de la route ${chemin}`);
  };
});
