import { JourCalendaire } from './JourCalendaire';

const PREMIERE_ANNEE = 2000;
const DERNIERE_ANNEE = 2999;
const PREMIERE_SEMAINE = 1;
const SEMAINES_COURTES = 52;
const JOURS_PAR_SEMAINE = 7;
const LUNDI = 1;
const JEUDI = 4;

const lundiDeLaPremiereSemaine = (annee: number): JourCalendaire => {
  const quatreJanvier = new JourCalendaire(`${annee}-01-04`);
  return quatreJanvier.plus(LUNDI - quatreJanvier.jourDeLaSemaine());
};

const estAnneeLongue = (annee: number): boolean =>
  new JourCalendaire(`${annee}-01-01`).jourDeLaSemaine() === JEUDI || new JourCalendaire(`${annee}-12-31`).jourDeLaSemaine() === JEUDI;

const anneeHorsBornes = (annee: number): boolean => !Number.isInteger(annee) || annee < PREMIERE_ANNEE || annee > DERNIERE_ANNEE;

const numeroHorsBornes = (annee: number, numero: number): boolean =>
  !Number.isInteger(numero) || numero < PREMIERE_SEMAINE || numero > SemaineISO.nombreDeSemaines(annee);

export class SemaineISO {
  constructor(
    readonly annee: number,
    readonly numero: number,
  ) {
    const erreur = SemaineISO.erreur(annee, numero);
    if (erreur !== undefined) {
      throw new Error(erreur);
    }
  }

  static erreur(annee: number, numero: number): string | undefined {
    if (anneeHorsBornes(annee)) {
      return `L’année d’une semaine se situe entre ${PREMIERE_ANNEE} et ${DERNIERE_ANNEE}.`;
    }
    if (numeroHorsBornes(annee, numero)) {
      return `L’année ${annee} ne porte pas de semaine ${numero}.`;
    }
    return undefined;
  }

  static nombreDeSemaines(annee: number): number {
    return estAnneeLongue(annee) ? SEMAINES_COURTES + 1 : SEMAINES_COURTES;
  }

  static contenant(jour: JourCalendaire): SemaineISO {
    const jeudi = jour.plus(JEUDI - jour.jourDeLaSemaine());
    const annee = Number(jeudi.value.slice(0, 4));
    const lundi = jeudi.plus(LUNDI - JEUDI);
    const numero = (lundi.jourEpoque - lundiDeLaPremiereSemaine(annee).jourEpoque) / JOURS_PAR_SEMAINE + 1;
    return new SemaineISO(annee, numero);
  }

  lundi(): JourCalendaire {
    return lundiDeLaPremiereSemaine(this.annee).plus((this.numero - 1) * JOURS_PAR_SEMAINE);
  }

  dimanche(): JourCalendaire {
    return this.lundi().plus(JOURS_PAR_SEMAINE - 1);
  }

  jours(): readonly JourCalendaire[] {
    const lundi = this.lundi();
    return Array.from({ length: JOURS_PAR_SEMAINE }, (_, rang) => lundi.plus(rang));
  }

  precedente(): SemaineISO | undefined {
    if (this.numero > PREMIERE_SEMAINE) {
      return new SemaineISO(this.annee, this.numero - 1);
    }
    if (this.annee === PREMIERE_ANNEE) {
      return undefined;
    }
    return new SemaineISO(this.annee - 1, SemaineISO.nombreDeSemaines(this.annee - 1));
  }

  suivante(): SemaineISO | undefined {
    if (this.numero < SemaineISO.nombreDeSemaines(this.annee)) {
      return new SemaineISO(this.annee, this.numero + 1);
    }
    if (this.annee === DERNIERE_ANNEE) {
      return undefined;
    }
    return new SemaineISO(this.annee + 1, PREMIERE_SEMAINE);
  }

  estApres(autre: SemaineISO): boolean {
    if (this.annee !== autre.annee) {
      return this.annee > autre.annee;
    }
    return this.numero > autre.numero;
  }

  estLaMeme(autre: SemaineISO): boolean {
    if (this.annee !== autre.annee) {
      return false;
    }
    return this.numero === autre.numero;
  }
}
