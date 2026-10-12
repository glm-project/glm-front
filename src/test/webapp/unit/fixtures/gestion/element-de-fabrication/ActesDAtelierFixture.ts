import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { ActesDAtelierPort } from '@/gestion/contexts/element-de-fabrication/domain/ActesDAtelierPort';
import { ElementDeFabricationId } from '@/gestion/contexts/element-de-fabrication/domain/ElementDeFabricationId';
import { PassageIntrouvable } from '@/gestion/contexts/element-de-fabrication/domain/PassageIntrouvable';
import { ProduitDejaALAtelier } from '@/gestion/contexts/element-de-fabrication/domain/ProduitDejaALAtelier';
import { ProduitIntrouvable } from '@/gestion/contexts/element-de-fabrication/domain/ProduitIntrouvable';
import { RefusDActeDAtelier } from '@/gestion/contexts/element-de-fabrication/domain/RefusDActeDAtelier';
import { SuiviDuProduitId } from '@/gestion/contexts/element-de-fabrication/domain/SuiviDuProduitId';

export class ActesDAtelierFixture extends ActesDAtelierPort {
  existants: readonly string[] = [];
  engages: readonly string[] = [];
  readonly miseALAtelier: string[] = [];
  suivisOuverts: readonly string[] = [];
  readonly clotures: string[] = [];
  clotureDifferee: Promise<Result<void, RefusDActeDAtelier>> | undefined;
  apresCloture: () => void = () => undefined;
  ecritureFailure: Error | undefined;
  miseALAtelierDifferee: Promise<Result<void, RefusDActeDAtelier>> | undefined;
  apresMiseALAtelier: () => void = () => undefined;

  override async mettreALAtelier(element: ElementDeFabricationId): Promise<Result<void, RefusDActeDAtelier>> {
    this.miseALAtelier.push(element.value);
    if (this.ecritureFailure !== undefined) return Promise.reject(this.ecritureFailure);
    if (this.miseALAtelierDifferee !== undefined) return this.miseALAtelierDifferee;
    if (!this.existants.includes(element.value)) return err(new ProduitIntrouvable());
    if (this.engages.includes(element.value)) return err(new ProduitDejaALAtelier());
    this.engages = [...this.engages, element.value];
    this.apresMiseALAtelier();
    return ok(undefined);
  }

  override async cloturer(suivi: SuiviDuProduitId): Promise<Result<void, RefusDActeDAtelier>> {
    this.clotures.push(suivi.value);
    if (this.ecritureFailure !== undefined) return Promise.reject(this.ecritureFailure);
    if (this.clotureDifferee !== undefined) return this.clotureDifferee;
    if (!this.suivisOuverts.includes(suivi.value)) return err(new PassageIntrouvable());
    this.suivisOuverts = this.suivisOuverts.filter(ouvert => ouvert !== suivi.value);
    this.apresCloture();
    return ok(undefined);
  }
}
