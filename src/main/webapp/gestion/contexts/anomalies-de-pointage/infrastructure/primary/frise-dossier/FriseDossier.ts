import { Component, computed, input, output } from '@angular/core';
import { LIBELLES_ANOMALIES } from '../LibellesAnomalies';
import { memeSelection, SelectionDuDossier } from '../SelectionDuDossier';
import { dispositionDeFrise, PositionDePoignee, VueDeFrise } from './DispositionFrise';
import { instantSousLePointeur } from './EchelleFrise';
import { demandeDeLaTouche, DeplacementDemande, PoigneeDeFrise } from './PoigneeDeFrise';

@Component({
  selector: 'glm-frise-dossier',
  templateUrl: './FriseDossier.html',
  styleUrl: './FriseDossier.css',
})
export class FriseDossier {
  readonly dossier = input.required<VueDeFrise>();
  readonly now = input.required<Date>();
  readonly selection = input<SelectionDuDossier | undefined>(undefined);
  readonly poignee = input<PoigneeDeFrise | undefined>(undefined);
  readonly selectionDemandee = output<SelectionDuDossier>();
  readonly deplacementDemande = output<DeplacementDemande>();
  protected readonly libelles = LIBELLES_ANOMALIES;
  protected readonly estSelectionne = (selection: SelectionDuDossier): boolean => memeSelection(selection, this.selection());
  private prise: { readonly decalage: number } | undefined;
  protected readonly disposition = computed(() => dispositionDeFrise(this.dossier(), this.now(), this.poignee()));

  protected saisit(pointeur: PointerEvent, plan: HTMLElement, poignee: PositionDePoignee): void {
    if (poignee.desactivee) return;
    (pointeur.currentTarget as Element).setPointerCapture(pointeur.pointerId);
    const { left, width } = plan.getBoundingClientRect();
    this.prise = { decalage: pointeur.clientX - (left + (poignee.gauche / 100) * width) };
  }

  protected glisse(pointeur: PointerEvent, plan: HTMLElement, poignee: PositionDePoignee): void {
    if (this.prise === undefined) return;
    const instant = instantSousLePointeur(this.disposition().echelle, plan.getBoundingClientRect(), pointeur.clientX - this.prise.decalage);
    this.deplacementDemande.emit({ demande: { kind: 'VERS', instant }, poignee: poignee.source });
  }

  protected relache(): void {
    this.prise = undefined;
  }

  protected touche(touche: KeyboardEvent, poignee: PositionDePoignee): void {
    if (poignee.desactivee) return;
    const demande = demandeDeLaTouche(touche);
    if (demande === undefined) return;
    touche.preventDefault();
    this.deplacementDemande.emit({ demande, poignee: poignee.source });
  }
}
