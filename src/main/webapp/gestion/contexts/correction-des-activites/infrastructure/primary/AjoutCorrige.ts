import { PortionsDeLAjout } from '../../domain/correction/PortionsDeLAjout';

export type AjoutCorrige = { readonly issue: 'JOURNEE_CHANGEE' } | { readonly issue: 'ENREGISTREE'; readonly portions: PortionsDeLAjout };
