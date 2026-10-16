import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { AtelierPort } from '@/gestion/contexts/atelier/domain/AtelierPort';
import { ElementDeFabricationIntrouvable } from '@/gestion/contexts/atelier/domain/ElementDeFabricationIntrouvable';
import { ElementDejaALAtelier } from '@/gestion/contexts/atelier/domain/ElementDejaALAtelier';
import { ElementEngageId } from '@/gestion/contexts/atelier/domain/ElementEngageId';
import { RefusMiseALAtelier } from '@/gestion/contexts/atelier/domain/RefusMiseALAtelier';
import { SuiviId } from '@/gestion/contexts/atelier/domain/SuiviId';
import { SuiviIntrouvable } from '@/gestion/contexts/atelier/domain/SuiviIntrouvable';

interface Passage {
  readonly element: string;
}

export class AtelierFixture extends AtelierPort {
  elementsConnus: readonly string[] = [];
  private readonly passages = new Map<string, Passage>();

  suiviDe(element: string): string | undefined {
    return [...this.passages].find(([, passage]) => passage.element === element)?.[0];
  }

  override mettreALAtelier(element: ElementEngageId): Promise<Result<void, RefusMiseALAtelier>> {
    return Promise.resolve(this.engage(element.value));
  }

  override cloturer(suivi: SuiviId): Promise<Result<void, SuiviIntrouvable>> {
    return Promise.resolve(this.revise(suivi));
  }

  override rouvrir(suivi: SuiviId): Promise<Result<void, SuiviIntrouvable>> {
    return Promise.resolve(this.revise(suivi));
  }

  private engage(element: string): Result<void, RefusMiseALAtelier> {
    if (this.suiviDe(element) !== undefined) return err(new ElementDejaALAtelier());
    if (!this.elementsConnus.includes(element)) return err(new ElementDeFabricationIntrouvable());
    this.passages.set(`suivi-${element}`, { element });
    return ok(undefined);
  }

  private revise(suivi: SuiviId): Result<void, SuiviIntrouvable> {
    if (!this.passages.has(suivi.value)) return err(new SuiviIntrouvable());
    return ok(undefined);
  }
}
