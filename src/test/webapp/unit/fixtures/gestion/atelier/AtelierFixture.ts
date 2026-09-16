import { Page } from '@/app/shared/pagination/domain/Page';
import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { ActeDAtelier } from '@/gestion/contexts/atelier/domain/ActeDAtelier';
import { AtelierPort } from '@/gestion/contexts/atelier/domain/AtelierPort';
import { ElementALAtelier } from '@/gestion/contexts/atelier/domain/ElementALAtelier';
import { ElementDeFabricationIntrouvable } from '@/gestion/contexts/atelier/domain/ElementDeFabricationIntrouvable';
import { ElementDejaALAtelier } from '@/gestion/contexts/atelier/domain/ElementDejaALAtelier';
import { ElementEngageId } from '@/gestion/contexts/atelier/domain/ElementEngageId';
import { InstantDAtelier } from '@/gestion/contexts/atelier/domain/InstantDAtelier';
import { NomDElementEngage } from '@/gestion/contexts/atelier/domain/NomDElementEngage';
import { RefusMiseALAtelier } from '@/gestion/contexts/atelier/domain/RefusMiseALAtelier';
import { RequeteAtelier } from '@/gestion/contexts/atelier/domain/RequeteAtelier';
import { SuiviId } from '@/gestion/contexts/atelier/domain/SuiviId';
import { SuiviIntrouvable } from '@/gestion/contexts/atelier/domain/SuiviIntrouvable';
import { TypeDElementEngage } from '@/gestion/contexts/atelier/domain/TypeDElementEngage';

import { SignalFixture } from '@test/unit/fixtures/SignalFixture';

/** Ce que le back recopie sur le suivi au moment de l'engagement. */
export interface PhotographieDElement {
  readonly nom: string;
  readonly type: TypeDElementEngage;
}

export const AUTEUR_FIXTURE = 'gestionnaire.impeccmold';
export const ENGAGEMENT_FIXTURE = '2026-09-14T08:30:00.000Z';
export const CLOTURE_FIXTURE = '2026-09-15T16:00:00.000Z';

export class AtelierFixture extends AtelierPort {
  liste: readonly ElementALAtelier[] = [];
  readonly photographies = new Map<string, PhotographieDElement>();
  /** L'agrégat ne porte que l'identifiant du suivi : le lien vers l'élément reste ici, comme au back. */
  readonly elementsEngages = new Map<string, string>();
  readonly lectures: RequeteAtelier[] = [];
  readonly engagements: ElementEngageId[] = [];
  readonly clotures: SuiviId[] = [];
  readonly reouvertures: SuiviId[] = [];
  lectureFailure: Error | undefined;
  ecritureFailure: Error | undefined;
  lectureDifferee: Promise<Page<ElementALAtelier>> | undefined;
  engagementDiffere: Promise<Result<void, RefusMiseALAtelier>> | undefined;
  clotureDifferee: Promise<Result<void, SuiviIntrouvable>> | undefined;
  private suivant = 0;
  private lectureSignal: SignalFixture | undefined;

  signalLecture(): Promise<void> {
    this.lectureSignal = new SignalFixture();
    return this.lectureSignal.promise;
  }

  override elements(requete: RequeteAtelier): Promise<Page<ElementALAtelier>> {
    this.lectures.push(requete);
    this.lectureSignal?.release();
    this.lectureSignal = undefined;
    if (this.lectureFailure !== undefined) return Promise.reject(this.lectureFailure);
    if (this.lectureDifferee !== undefined) return this.lectureDifferee;
    const retenus = this.liste.filter(element => requete.etats().includes(element.etat));
    return Promise.resolve(new Page(retenus.slice(requete.page * requete.taille, (requete.page + 1) * requete.taille), retenus.length));
  }

  override async mettreALAtelier(element: ElementEngageId): Promise<Result<void, RefusMiseALAtelier>> {
    this.engagements.push(element);
    if (this.ecritureFailure !== undefined) return Promise.reject(this.ecritureFailure);
    if (this.engagementDiffere !== undefined) return this.engagementDiffere;
    if (this.liste.some(candidat => this.estLeMemeElementEncoreOuvert(candidat, element))) {
      return err(new ElementDejaALAtelier());
    }
    const photographie = this.photographies.get(element.value);
    if (photographie === undefined) return err(new ElementDeFabricationIntrouvable());
    this.liste = [...this.liste, this.engage(element, photographie)];
    return ok(undefined);
  }

  override async cloturer(suivi: SuiviId): Promise<Result<void, SuiviIntrouvable>> {
    this.clotures.push(suivi);
    if (this.ecritureFailure !== undefined) return Promise.reject(this.ecritureFailure);
    if (this.clotureDifferee !== undefined) return this.clotureDifferee;
    return this.revise(suivi, element => this.ferme(element));
  }

  override async rouvrir(suivi: SuiviId): Promise<Result<void, SuiviIntrouvable>> {
    this.reouvertures.push(suivi);
    if (this.ecritureFailure !== undefined) return Promise.reject(this.ecritureFailure);
    return this.revise(suivi, element => this.ouvre(element));
  }

  private revise(suivi: SuiviId, transforme: (element: ElementALAtelier) => ElementALAtelier): Result<void, SuiviIntrouvable> {
    if (!this.liste.some(element => element.suivi.value === suivi.value)) {
      return err(new SuiviIntrouvable());
    }
    this.liste = this.liste.map(element => (element.suivi.value === suivi.value ? transforme(element) : element));
    return ok(undefined);
  }

  private estLeMemeElementEncoreOuvert(candidat: ElementALAtelier, element: ElementEngageId): boolean {
    return this.elementsEngages.get(candidat.suivi.value) === element.value && !candidat.estCloture();
  }

  private engage(element: ElementEngageId, photographie: PhotographieDElement): ElementALAtelier {
    this.suivant += 1;
    const suivi = new SuiviId(`suivi-cree-${String(this.suivant)}`);
    this.elementsEngages.set(suivi.value, element.value);
    return new ElementALAtelier(suivi, {
      nom: new NomDElementEngage(photographie.nom),
      type: photographie.type,
      etat: 'EN_ATTENTE',
      engagement: new ActeDAtelier(new InstantDAtelier(ENGAGEMENT_FIXTURE), AUTEUR_FIXTURE),
      cloture: undefined,
    });
  }

  private ferme(element: ElementALAtelier): ElementALAtelier {
    return new ElementALAtelier(element.suivi, {
      nom: element.nom,
      type: element.type,
      etat: 'CLOTURE',
      engagement: element.engagement,
      cloture: new ActeDAtelier(new InstantDAtelier(CLOTURE_FIXTURE), AUTEUR_FIXTURE),
    });
  }

  private ouvre(element: ElementALAtelier): ElementALAtelier {
    return new ElementALAtelier(element.suivi, {
      nom: element.nom,
      type: element.type,
      etat: 'EN_ATTENTE',
      engagement: element.engagement,
      cloture: undefined,
    });
  }
}
