import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { Icon } from '@/app/shared/design-system/infrastructure/primary/icon/icon';
import { Component, inject, input, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface Destination {
  readonly route: string;
  readonly libelle: string;
  readonly selecteur: string;
  readonly exacte: boolean;
}

const DESTINATIONS: readonly Destination[] = [
  { route: '/', libelle: 'Supervision', selecteur: 'gestion-navigation-supervision', exacte: true },
  { route: '/atelier', libelle: 'Atelier', selecteur: 'gestion-navigation-atelier', exacte: false },
  { route: '/moules-et-of', libelle: 'Moules et OF', selecteur: 'gestion-navigation-elements', exacte: false },
  { route: '/postes-de-travail', libelle: 'Postes de travail', selecteur: 'gestion-navigation-postes', exacte: false },
  { route: '/operateurs', libelle: 'Opérateurs', selecteur: 'gestion-navigation-operateurs', exacte: false },
];

const LIBELLES_EN_TETE = {
  produit: 'Gestion d’atelier',
  accueil: (nom: string): string => `${nom}, gestion d’atelier : supervision`,
  navigation: 'Navigation principale',
  menu: 'Menu',
  deconnexion: 'Se déconnecter',
} as const;

@Component({
  selector: 'glm-gestion-header',
  host: { 'data-selector': 'gestion-header' },
  templateUrl: './header.html',
  styleUrl: './header.css',
  imports: [Icon, RouterLink, RouterLinkActive],
})
export class GestionHeader {
  readonly heading = input.required<string>();
  private readonly authentication = inject(AuthenticationPort);

  protected readonly libelles = LIBELLES_EN_TETE;
  protected readonly destinations = DESTINATIONS;
  protected readonly menuOuvert = signal(false);

  protected basculerMenu(): void {
    this.menuOuvert.update(ouvert => !ouvert);
  }

  protected fermerMenu(): void {
    this.menuOuvert.set(false);
  }

  logout(): void {
    this.authentication.logout();
  }
}
