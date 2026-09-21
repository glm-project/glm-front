import { Routes } from '@angular/router';
import { atelierProvider } from './atelier.provider';
import { Atelier } from './contexts/atelier/infrastructure/primary/atelier/Atelier';
import { CoutDeRevientDeLElement } from './contexts/cout-de-revient/infrastructure/primary/cout-de-revient/CoutDeRevientDeLElement';
import { MoulesEtOf } from './contexts/element-de-fabrication/infrastructure/primary/moules-et-of/MoulesEtOf';
import { Operateurs } from './contexts/operateur/infrastructure/primary/operateurs/Operateurs';
import { PostesDeTravail } from './contexts/poste/infrastructure/primary/postes-de-travail/PostesDeTravail';
import { SyntheseDesHeures } from './contexts/releve-des-heures/infrastructure/primary/synthese-des-heures/SyntheseDesHeures';
import { SupervisionAtelier } from './contexts/supervision-atelier/infrastructure/primary/supervision-atelier/supervision-atelier';
import { coutDeRevientProvider } from './cout-de-revient.provider';
import { elementsDeFabricationProvider } from './elements-de-fabrication.provider';
import { operateursProvider } from './operateurs.provider';
import { postesProvider } from './postes.provider';
import { releveDesHeuresProvider } from './releve-des-heures.provider';

export const routes: Routes = [
  { path: '', component: SupervisionAtelier },
  { path: 'atelier', component: Atelier, providers: atelierProvider },
  { path: 'moules-et-of', component: MoulesEtOf, providers: elementsDeFabricationProvider },
  { path: 'postes-de-travail', component: PostesDeTravail, providers: postesProvider },
  { path: 'operateurs', component: Operateurs, providers: operateursProvider },
  { path: 'operateurs/:operateur/heures', component: SyntheseDesHeures, providers: releveDesHeuresProvider },
  { path: 'couts-de-revient/:element', component: CoutDeRevientDeLElement, providers: coutDeRevientProvider },
];
