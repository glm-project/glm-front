import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ErrorMessage } from '@/gestion/shared/design-system/infrastructure/primary/error-message/ErrorMessage';
import { MarqueGlm } from '@/gestion/shared/design-system/infrastructure/primary/marque-glm/MarqueGlm';
import { TextField } from '@/gestion/shared/design-system/infrastructure/primary/text-field/TextField';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { FormulaireDureeMaxDActivite } from '../../../domain/FormulaireDureeMaxDActivite';
import { ImageDuLogo } from '../../../domain/ImageDuLogo';
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

  protected readonly libelles = LIBELLES_PARAMETRES;
  protected readonly chargement = signal(true);
  protected readonly echec = signal(false);
  protected readonly formulaire = signal(FormulaireDureeMaxDActivite.vide());
  protected readonly enregistrement = signal(false);
  protected readonly enregistree = signal(false);
  protected readonly erreurTechnique = signal(false);
  protected readonly image = signal<ImageDuLogo | undefined>(undefined);
  protected readonly imageIndisponible = signal(false);
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
    this.image.set(undefined);
    this.imageIndisponible.set(false);
    if (version === undefined) return;
    try {
      this.image.set(await this.port.imageDuLogo(version));
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
