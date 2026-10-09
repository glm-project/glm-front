import { Component, computed, input, output } from '@angular/core';
import { OperateurAnomalie } from '../../../domain/dossier/OperateurAnomalie';
import { OperateurAnomalieId } from '../../../domain/dossier/OperateurAnomalieId';
import { LIBELLES_ANOMALIES } from '../LibellesAnomalies';
import { operateurNomme } from '../PresentationIdentites';
import { ChoixRecherchable, LibellesSelecteurRecherchable, SelecteurRecherchable } from '../selecteur-recherchable/SelecteurRecherchable';

const LIBELLES_SELECTEUR: LibellesSelecteurRecherchable = {
  choisir: LIBELLES_ANOMALIES.choisirOperateur,
  tous: LIBELLES_ANOMALIES.tousLesOperateurs,
  nonResolu: LIBELLES_ANOMALIES.operateurNonResoluActuel,
  conserve: LIBELLES_ANOMALIES.operateurActuelConserve,
  rechercher: LIBELLES_ANOMALIES.rechercherOperateur,
  aucun: LIBELLES_ANOMALIES.aucunOperateur,
  aucunResultat: LIBELLES_ANOMALIES.aucunResultatOperateur,
};

@Component({
  selector: 'glm-selecteur-operateur-anomalie',
  imports: [SelecteurRecherchable],
  templateUrl: './SelecteurOperateurAnomalie.html',
  styleUrl: './SelecteurOperateurAnomalie.css',
})
export class SelecteurOperateurAnomalie {
  readonly operateurs = input<readonly OperateurAnomalie[]>([]);
  readonly courant = input('');
  readonly disabled = input(false);
  readonly indisponible = input(false);
  readonly describedBy = input<string | null>(null);
  readonly triggerId = input.required<string>();
  readonly labelId = input.required<string>();
  readonly selector = input('selecteur-operateur-anomalie');
  readonly avecTous = input(false);
  readonly choisi = output<OperateurAnomalieId>();
  readonly tousChoisis = output();
  protected readonly libelles = LIBELLES_SELECTEUR;
  protected readonly choix = computed<readonly ChoixRecherchable[]>(() =>
    this.operateurs().map(operateur => ({
      id: operateur.id.operateur,
      libelle: operateurNomme(operateur),
      recherche: `${operateur.nom} ${operateur.code ?? ''}`,
    })),
  );

  protected choisir(id: string): void {
    this.choisi.emit(new OperateurAnomalieId(id));
  }
}
