import { AdresseDossier, DossierAnomalie, NatureAnomalie } from './DossierAnomalie';

type Origine = Pick<DossierAnomalie, 'etat' | 'enConflit'> & { readonly ligne: Pick<DossierAnomalie['ligne'], 'adresse'> };
type Apres = Pick<DossierAnomalie, 'enConflit' | 'finAutomatique' | 'ligne' | 'activites'>;

export class IssueDeLActe {
  private constructor(
    readonly kind: 'TRAITEE' | 'CONFLIT_RESTANT' | 'CONFLIT_LEVE_FIN_AUTOMATIQUE_RESTANTE' | 'ANOMALIE_RESTANTE',
    readonly finsAutomatiquesRestantes: readonly AdresseDossier[],
  ) {}

  static depuis(origine: Origine, apres: Apres): IssueDeLActe {
    const kind =
      IssueDeLActe.natureDe(origine) === 'CONFLIT' ? IssueDeLActe.issueDUnConflit(apres) : IssueDeLActe.issueDUneFinAutomatique(apres);
    return new IssueDeLActe(kind, IssueDeLActe.finsAutomatiquesRestantesAilleursQue(origine.ligne.adresse, apres));
  }

  private static natureDe(origine: Origine): NatureAnomalie {
    return origine.etat !== 'FIN_AUTOMATIQUE' && origine.enConflit ? 'CONFLIT' : 'FIN_AUTOMATIQUE';
  }

  private static issueDUnConflit(apres: Apres): IssueDeLActe['kind'] {
    if (apres.enConflit) return 'CONFLIT_RESTANT';
    return apres.finAutomatique ? 'CONFLIT_LEVE_FIN_AUTOMATIQUE_RESTANTE' : 'TRAITEE';
  }

  private static issueDUneFinAutomatique(apres: Apres): IssueDeLActe['kind'] {
    return apres.enConflit || apres.finAutomatique ? 'ANOMALIE_RESTANTE' : 'TRAITEE';
  }

  private static finsAutomatiquesRestantesAilleursQue(adresse: AdresseDossier, apres: Apres): readonly AdresseDossier[] {
    if (!apres.finAutomatique) return [];
    return apres.activites
      .filter(activite => activite.etat === 'ECHUE')
      .map(activite => ({ suivi: apres.ligne.adresse.suivi, pointage: activite.ouvrant }))
      .filter(restante => !(restante.suivi.equals(adresse.suivi) && restante.pointage.equals(adresse.pointage)));
  }
}
