import { JourCalendaire } from './JourCalendaire';
import { SemaineISO } from './SemaineISO';

export type JourDemande =
  { readonly kind: 'ABSENT' } | { readonly kind: 'NOMME'; readonly jour: JourCalendaire } | { readonly kind: 'REFUSE' };

const refuse: JourDemande = { kind: 'REFUSE' };

const nomme = (jour: JourCalendaire): JourDemande => ({ kind: 'NOMME', jour });

export const jourDemande = (texte: string | undefined, semaine: SemaineISO): JourDemande => {
  if (texte === undefined) {
    return { kind: 'ABSENT' };
  }
  const jour = JourCalendaire.lire(texte);
  if (jour === undefined) {
    return refuse;
  }
  return semaine.jours().some(candidat => candidat.estLeMeme(jour)) ? nomme(jour) : refuse;
};
