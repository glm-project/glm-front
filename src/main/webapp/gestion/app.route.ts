import { Routes } from '@angular/router';
import { atelierProvider } from './atelier.provider';
import { coutDeRevientProvider } from './cout-de-revient.provider';
import { elementsDeFabricationProvider } from './elements-de-fabrication.provider';
import { operateursProvider } from './operateurs.provider';
import { postesProvider } from './postes.provider';
import { releveDesHeuresProvider } from './releve-des-heures.provider';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./contexts/supervision-atelier/infrastructure/primary/supervision-atelier/supervision-atelier').then(
        m => m.SupervisionAtelier,
      ),
  },
  {
    path: 'atelier',
    loadComponent: () => import('./contexts/atelier/infrastructure/primary/atelier/Atelier').then(m => m.Atelier),
    providers: atelierProvider,
  },
  {
    path: 'moules-et-of',
    loadComponent: () => import('./contexts/element-de-fabrication/infrastructure/primary/moules-et-of/MoulesEtOf').then(m => m.MoulesEtOf),
    providers: elementsDeFabricationProvider,
  },
  {
    path: 'postes-de-travail',
    loadComponent: () => import('./contexts/poste/infrastructure/primary/postes-de-travail/PostesDeTravail').then(m => m.PostesDeTravail),
    providers: postesProvider,
  },
  {
    path: 'operateurs',
    loadComponent: () => import('./contexts/operateur/infrastructure/primary/operateurs/Operateurs').then(m => m.Operateurs),
    providers: operateursProvider,
  },
  {
    path: 'operateurs/:operateur/heures',
    loadComponent: () =>
      import('./contexts/releve-des-heures/infrastructure/primary/synthese-des-heures/SyntheseDesHeures').then(m => m.SyntheseDesHeures),
    providers: releveDesHeuresProvider,
  },
  {
    path: 'couts-de-revient/:element',
    loadComponent: () =>
      import('./contexts/cout-de-revient/infrastructure/primary/cout-de-revient/CoutDeRevientDeLElement').then(
        m => m.CoutDeRevientDeLElement,
      ),
    providers: coutDeRevientProvider,
  },
];
