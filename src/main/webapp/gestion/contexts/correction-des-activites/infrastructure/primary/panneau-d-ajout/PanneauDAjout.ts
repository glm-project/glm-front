import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { SearchPicker } from '@/gestion/shared/design-system/infrastructure/primary/search-picker/SearchPicker';
import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, input, model, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { CorrectionDUneActivite, IssueDeCorrection } from '../../../application/CorrectionDUneActivite';
import { AjoutEnPreparation } from '../../../domain/correction/AjoutEnPreparation';
import { MotifDAjout } from '../../../domain/correction/CorrectionsPort';
import { CategorieDActivite } from '../../../domain/journee/CategorieDActivite';
import { JourneeACorriger } from '../../../domain/journee/JourneeACorriger';
import { PosteDeLaJourneeId } from '../../../domain/journee/PosteDeLaJourneeId';
import { SuiviDAtelierId } from '../../../domain/journee/SuiviDAtelierId';
import { maintenant } from '../Horloge';
import { LIBELLES_CORRECTION_DES_ACTIVITES } from '../LibellesCorrectionDesActivites';

const CATEGORIES: readonly CategorieDActivite[] = ['TRAVAIL', 'NON_CONFORMITE'];

const normaliser = (recherche: string): string => recherche.trim().normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('fr-FR');

@Component({
  selector: 'glm-panneau-d-ajout',
  imports: [MatButtonModule, SearchPicker],
  templateUrl: './PanneauDAjout.html',
  styleUrls: ['../../../../../shared/design-system/infrastructure/primary/forms.css', './PanneauDAjout.css'],
})
export class PanneauDAjout {
  readonly journee = input.required<JourneeACorriger>();
  readonly ajout = model.required<AjoutEnPreparation>();
  readonly abandon = output();
  readonly corrigee = output<IssueDeCorrection>();

  private readonly correction = inject(CorrectionDUneActivite);
  private readonly errors = inject(ErrorHandlerPort);
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly libelles = LIBELLES_CORRECTION_DES_ACTIVITES.ajout;
  protected readonly categories = CATEGORIES;
  protected readonly recherche = signal('');
  protected readonly refus = signal<MotifDAjout | undefined>(undefined);
  protected readonly echec = signal(false);
  protected readonly enCours = computed(() => this.correction.etat().kind === 'EN_COURS');
  protected readonly postes = computed(() => this.journee().choix.postes);
  protected readonly posteChoisi = computed(() => this.ajout().poste(this.journee()));
  protected readonly plage = computed(() => this.ajout().plage(this.journee()));
  protected readonly erreur = computed(() => this.plage().erreur());
  protected readonly duree = computed(() => this.plage().duree());
  protected readonly effet = computed(() => this.ajout().effet(this.journee()));
  protected readonly elementManquant = computed(() => this.ajout().elementManquant(this.journee()));
  protected readonly elementChoisi = computed(() => this.ajout().suivi(this.journee())?.element);
  protected readonly elements = computed(() =>
    this.journee()
      .choix.suivis.suivis.map(suivi => ({ id: suivi.suivi.value, libelle: this.libelles.nomDeLElement(suivi.element) }))
      .sort((premier, second) => premier.libelle.localeCompare(second.libelle, 'fr', { numeric: true })),
  );
  protected readonly propositions = computed(() => {
    const recherche = normaliser(this.recherche());
    return this.elements().filter(element => normaliser(element.libelle).includes(recherche));
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.correction.abandonnerLAjout();
    });
    afterNextRender(() => this.hote.nativeElement.querySelector<HTMLElement>('[data-selector="ajout-element"]')?.focus());
  }

  protected choisirLElement(id: string, picker: SearchPicker): void {
    picker.close();
    this.modifier(ajout => ajout.avecSuivi(new SuiviDAtelierId(id)));
  }

  protected choisirLePoste(id: string): void {
    this.modifier(ajout => ajout.avecPoste(new PosteDeLaJourneeId(id)));
  }

  protected choisirLeType(categorie: CategorieDActivite): void {
    this.modifier(ajout => ajout.avecCategorie(categorie));
  }

  protected saisirLeDebut(texte: string): void {
    this.modifier(ajout => ajout.avecDebut(texte));
  }

  protected saisirLaFin(texte: string): void {
    this.modifier(ajout => ajout.avecFin(texte));
  }

  protected envoyer(evenement: Event): void {
    evenement.preventDefault();
    this.errors.observe(this.ajouter());
  }

  private modifier(transition: (ajout: AjoutEnPreparation) => AjoutEnPreparation): void {
    this.ajout.set(transition(this.ajout().avecMaintenant(maintenant())));
    this.refus.set(undefined);
    this.echec.set(false);
  }

  private async ajouter(): Promise<void> {
    this.modifier(ajout => ajout.apresUnEnvoi());
    const contenu = this.ajout().contenu(this.journee());
    if (contenu === undefined) {
      return;
    }
    await this.correction.ajouter(contenu);
    const etat = this.correction.etat();
    this.refus.set(etat.kind === 'AJOUT_REFUSE' ? etat.motif : undefined);
    this.echec.set(etat.kind === 'ECHEC');
    if (etat.kind === 'A_RELIRE') {
      this.corrigee.emit(etat.issue);
    }
  }
}
