import { SearchPicker } from '@/gestion/shared/design-system/infrastructure/primary/search-picker/SearchPicker';
import { Component, computed, input, output, signal } from '@angular/core';

export interface ChoixRecherchable {
  readonly id: string;
  readonly libelle: string;
  readonly recherche: string;
}

export interface LibellesSelecteurRecherchable {
  readonly choisir: string;
  readonly tous: string;
  readonly nonResolu: string;
  readonly conserve: string;
  readonly rechercher: string;
  readonly aucunResultat: string;
}

const normalizeSearch = (query: string): string => query.trim().normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('fr-FR');

@Component({
  selector: 'glm-selecteur-recherchable',
  imports: [SearchPicker],
  templateUrl: './SelecteurRecherchable.html',
  styleUrl: './SelecteurRecherchable.css',
})
export class SelecteurRecherchable {
  readonly choix = input<readonly ChoixRecherchable[]>([]);
  readonly courant = input('');
  readonly disabled = input(false);
  readonly indisponible = input(false);
  readonly describedBy = input<string | null>(null);
  readonly triggerId = input.required<string>();
  readonly labelId = input.required<string>();
  readonly selector = input.required<string>();
  readonly avecTous = input(false);
  readonly libelles = input.required<LibellesSelecteurRecherchable>();
  readonly choisi = output<string>();
  readonly tousChoisis = output();
  protected readonly saisie = signal('');
  private readonly choixCourant = computed(() => this.choix().find(choix => choix.id === this.courant()));
  private readonly courantInconnu = computed(() => this.courant() !== '' && this.choixCourant() === undefined);
  protected readonly nonResolu = computed(() => this.courantInconnu() && !this.indisponible());
  protected readonly identite = computed(() => {
    const choix = this.choixCourant();
    if (choix !== undefined) return choix.libelle;
    if (this.courantInconnu()) return this.indisponible() ? this.libelles().conserve : this.libelles().nonResolu;
    return this.avecTous() ? this.libelles().tous : this.libelles().choisir;
  });
  protected readonly tousEstCourant = computed(() => this.courant() === '');
  protected readonly propositions = computed(() => {
    const recherche = normalizeSearch(this.saisie());
    return this.choix().filter(choix => normalizeSearch(choix.recherche).includes(recherche));
  });

  protected chooseAll(picker: SearchPicker): void {
    picker.close();
    if (!this.tousEstCourant()) this.tousChoisis.emit();
  }

  protected choose(id: string, picker: SearchPicker): void {
    picker.close();
    this.choisi.emit(id);
  }
}
