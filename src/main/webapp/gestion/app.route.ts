import { Routes } from '@angular/router';
import { atelierProvider } from './atelier.provider';
import { Atelier } from './contexts/atelier/infrastructure/primary/atelier/Atelier';
import { MoulesEtOf } from './contexts/element-de-fabrication/infrastructure/primary/moules-et-of/MoulesEtOf';
import { Operateurs } from './contexts/operateur/infrastructure/primary/operateurs/Operateurs';
import { PostesDeTravail } from './contexts/poste/infrastructure/primary/postes-de-travail/PostesDeTravail';
import { SupervisionAtelier } from './contexts/supervision-atelier/infrastructure/primary/supervision-atelier/supervision-atelier';
import { elementsDeFabricationProvider } from './elements-de-fabrication.provider';
import { operateursProvider } from './operateurs.provider';
import { postesProvider } from './postes.provider';

export const routes: Routes = [
  { path: '', component: SupervisionAtelier },
  { path: 'atelier', component: Atelier, providers: atelierProvider },
  { path: 'moules-et-of', component: MoulesEtOf, providers: elementsDeFabricationProvider },
  { path: 'postes-de-travail', component: PostesDeTravail, providers: postesProvider },
  { path: 'operateurs', component: Operateurs, providers: operateursProvider },
];
