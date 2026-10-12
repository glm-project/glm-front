import { inject, Injectable } from '@angular/core';
import { AtelierPort } from '../../domain/AtelierPort';
import { ElementEngageId } from '../../domain/ElementEngageId';
import { SuiviId } from '../../domain/SuiviId';

export type RefusDeMiseALAtelier = 'element-deja-a-l-atelier' | 'element-de-fabrication-introuvable';

export type RefusSurLePassage = 'suivi-introuvable';

@Injectable()
export class TypeScriptActesDAtelier {
  private readonly atelier = inject(AtelierPort);

  async mettreALAtelier(element: string): Promise<RefusDeMiseALAtelier | undefined> {
    const resultat = await this.atelier.mettreALAtelier(new ElementEngageId(element));
    return resultat.ok ? undefined : resultat.error.code;
  }

  async cloturer(suivi: string): Promise<RefusSurLePassage | undefined> {
    const resultat = await this.atelier.cloturer(new SuiviId(suivi));
    return resultat.ok ? undefined : resultat.error.code;
  }

  async rouvrir(suivi: string): Promise<RefusSurLePassage | undefined> {
    const resultat = await this.atelier.rouvrir(new SuiviId(suivi));
    return resultat.ok ? undefined : resultat.error.code;
  }
}
