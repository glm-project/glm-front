import { JourCalendaire } from '../semaine/JourCalendaire';
import { JourDemande } from '../semaine/JourDemande';
import { SemaineISO } from '../semaine/SemaineISO';
import { ReleveDesHeures } from './ReleveDesHeures';

export type JourAOuvrir = Exclude<JourDemande, { readonly kind: 'REFUSE' }>;

const jourDeduit = (semaine: SemaineISO, releve: ReleveDesHeures, aujourdhui: JourCalendaire): JourCalendaire | undefined => {
  if (SemaineISO.contenant(aujourdhui).estLaMeme(semaine)) {
    return aujourdhui;
  }
  return releve.jours.find(jour => jour.aDesPointages())?.jour;
};

export const jourOuvert = (
  demande: JourAOuvrir,
  semaine: SemaineISO,
  releve: ReleveDesHeures,
  aujourdhui: JourCalendaire,
): JourCalendaire | undefined => (demande.kind === 'NOMME' ? demande.jour : jourDeduit(semaine, releve, aujourdhui));
