import { Component, computed, input, output } from '@angular/core';
import { ElementAnomalie } from '../../../domain/dossier/ElementAnomalie';
import { ElementAnomalieId } from '../../../domain/dossier/ElementAnomalieId';
import { LIBELLES_ANOMALIES } from '../LibellesAnomalies';
import { ChoixRecherchable, LibellesSelecteurRecherchable, SelecteurRecherchable } from '../selecteur-recherchable/SelecteurRecherchable';

const LIBELLES_SELECTEUR: LibellesSelecteurRecherchable = {
  choisir: LIBELLES_ANOMALIES.choisirElement,
  tous: LIBELLES_ANOMALIES.tousLesElements,
  nonResolu: LIBELLES_ANOMALIES.elementNonResoluActuel,
  conserve: LIBELLES_ANOMALIES.elementActuelConserve,
  rechercher: LIBELLES_ANOMALIES.rechercherElement,
  aucun: LIBELLES_ANOMALIES.aucunElement,
  aucunResultat: LIBELLES_ANOMALIES.aucunResultatElement,
};

const libelleDe = (element: ElementAnomalie): string =>
  element.reference === undefined ? element.nom : `${element.nom} · ${element.reference}`;

@Component({
  selector: 'glm-selecteur-element-anomalie',
  imports: [SelecteurRecherchable],
  templateUrl: './SelecteurElementAnomalie.html',
  styleUrl: './SelecteurElementAnomalie.css',
})
export class SelecteurElementAnomalie {
  readonly elements = input<readonly ElementAnomalie[]>([]);
  readonly courant = input('');
  readonly disabled = input(false);
  readonly indisponible = input(false);
  readonly triggerId = input.required<string>();
  readonly labelId = input.required<string>();
  readonly selector = input.required<string>();
  readonly choisi = output<ElementAnomalieId>();
  readonly tousChoisis = output();
  protected readonly libelles = LIBELLES_SELECTEUR;
  protected readonly choix = computed<readonly ChoixRecherchable[]>(() =>
    [...this.elements()]
      .sort((premier, second) => premier.nom.localeCompare(second.nom, 'fr'))
      .map(element => ({ id: element.id.element, libelle: libelleDe(element), recherche: `${element.nom} ${element.reference ?? ''}` })),
  );

  protected choisir(id: string): void {
    this.choisi.emit(new ElementAnomalieId(id));
  }
}
