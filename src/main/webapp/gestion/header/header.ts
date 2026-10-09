import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { Icon } from '@/app/shared/design-system/infrastructure/primary/icon/icon';
import { RolesPort } from '@/gestion/shared/authentication/domain/RolesPort';
import { isReservedToGestionnaire } from '@/gestion/shared/authentication/infrastructure/primary/gestionnaire';
import { MarqueGlm } from '@/gestion/shared/design-system/infrastructure/primary/marque-glm/MarqueGlm';
import { Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { from } from 'rxjs';

interface Destination {
  readonly route: string;
  readonly libelle: string;
  readonly selecteur: string;
  readonly exacte: boolean;
  readonly reserveeAuGestionnaire: boolean;
}

const DESTINATIONS: readonly Destination[] = [
  { route: '/', libelle: 'Supervision', selecteur: 'gestion-navigation-supervision', exacte: true, reserveeAuGestionnaire: false },
  { route: '/atelier', libelle: 'Atelier', selecteur: 'gestion-navigation-atelier', exacte: false, reserveeAuGestionnaire: false },
  {
    route: '/produits',
    libelle: 'Produits',
    selecteur: 'gestion-navigation-elements',
    exacte: false,
    reserveeAuGestionnaire: false,
  },
  {
    route: '/postes-de-travail',
    libelle: 'Postes de travail',
    selecteur: 'gestion-navigation-postes',
    exacte: false,
    reserveeAuGestionnaire: false,
  },
  { route: '/operateurs', libelle: 'Opérateurs', selecteur: 'gestion-navigation-operateurs', exacte: false, reserveeAuGestionnaire: false },
  { route: '/anomalies', libelle: 'Anomalies', selecteur: 'gestion-navigation-anomalies', exacte: false, reserveeAuGestionnaire: true },
];

const LIBELLES_EN_TETE = {
  produit: 'Gestion d’atelier',
  accueil: (nom: string): string => `${nom}, gestion d’atelier : supervision`,
  navigation: 'Navigation principale',
  menu: 'Menu',
  deconnexion: 'Se déconnecter',
  parametres: 'Paramètres',
} as const;

@Component({
  selector: 'glm-gestion-header',
  host: { 'data-selector': 'gestion-header' },
  templateUrl: './header.html',
  styleUrl: './header.css',
  imports: [Icon, MarqueGlm, RouterLink, RouterLinkActive],
})
export class GestionHeader {
  readonly heading = input.required<string>();
  private readonly authentication = inject(AuthenticationPort);
  private readonly roles = inject(RolesPort);
  private readonly realmRoles = toSignal(from(this.roles.realmRoles()));

  protected readonly libelles = LIBELLES_EN_TETE;
  protected readonly gestionnaire = computed(() => {
    const roles = this.realmRoles();
    return roles !== undefined && isReservedToGestionnaire(roles);
  });
  protected readonly destinations = computed(() =>
    DESTINATIONS.filter(destination => this.gestionnaire() || !destination.reserveeAuGestionnaire),
  );
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
