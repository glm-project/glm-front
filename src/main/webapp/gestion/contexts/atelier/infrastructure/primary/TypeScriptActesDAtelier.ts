import { inject, Injectable } from '@angular/core';
import { AtelierPort } from '../../domain/AtelierPort';
import { ElementEngageId } from '../../domain/ElementEngageId';

export type RefusDeMiseALAtelier = 'element-deja-a-l-atelier' | 'element-de-fabrication-introuvable';

@Injectable()
export class TypeScriptActesDAtelier {
  private readonly atelier = inject(AtelierPort);

  async mettreALAtelier(element: string): Promise<RefusDeMiseALAtelier | undefined> {
    const resultat = await this.atelier.mettreALAtelier(new ElementEngageId(element));
    return resultat.ok ? undefined : resultat.error.code;
  }
}
