import { SearchPicker } from '@/gestion/shared/design-system/infrastructure/primary/search-picker/SearchPicker';
import { Component, computed, input, output, signal } from '@angular/core';
import { OperateurAnomalieId } from '../../../domain/dossier/OperateurAnomalieId';
import { OperateurAnomalie } from '../../../domain/dossier/ReferentielAnomalies';
import { LIBELLES_ANOMALIES } from '../LibellesAnomalies';
import { operateurNomme } from '../PresentationIdentites';

const normalizeSearch = (query: string): string => query.trim().normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('fr-FR');

@Component({
  selector: 'glm-selecteur-operateur-anomalie',
  imports: [SearchPicker],
  templateUrl: './SelecteurOperateurAnomalie.html',
  styleUrl: './SelecteurOperateurAnomalie.css',
})
export class SelecteurOperateurAnomalie {
  readonly operateurs = input<readonly OperateurAnomalie[]>([]);
  readonly courant = input('');
  readonly disabled = input(false);
  readonly describedBy = input<string | null>(null);
  readonly triggerId = input.required<string>();
  readonly labelId = input.required<string>();
  readonly selector = input('selecteur-operateur-anomalie');
  readonly choisi = output<OperateurAnomalieId>();
  protected readonly libelles = LIBELLES_ANOMALIES;
  protected readonly nomme = operateurNomme;
  protected readonly saisie = signal('');
  private readonly operateurCourant = computed(() => this.operateurs().find(operateur => operateur.id.operateur === this.courant()));
  protected readonly nonResolu = computed(() => this.courant() !== '' && this.operateurCourant() === undefined);
  protected readonly identite = computed(() => {
    const operateur = this.operateurCourant();
    if (operateur !== undefined) return operateurNomme(operateur);
    return this.nonResolu() ? this.libelles.operateurNonResoluActuel : this.libelles.choisirOperateur;
  });
  protected readonly propositions = computed(() => {
    const recherche = normalizeSearch(this.saisie());
    return this.operateurs().filter(operateur => normalizeSearch(`${operateur.nom} ${operateur.code ?? ''}`).includes(recherche));
  });

  protected choose(id: OperateurAnomalieId, picker: SearchPicker): void {
    picker.close();
    this.choisi.emit(id);
  }
}
