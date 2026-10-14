import { CategorieDActivite } from '../journee/CategorieDActivite';
import { InstantDeLaJournee } from '../journee/InstantDeLaJournee';
import { JourneeACorriger } from '../journee/JourneeACorriger';
import { PosteDeLaJournee } from '../journee/PosteDeLaJournee';
import { PosteDeLaJourneeId } from '../journee/PosteDeLaJourneeId';
import { SuiviDAtelierId } from '../journee/SuiviDAtelierId';
import { SuiviPresent } from '../journee/SuiviPresent';
import { CalendrierLocal } from './CalendrierLocal';
import { ContenuDAjout } from './ContenuDAjout';
import { EffetSurLesJournees } from './EffetSurLesJournees';
import { PlageDAjout } from './PlageDAjout';

interface ChoixEnPreparation {
  readonly suivi: SuiviDAtelierId | undefined;
  readonly poste: PosteDeLaJourneeId | undefined;
  readonly categorie: CategorieDActivite;
}

export class AjoutEnPreparation {
  private constructor(
    private readonly choix: ChoixEnPreparation,
    private readonly saisie: PlageDAjout,
    private readonly tentee: boolean,
  ) {}

  static ouvrir(journee: JourneeACorriger, maintenant: InstantDeLaJournee, calendrier: CalendrierLocal): AjoutEnPreparation {
    return new AjoutEnPreparation(
      { suivi: undefined, poste: undefined, categorie: 'TRAVAIL' },
      PlageDAjout.pour(journee.bornes, journee.jour, maintenant, calendrier),
      false,
    );
  }

  get categorie(): CategorieDActivite {
    return this.choix.categorie;
  }

  avecSuivi(suivi: SuiviDAtelierId): AjoutEnPreparation {
    return new AjoutEnPreparation({ ...this.choix, suivi }, this.saisie, this.tentee);
  }

  avecPoste(poste: PosteDeLaJourneeId): AjoutEnPreparation {
    return new AjoutEnPreparation({ ...this.choix, poste }, this.saisie, this.tentee);
  }

  avecCategorie(categorie: CategorieDActivite): AjoutEnPreparation {
    return new AjoutEnPreparation({ ...this.choix, categorie }, this.saisie, this.tentee);
  }

  avecDebut(texte: string): AjoutEnPreparation {
    return new AjoutEnPreparation(this.choix, this.saisie.avecDebut(texte), this.tentee);
  }

  avecFin(texte: string): AjoutEnPreparation {
    return new AjoutEnPreparation(this.choix, this.saisie.avecFin(texte), this.tentee);
  }

  avecFinLeLendemain(): AjoutEnPreparation {
    return new AjoutEnPreparation(this.choix, this.saisie.avecFinLeLendemain(), this.tentee);
  }

  avecFinLeJourAffiche(): AjoutEnPreparation {
    return new AjoutEnPreparation(this.choix, this.saisie.avecFinLeJourAffiche(), this.tentee);
  }

  avecMaintenant(maintenant: InstantDeLaJournee): AjoutEnPreparation {
    return new AjoutEnPreparation(this.choix, this.saisie.avecMaintenant(maintenant), this.tentee);
  }

  apresUnEnvoi(): AjoutEnPreparation {
    return new AjoutEnPreparation(this.choix, this.saisie.apresUnEnvoi(), true);
  }

  suivi(journee: JourneeACorriger): SuiviPresent | undefined {
    return this.choix.suivi === undefined ? undefined : journee.choix.suivis.de(this.choix.suivi);
  }

  poste(journee: JourneeACorriger): PosteDeLaJournee | undefined {
    const postes = journee.choix.postes;
    return postes.find(poste => poste.id.value === this.choix.poste?.value) ?? postes[0];
  }

  plage(journee: JourneeACorriger): PlageDAjout {
    return this.saisie.avecSuivi(this.suivi(journee));
  }

  effet(journee: JourneeACorriger): EffetSurLesJournees | undefined {
    return EffetSurLesJournees.dUnAjout(journee, this.plage(journee));
  }

  elementManquant(journee: JourneeACorriger): boolean {
    return this.tentee && this.suivi(journee) === undefined;
  }

  contenu(journee: JourneeACorriger): ContenuDAjout | undefined {
    const suivi = this.suivi(journee);
    const poste = this.poste(journee);
    const portions = this.plage(journee).aEnvoyer();
    return suivi === undefined || poste === undefined || portions === undefined
      ? undefined
      : ContenuDAjout.de(journee.operateur, suivi, poste, this.choix.categorie, portions);
  }
}
