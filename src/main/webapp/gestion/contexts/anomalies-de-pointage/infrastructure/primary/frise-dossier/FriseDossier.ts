import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, input, output, signal } from '@angular/core';
import { LIBELLES_ANOMALIES } from '../LibellesAnomalies';
import { PositionDePoignee, PositionSansHeure, VueDeFrise } from './DispositionFrise';
import { instantSousLePointeur, positionSur } from './EchelleFrise';
import { dispositionDeFrise } from './FriseEnLigne';
import {
  DemandeDeDeplacement,
  demandeDeLaTouche,
  DeplacementDemande,
  PlacementDeLInstant,
  PlacementDemande,
  PoigneeDeFrise,
} from './PoigneeDeFrise';

const LARGEUR_DE_REFERENCE_PX = 1214;

const placementAuClavier = (demande: DemandeDeDeplacement, position: PositionSansHeure): DemandeDeDeplacement =>
  demande.kind === 'BORNE' ? demande : { kind: 'VERS', instant: position.instant };

@Component({
  selector: 'glm-frise-dossier',
  templateUrl: './FriseDossier.html',
  styleUrl: './FriseDossier.css',
})
export class FriseDossier {
  readonly dossier = input.required<VueDeFrise>();
  readonly now = input.required<Date>();
  readonly poignee = input<PoigneeDeFrise | undefined>(undefined);
  readonly placement = input<PlacementDeLInstant | undefined>(undefined);
  readonly deplacementDemande = output<DeplacementDemande>();
  readonly placementDemande = output<PlacementDemande>();
  protected readonly libelles = LIBELLES_ANOMALIES;
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly largeur = signal(LARGEUR_DE_REFERENCE_PX);
  private prise: { readonly decalage: number } | undefined;
  protected readonly disposition = computed(() =>
    dispositionDeFrise({
      vue: this.dossier(),
      maintenant: this.now(),
      poignee: this.poignee(),
      placement: this.placement(),
      largeur: this.largeur(),
    }),
  );

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const observateur = new ResizeObserver(mesures => {
        for (const mesure of mesures) this.mesure(mesure.contentRect.width);
      });
      observateur.observe(this.hote.nativeElement);
      destroyRef.onDestroy(() => {
        observateur.disconnect();
      });
    });
  }

  protected saisit(pointeur: PointerEvent, plan: HTMLElement, poignee: PositionDePoignee): void {
    (pointeur.currentTarget as Element).setPointerCapture(pointeur.pointerId);
    const { left, width } = plan.getBoundingClientRect();
    this.prise = { decalage: pointeur.clientX - (left + (positionSur(this.disposition().echelle, poignee.instant) / 100) * width) };
  }

  protected glisse(pointeur: PointerEvent, plan: HTMLElement, position: PositionDePoignee): void {
    if (this.prise === undefined) return;
    const instant = instantSousLePointeur(this.disposition().echelle, plan.getBoundingClientRect(), pointeur.clientX - this.prise.decalage);
    if (position.heure === 'AVEC_HEURE') this.deplacementDemande.emit({ demande: { kind: 'VERS', instant }, poignee: position.source });
    else this.placementDemande.emit({ demande: { kind: 'VERS', instant } });
  }

  private mesure(largeur: number): void {
    if (largeur > 0) this.largeur.set(largeur);
  }

  protected relache(): void {
    this.prise = undefined;
  }

  protected place(clic: MouseEvent, plan: HTMLElement): void {
    const instant = instantSousLePointeur(this.disposition().echelle, plan.getBoundingClientRect(), clic.clientX);
    this.placementDemande.emit({ demande: { kind: 'VERS', instant } });
  }

  protected touche(touche: KeyboardEvent, position: PositionDePoignee): void {
    const demande = demandeDeLaTouche(touche);
    if (demande === undefined) return;
    touche.preventDefault();
    if (position.heure === 'AVEC_HEURE') this.deplacementDemande.emit({ demande, poignee: position.source });
    else this.placementDemande.emit({ demande: placementAuClavier(demande, position) });
  }
}
