import { AdresseDossier, DossierAnomalie } from './DossierAnomalie';

type Origine = Pick<DossierAnomalie, 'etat' | 'enConflit'>;
type Apres = Pick<DossierAnomalie, 'enConflit' | 'finAutomatique' | 'ligne' | 'activites'>;

export class IssueDeLAnomalie {
  private constructor(
    readonly kind: 'TRAITEE' | 'CONFLIT_RESTANT' | 'CONFLIT_LEVE_FIN_AUTOMATIQUE_RESTANTE' | 'ANOMALIE_RESTANTE',
    readonly finsAutomatiquesRestantes: readonly AdresseDossier[],
  ) {}

  static depuis(origine: Origine, apres: Apres): IssueDeLAnomalie {
    const kind = IssueDeLAnomalie.estUnConflit(origine)
      ? IssueDeLAnomalie.issueDUnConflit(apres)
      : IssueDeLAnomalie.issueDUneFinAutomatique(apres);
    return new IssueDeLAnomalie(kind, IssueDeLAnomalie.finsAutomatiquesRestantes(apres));
  }

  private static estUnConflit(origine: Origine): boolean {
    return origine.etat !== 'FIN_AUTOMATIQUE' && origine.enConflit;
  }

  private static issueDUnConflit(apres: Apres): IssueDeLAnomalie['kind'] {
    if (apres.enConflit) return 'CONFLIT_RESTANT';
    return apres.finAutomatique ? 'CONFLIT_LEVE_FIN_AUTOMATIQUE_RESTANTE' : 'TRAITEE';
  }

  private static issueDUneFinAutomatique(apres: Apres): IssueDeLAnomalie['kind'] {
    return apres.enConflit || apres.finAutomatique ? 'ANOMALIE_RESTANTE' : 'TRAITEE';
  }

  private static finsAutomatiquesRestantes(apres: Apres): readonly AdresseDossier[] {
    return apres.activites
      .filter(activite => activite.etat === 'ECHUE')
      .map(activite => ({ suivi: apres.ligne.adresse.suivi, pointage: activite.ouvrant }));
  }
}
