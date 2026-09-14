import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Result } from '@/app/shared/result/domain/Result';
import { computed, inject, Injectable, signal } from '@angular/core';
import { CommandeEnregistrementPoste } from '../domain/CommandeEnregistrementPoste';
import { NatureDeTravail } from '../domain/NatureDeTravail';
import { PosteDeTravail } from '../domain/PosteDeTravail';
import { PosteDeTravailId } from '../domain/PosteDeTravailId';
import { PostesPort } from '../domain/PostesPort';
import { RefusEnregistrementPoste } from '../domain/RefusEnregistrementPoste';
import { RefusSuppressionPoste } from '../domain/RefusSuppressionPoste';

interface EtatPostes {
  readonly postes: readonly PosteDeTravail[];
  readonly totalElementsCount: number;
  readonly page: number;
  readonly taille: number;
  readonly chargement: boolean;
  readonly natures: readonly NatureDeTravail[];
  readonly echec: boolean;
}

@Injectable()
export class PostesCoordinator {
  private lecture = 0;
  private readonly port = inject(PostesPort);
  private readonly errors = inject(ErrorHandlerPort);
  private readonly etat = signal<EtatPostes>({
    postes: [],
    totalElementsCount: 0,
    page: 0,
    taille: 20,
    chargement: false,
    natures: [],
    echec: false,
  });

  readonly postes = computed(() => this.etat().postes);
  readonly totalElementsCount = computed(() => this.etat().totalElementsCount);
  readonly page = computed(() => this.etat().page);
  readonly taille = computed(() => this.etat().taille);
  readonly chargement = computed(() => this.etat().chargement);
  readonly natures = computed(() => this.etat().natures);
  readonly echec = computed(() => this.etat().echec);

  async charger(): Promise<void> {
    const lecture = ++this.lecture;
    this.etat.update(etat => ({ ...etat, chargement: true, echec: false }));
    try {
      const [page, natures] = await Promise.all([this.port.postes(this.page(), this.taille()), this.port.natures()]);
      if (lecture === this.lecture) {
        this.etat.update(etat => ({ ...etat, postes: page.elements, totalElementsCount: page.totalCount, natures }));
      }
    } catch (failure) {
      if (lecture === this.lecture) {
        this.etat.update(etat => ({ ...etat, echec: true }));
      }
      this.errors.handleError(failure);
    } finally {
      if (lecture === this.lecture) {
        this.etat.update(etat => ({ ...etat, chargement: false }));
      }
    }
  }

  changerPage(page: number, taille: number): Promise<void> {
    this.etat.update(etat => ({ ...etat, page, taille }));
    return this.charger();
  }

  creer(commande: CommandeEnregistrementPoste): Promise<Result<void, RefusEnregistrementPoste>> {
    return this.refreshAfter(this.port.creer(commande));
  }

  modifier(id: PosteDeTravailId, commande: CommandeEnregistrementPoste): Promise<Result<void, RefusEnregistrementPoste>> {
    return this.refreshAfter(this.port.modifier(id, commande));
  }

  async supprimer(id: PosteDeTravailId): Promise<Result<void, RefusSuppressionPoste>> {
    const resultat = await this.port.supprimer(id);
    if (resultat.ok) {
      if (this.derniereLigneSurPageSuivante()) {
        this.etat.update(etat => ({ ...etat, page: etat.page - 1 }));
      }
      await this.charger();
    }
    return resultat;
  }

  private derniereLigneSurPageSuivante(): boolean {
    return this.postes().length === 1 && this.page() > 0;
  }

  private async refreshAfter<Refus>(operation: Promise<Result<void, Refus>>): Promise<Result<void, Refus>> {
    const resultat = await operation;
    if (resultat.ok) {
      await this.charger();
    }
    return resultat;
  }
}
