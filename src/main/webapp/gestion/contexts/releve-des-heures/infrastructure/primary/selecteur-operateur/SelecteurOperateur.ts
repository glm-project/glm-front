import { SearchPicker } from '@/gestion/shared/design-system/infrastructure/primary/search-picker/SearchPicker';
import { Component, computed, input, output, signal } from '@angular/core';
import { IdentiteOperateur } from '../../../domain/releve/IdentiteOperateur';
import { OperateurDuReleve } from '../../../domain/releve/OperateurDuReleve';
import { OperateurReleveId } from '../../../domain/releve/OperateurReleveId';
import { LIBELLES_RELEVE_DES_HEURES } from '../LibellesReleveDesHeures';

const normalizeSearch = (query: string): string => query.trim().normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('fr-FR');

@Component({
  selector: 'glm-selecteur-operateur',
  imports: [SearchPicker],
  templateUrl: './SelecteurOperateur.html',
  styleUrl: './SelecteurOperateur.css',
})
export class SelecteurOperateur {
  readonly indisponible = input(false);
  readonly reessayer = output();
  readonly chargement = input(false);
  readonly choisi = output<OperateurReleveId>();
  readonly courant = input<string | null>();
  readonly operateurs = input<readonly OperateurDuReleve[]>([]);
  protected readonly vide = computed(() => !this.chargement() && !this.indisponible() && this.operateurs().length === 0);
  protected readonly saisie = signal('');
  protected readonly propositions = computed(() =>
    this.operateurs()
      .filter(operateur =>
        normalizeSearch(`${operateur.identite.prenom} ${operateur.identite.nom}`).includes(normalizeSearch(this.saisie())),
      )
      .sort(
        (gauche, droite) =>
          gauche.identite.nom.localeCompare(droite.identite.nom, 'fr')
          || gauche.identite.prenom.localeCompare(droite.identite.prenom, 'fr'),
      ),
  );
  protected choose(id: OperateurReleveId, picker: SearchPicker): void {
    picker.close();
    this.choisi.emit(id);
  }

  readonly identite = input<IdentiteOperateur>();
  protected readonly libelles = LIBELLES_RELEVE_DES_HEURES;
}
