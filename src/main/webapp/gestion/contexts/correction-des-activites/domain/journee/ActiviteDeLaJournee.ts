import { ActiviteDeLaJourneeId } from './ActiviteDeLaJourneeId';
import { BornesDuJour } from './BornesDuJour';
import { CategorieDActivite } from './CategorieDActivite';
import { Duree } from './Duree';
import { ElementDeLaJournee } from './ElementDeLaJournee';
import { EtatDActivite } from './EtatDActivite';
import { InstantDeLaJournee } from './InstantDeLaJournee';
import { JourACorriger } from './JourACorriger';
import { PortionDeJour } from './PortionDeJour';
import { PosteDeLaJournee } from './PosteDeLaJournee';
import { SuiviDAtelierId } from './SuiviDAtelierId';

export interface FicheDActiviteDeLaJournee {
  readonly id: ActiviteDeLaJourneeId;
  readonly suivi: SuiviDAtelierId;
  readonly element: ElementDeLaJournee;
  readonly poste: PosteDeLaJournee | undefined;
  readonly categorie: CategorieDActivite;
  readonly debut: InstantDeLaJournee;
  readonly etat: EtatDActivite;
  readonly autresJours: readonly PortionDeJour[];
}

const finitAvantDeCommencer = (fiche: FicheDActiviteDeLaJournee): boolean =>
  fiche.etat.kind !== 'EN_COURS' && fiche.etat.fin.estAvant(fiche.debut);

const lePremier = (jours: readonly JourACorriger[]): JourACorriger | undefined =>
  jours.reduce<JourACorriger | undefined>((premier, jour) => (premier === undefined || jour.estAvant(premier) ? jour : premier), undefined);

const leDernier = (jours: readonly JourACorriger[]): JourACorriger | undefined =>
  jours.reduce<JourACorriger | undefined>((dernier, jour) => (dernier === undefined || jour.estApres(dernier) ? jour : dernier), undefined);

export class ActiviteDeLaJournee {
  readonly id: ActiviteDeLaJourneeId;
  readonly suivi: SuiviDAtelierId;
  readonly element: ElementDeLaJournee;
  readonly poste: PosteDeLaJournee | undefined;
  readonly categorie: CategorieDActivite;
  readonly debut: InstantDeLaJournee;
  readonly etat: EtatDActivite;
  readonly autresJours: readonly PortionDeJour[];

  constructor(fiche: FicheDActiviteDeLaJournee) {
    if (finitAvantDeCommencer(fiche)) {
      throw new Error('L’activité reçue du serveur finit avant de commencer.');
    }
    this.id = fiche.id;
    this.suivi = fiche.suivi;
    this.element = fiche.element;
    this.poste = fiche.poste;
    this.categorie = fiche.categorie;
    this.debut = fiche.debut;
    this.etat = fiche.etat;
    this.autresJours = [...fiche.autresJours];
  }

  debutAvantLeJour(bornes: BornesDuJour): InstantDeLaJournee | undefined {
    return this.debut.estAvant(bornes.debut) ? this.debut : undefined;
  }

  finApresLeJour(bornes: BornesDuJour): InstantDeLaJournee | undefined {
    return this.etat.kind !== 'EN_COURS' && bornes.fin.estAvant(this.etat.fin) ? this.etat.fin : undefined;
  }

  debutSurLeJour(bornes: BornesDuJour): InstantDeLaJournee {
    return this.debutAvantLeJour(bornes) === undefined ? this.debut : bornes.debut;
  }

  finSurLeJour(bornes: BornesDuJour): InstantDeLaJournee | undefined {
    if (this.etat.kind === 'EN_COURS') {
      return undefined;
    }
    return this.finApresLeJour(bornes) === undefined ? this.etat.fin : bornes.fin;
  }

  jourDuDebut(jour: JourACorriger): JourACorriger | undefined {
    return lePremier(this.joursComptes().filter(compte => compte.estAvant(jour)));
  }

  jourDeLaFin(jour: JourACorriger): JourACorriger | undefined {
    return leDernier(this.joursComptes().filter(compte => compte.estApres(jour)));
  }

  dureeTotale(): Duree | undefined {
    if (this.etat.kind === 'EN_COURS') {
      return undefined;
    }
    return this.autresJours.reduce((total, portion) => total.plus(portion.duree), this.etat.dureeSurLeJour);
  }

  private joursComptes(): readonly JourACorriger[] {
    return this.autresJours.map(portion => portion.jour);
  }
}
