import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { ActesDAtelierPort } from '@/gestion/contexts/element-de-fabrication/domain/ActesDAtelierPort';
import { ElementDeFabricationId } from '@/gestion/contexts/element-de-fabrication/domain/ElementDeFabricationId';
import { ElementDeFabricationIntrouvable } from '@/gestion/contexts/element-de-fabrication/domain/ElementDeFabricationIntrouvable';
import { ProduitDejaALAtelier } from '@/gestion/contexts/element-de-fabrication/domain/ProduitDejaALAtelier';
import { RefusDActeDAtelier } from '@/gestion/contexts/element-de-fabrication/domain/RefusDActeDAtelier';

export class ActesDAtelierFixture extends ActesDAtelierPort {
  existants: readonly string[] = [];
  engages: readonly string[] = [];
  readonly miseALAtelier: string[] = [];
  ecritureFailure: Error | undefined;
  miseALAtelierDifferee: Promise<Result<void, RefusDActeDAtelier>> | undefined;
  apresMiseALAtelier: () => void = () => undefined;

  override async mettreALAtelier(element: ElementDeFabricationId): Promise<Result<void, RefusDActeDAtelier>> {
    this.miseALAtelier.push(element.value);
    if (this.ecritureFailure !== undefined) return Promise.reject(this.ecritureFailure);
    if (this.miseALAtelierDifferee !== undefined) return this.miseALAtelierDifferee;
    if (!this.existants.includes(element.value)) return err(new ElementDeFabricationIntrouvable());
    if (this.engages.includes(element.value)) return err(new ProduitDejaALAtelier());
    this.engages = [...this.engages, element.value];
    this.apresMiseALAtelier();
    return ok(undefined);
  }
}
