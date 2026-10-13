import { ActiviteDeLaJournee, ActiviteTerminee } from './ActiviteDeLaJournee';
import { BornesDuJour } from './BornesDuJour';
import { ChoixDAjout } from './ChoixDAjout';
import { Duree } from './Duree';
import { InstantDeLaJournee } from './InstantDeLaJournee';
import { JourACorriger } from './JourACorriger';
import { OperateurDeLaJournee } from './OperateurDeLaJournee';
import { SuiviPresent } from './SuiviPresent';

export interface ContenuDeLaJournee {
  readonly operateur: OperateurDeLaJournee;
  readonly jour: JourACorriger;
  readonly bornes: BornesDuJour;
  readonly dureeOperationnelle: Duree;
  readonly activites: readonly ActiviteDeLaJournee[];
  readonly choix: ChoixDAjout;
}

const suiviPresentDe = (choix: ChoixDAjout, activite: ActiviteDeLaJournee): SuiviPresent => {
  const suivi = choix.suivis.de(activite.suivi);
  if (suivi === undefined) {
    throw new Error('Le suivi de l’activité reçue du serveur n’est pas présent ce jour-là.');
  }
  if (suivi.element.id.value !== activite.element.id.value) {
    throw new Error('L’élément de l’activité reçue du serveur n’est pas celui de son suivi.');
  }
  return suivi;
};

export class JourneeACorriger {
  readonly operateur: OperateurDeLaJournee;
  readonly jour: JourACorriger;
  readonly bornes: BornesDuJour;
  readonly dureeOperationnelle: Duree;
  readonly activites: readonly ActiviteDeLaJournee[];
  readonly choix: ChoixDAjout;
  private readonly clotures: ReadonlyMap<string, InstantDeLaJournee | undefined>;

  constructor(contenu: ContenuDeLaJournee) {
    this.operateur = contenu.operateur;
    this.jour = contenu.jour;
    this.bornes = contenu.bornes;
    this.dureeOperationnelle = contenu.dureeOperationnelle;
    this.activites = [...contenu.activites];
    this.choix = contenu.choix;
    this.clotures = new Map(contenu.activites.map(activite => [activite.id.value, suiviPresentDe(contenu.choix, activite).clotureLe]));
  }

  clotureDe(activite: ActiviteDeLaJournee): InstantDeLaJournee | undefined {
    return this.clotures.get(activite.id.value);
  }

  estCorrigeable(activite: ActiviteDeLaJournee): activite is ActiviteTerminee {
    return activite.estTerminee() && this.clotureDe(activite) === undefined;
  }
}
