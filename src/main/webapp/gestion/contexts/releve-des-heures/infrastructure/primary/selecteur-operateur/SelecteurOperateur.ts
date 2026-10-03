import { Icon } from '@/app/shared/design-system/infrastructure/primary/icon/icon';
import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { afterNextRender, Component, computed, ElementRef, inject, Injector, input, output, signal, viewChild } from '@angular/core';
import { IdentiteOperateur } from '../../../domain/releve/IdentiteOperateur';
import { OperateurDuReleve } from '../../../domain/releve/OperateurDuReleve';
import { OperateurReleveId } from '../../../domain/releve/OperateurReleveId';
import { LIBELLES_RELEVE_DES_HEURES } from '../LibellesReleveDesHeures';

const normalizeSearch = (query: string): string => query.trim().normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('fr-FR');

@Component({
  selector: 'glm-selecteur-operateur',
  imports: [CdkConnectedOverlay, CdkOverlayOrigin, Icon],
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
  protected readonly ouvert = signal(false);
  private readonly recherche = viewChild<ElementRef<HTMLInputElement>>('recherche');
  private readonly injector = inject(Injector);

  protected open(): void {
    this.saisie.set('');
    this.ouvert.set(true);
  }

  protected choose(id: OperateurReleveId, control: HTMLButtonElement): void {
    this.close(control);
    this.choisi.emit(id);
  }

  protected close(control: HTMLButtonElement): void {
    this.ouvert.set(false);
    control.focus();
  }

  protected focusSearch(): void {
    afterNextRender(() => this.recherche()?.nativeElement.focus(), { injector: this.injector });
  }

  readonly identite = input<IdentiteOperateur>();
  protected readonly libelles = LIBELLES_RELEVE_DES_HEURES;
}
