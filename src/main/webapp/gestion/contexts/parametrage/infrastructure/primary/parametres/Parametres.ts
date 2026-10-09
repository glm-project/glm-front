import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ErrorMessage } from '@/gestion/shared/design-system/infrastructure/primary/error-message/ErrorMessage';
import { MarqueGlm } from '@/gestion/shared/design-system/infrastructure/primary/marque-glm/MarqueGlm';
import { TextField } from '@/gestion/shared/design-system/infrastructure/primary/text-field/TextField';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { LogoAffiche } from '../../../application/LogoAffiche';
import { FichierDeLogo } from '../../../domain/FichierDeLogo';
import { FormulaireDureeMaxDActivite } from '../../../domain/FormulaireDureeMaxDActivite';
import { ParametragePort } from '../../../domain/ParametragePort';
import { VersionDuLogo } from '../../../domain/VersionDuLogo';
import { LIBELLES_PARAMETRES } from '../LibellesParametrage';

const HEURE_DE_DEBUT_DE_L_EXEMPLE = 8;

@Component({
  selector: 'glm-parametres',
  host: { 'data-selector': 'parametres' },
  templateUrl: './Parametres.html',
  styleUrl: './Parametres.css',
  imports: [ErrorMessage, MarqueGlm, TextField, MatButtonModule],
})
export class Parametres implements OnInit {
  private readonly port = inject(ParametragePort);
  private readonly errors = inject(ErrorHandlerPort);
  private readonly logoAffiche = inject(LogoAffiche);

  protected readonly libelles = LIBELLES_PARAMETRES;
  protected readonly chargement = signal(true);
  protected readonly echec = signal(false);
  protected readonly formulaire = signal(FormulaireDureeMaxDActivite.vide());
  protected readonly enregistrement = signal(false);
  protected readonly enregistree = signal(false);
  protected readonly erreurTechnique = signal(false);
  protected readonly image = this.logoAffiche.image;
  protected readonly choisi = signal<FichierDeLogo | undefined>(undefined);
  protected readonly apercu = computed(() => this.choisi()?.apercu() ?? this.image());
  protected readonly legende = computed(() => {
    if (this.choisi() !== undefined) return this.libelles.pasEncoreEnregistre;
    return this.image() === undefined ? this.libelles.logoGlm : this.libelles.tailleReelle;
  });
  protected readonly imageIndisponible = signal(false);
  protected readonly depot = signal(false);
  protected readonly refusLogo = signal<string | undefined>(undefined);
  protected readonly logoEnregistre = signal(false);
  protected readonly erreurDepot = signal(false);
  protected readonly logo = signal<VersionDuLogo | undefined>(undefined);
  protected readonly confirmationDuRetrait = signal(false);
  protected readonly retrait = signal(false);
  protected readonly logoRetire = signal(false);
  protected readonly erreurRetrait = signal(false);
  protected readonly erreur = computed(() => this.formulaire().erreur());
  protected readonly exemple = computed(() => {
    const duree = this.formulaire().produireDuree();
    return duree.ok ? this.libelles.exemple(duree.value.arretDUneActiviteCommenceeA(HEURE_DE_DEBUT_DE_L_EXEMPLE)) : undefined;
  });

  ngOnInit(): void {
    this.reload();
  }

  protected reload(): void {
    this.errors.observe(this.load());
  }

  protected changeDuree(saisie: string): void {
    this.formulaire.update(formulaire => formulaire.avecSaisie(saisie));
    this.enregistree.set(false);
  }

  protected enregistrer(event: Event): void {
    event.preventDefault();
    this.errors.observe(this.save());
  }

  protected choisirLogo(fichiers: FileList | null): void {
    const choisi = fichiers?.item(0);
    if (!(choisi instanceof Blob)) return;
    this.errors.observe(this.lireLeChoix(choisi));
  }

  protected enregistrerLogo(fichier: FichierDeLogo): void {
    this.errors.observe(this.deposer(fichier));
  }

  protected annulerLeChoix(): void {
    this.choisi.set(undefined);
    this.refusLogo.set(undefined);
    this.erreurDepot.set(false);
  }

  protected demanderLeRetrait(): void {
    this.confirmationDuRetrait.set(true);
    this.logoRetire.set(false);
    this.erreurRetrait.set(false);
  }

  protected annulerLeRetrait(): void {
    this.confirmationDuRetrait.set(false);
  }

  protected confirmerLeRetrait(): void {
    this.errors.observe(this.retirer());
  }

  private async retirer(): Promise<void> {
    this.retrait.set(true);
    try {
      await this.port.retirerLogo();
      this.confirmationDuRetrait.set(false);
      await this.afficherLogo(undefined);
      this.logoRetire.set(true);
    } catch (failure) {
      this.erreurRetrait.set(true);
      this.errors.handleError(failure);
    } finally {
      this.retrait.set(false);
    }
  }

  private async lireLeChoix(choisi: Blob): Promise<void> {
    this.refusLogo.set(undefined);
    this.logoEnregistre.set(false);
    this.logoRetire.set(false);
    this.erreurDepot.set(false);
    const fichier = new FichierDeLogo(new Uint8Array(await choisi.arrayBuffer()));
    const refus = fichier.refus();
    this.refusLogo.set(refus);
    this.choisi.set(refus === undefined ? fichier : undefined);
  }

  private async deposer(fichier: FichierDeLogo): Promise<void> {
    this.erreurDepot.set(false);
    this.depot.set(true);
    try {
      const resultat = await this.port.deposerLogo(fichier);
      this.choisi.set(undefined);
      if (resultat.ok) {
        await this.afficherLogo(resultat.value);
        this.logoEnregistre.set(true);
      } else {
        this.refusLogo.set(this.libelles.refusServeur(resultat.error.message));
      }
    } catch (failure) {
      this.erreurDepot.set(true);
      this.errors.handleError(failure);
    } finally {
      this.depot.set(false);
    }
  }

  private async load(): Promise<void> {
    this.chargement.set(true);
    this.echec.set(false);
    try {
      const parametrage = await this.port.parametrage();
      this.formulaire.set(FormulaireDureeMaxDActivite.depuis(parametrage.dureeMaxDActivite));
      this.chargement.set(false);
      await this.afficherLogo(parametrage.logo);
    } catch {
      this.echec.set(true);
      this.chargement.set(false);
    }
  }

  private async afficherLogo(version: VersionDuLogo | undefined): Promise<void> {
    this.logo.set(version);
    this.imageIndisponible.set(false);
    try {
      await this.logoAffiche.montrer(version);
    } catch {
      this.imageIndisponible.set(true);
    }
  }

  private async save(): Promise<void> {
    if (this.enregistrement()) return;
    const duree = this.formulaire().produireDuree();
    if (!duree.ok) return;
    this.enregistrement.set(true);
    this.erreurTechnique.set(false);
    try {
      await this.port.fixerDureeMaxDActivite(duree.value);
      this.enregistree.set(true);
    } catch (failure) {
      this.erreurTechnique.set(true);
      this.errors.handleError(failure);
    } finally {
      this.enregistrement.set(false);
    }
  }
}
