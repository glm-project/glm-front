import { Routes } from '@angular/router';
import { PostesDeTravail } from './contexts/poste/infrastructure/primary/postes-de-travail/PostesDeTravail';
import { SupervisionAtelier } from './contexts/supervision-atelier/infrastructure/primary/supervision-atelier/supervision-atelier';
import { postesProvider } from './postes.provider';

export const routes: Routes = [
  { path: '', component: SupervisionAtelier },
  { path: 'postes-de-travail', component: PostesDeTravail, providers: postesProvider },
];
