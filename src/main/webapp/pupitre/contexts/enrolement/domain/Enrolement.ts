import { ChargementDeLAtelier } from './ChargementDeLAtelierPort';
import { CodeDEnrolement, VueDuCodeDEnrolement } from './CodeDEnrolement';

export type IssueDEnrolement = 'ENROLE' | 'REFUSE' | 'EXPIRE' | 'INJOIGNABLE';

type EtapeDEnrolement =
  | { readonly kind: 'DEMANDE_EN_COURS' }
  | { readonly kind: 'EN_ATTENTE_D_APPROBATION'; readonly code: CodeDEnrolement }
  | { readonly kind: 'EXPIRE' }
  | { readonly kind: 'REFUSE' }
  | { readonly kind: 'ERREUR_RESEAU_INITIALE' }
  | { readonly kind: 'ENROLE' };

type EtapeSansCode = Exclude<EtapeDEnrolement, { readonly kind: 'EN_ATTENTE_D_APPROBATION' }>;

export type VueDEnrolement =
  | { readonly kind: 'DEMANDE_EN_COURS' }
  | { readonly kind: 'EN_ATTENTE_D_APPROBATION'; readonly code: VueDuCodeDEnrolement }
  | { readonly kind: 'EXPIRE' }
  | { readonly kind: 'REFUSE' }
  | { readonly kind: 'ERREUR_RESEAU_INITIALE' }
  | { readonly kind: 'VALIDE_CHARGEMENT_ATELIER' }
  | { readonly kind: 'ATTENTE_RESEAU_ATELIER' }
  | { readonly kind: 'ENROLE_ET_PRET' };

const ETAPE_APRES_TENTATIVE: Record<IssueDEnrolement, EtapeSansCode['kind']> = {
  ENROLE: 'ENROLE',
  REFUSE: 'REFUSE',
  EXPIRE: 'EXPIRE',
  INJOIGNABLE: 'ERREUR_RESEAU_INITIALE',
};

const vueDuChargement = ({ referentielDisponible, connecte }: ChargementDeLAtelier): VueDEnrolement => {
  if (referentielDisponible) {
    return { kind: 'ENROLE_ET_PRET' };
  }
  return connecte ? { kind: 'VALIDE_CHARGEMENT_ATELIER' } : { kind: 'ATTENTE_RESEAU_ATELIER' };
};

export class Enrolement {
  private constructor(private readonly etape: EtapeDEnrolement) {}

  static demande(): Enrolement {
    return new Enrolement({ kind: 'DEMANDE_EN_COURS' });
  }

  afterShowingCode(code: CodeDEnrolement): Enrolement {
    return new Enrolement({ kind: 'EN_ATTENTE_D_APPROBATION', code });
  }

  afterAttempting(issue: IssueDEnrolement): Enrolement {
    return new Enrolement({ kind: ETAPE_APRES_TENTATIVE[issue] });
  }

  vue(maintenant: number, chargement: ChargementDeLAtelier): VueDEnrolement {
    if (this.etape.kind === 'EN_ATTENTE_D_APPROBATION') {
      const code = this.etape.code;
      return code.aExpire(maintenant) ? { kind: 'EXPIRE' } : { kind: 'EN_ATTENTE_D_APPROBATION', code: code.snapshot(maintenant) };
    }
    if (this.etape.kind === 'ENROLE') {
      return vueDuChargement(chargement);
    }
    return { kind: this.etape.kind };
  }
}
