import { Routes } from '@angular/router';
import { anomaliesDePointageProvider } from './anomalies-de-pointage.provider';
import { atelierProvider } from './atelier.provider';
import { coutDeRevientProvider } from './cout-de-revient.provider';
import { elementsDeFabricationProvider } from './elements-de-fabrication.provider';
import { operateursProvider } from './operateurs.provider';
import { parametrageProvider } from './parametrage.provider';
import { postesProvider } from './postes.provider';
import { releveDesHeuresProvider } from './releve-des-heures.provider';
import { reservedToGestionnaire } from './shared/authentication/infrastructure/primary/reserved-to-gestionnaire.guard';
import { supervisionAtelierProvider } from './supervision-atelier.provider';

export const routes: Routes = [
  {
    path: 'anomalies',
    canMatch: [reservedToGestionnaire],
    providers: anomaliesDePointageProvider,
    children: [
      {
        path: ':suivi',
        loadComponent: () =>
          import('./contexts/anomalies-de-pointage/infrastructure/primary/dossier-anomalie/DossierAnomaliePage').then(
            m => m.DossierAnomaliePage,
          ),
      },
      {
        path: '',
        loadComponent: () =>
          import('./contexts/anomalies-de-pointage/infrastructure/primary/liste-anomalies/ListeAnomalies').then(m => m.ListeAnomalies),
      },
    ],
  },
  {
    path: '',
    providers: supervisionAtelierProvider,
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
    path: 'produits',
    loadComponent: () => import('./contexts/element-de-fabrication/infrastructure/primary/produits/Produits').then(m => m.Produits),
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
  {
    path: 'parametres',
    canMatch: [reservedToGestionnaire],
    loadComponent: () => import('./contexts/parametrage/infrastructure/primary/parametres/Parametres').then(m => m.Parametres),
    providers: parametrageProvider,
  },
];
