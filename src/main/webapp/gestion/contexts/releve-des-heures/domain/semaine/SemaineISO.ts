import { JourCalendaire } from './JourCalendaire';

const PREMIERE_ANNEE = 2000;
const DERNIERE_ANNEE = 2999;
const PREMIERE_SEMAINE = 1;
const SEMAINES_COURTES = 52;
const JOURS_PAR_SEMAINE = 7;
const LUNDI = 1;
const JEUDI = 4;

/** Le 4 janvier est la seule date dont la norme garantit qu'elle tombe dans la semaine 1 de son année ISO. */
const lundiDeLaPremiereSemaine = (annee: number): JourCalendaire => {
  const quatreJanvier = new JourCalendaire(`${annee}-01-04`);
  return quatreJanvier.plus(LUNDI - quatreJanvier.jourDeLaSemaine());
};

/**
 * Une année porte 53 semaines quand elle commence ou finit un jeudi. C'est la forme équivalente, et sans
 * calcul de bissextilité, de la règle « le 1er janvier est un jeudi, ou l'année est bissextile et le 1er
 * janvier est un mercredi ».
 */
const estAnneeLongue = (annee: number): boolean =>
  new JourCalendaire(`${annee}-01-01`).jourDeLaSemaine() === JEUDI || new JourCalendaire(`${annee}-12-31`).jourDeLaSemaine() === JEUDI;

const anneeHorsBornes = (annee: number): boolean => !Number.isInteger(annee) || annee < PREMIERE_ANNEE || annee > DERNIERE_ANNEE;

const numeroHorsBornes = (annee: number, numero: number): boolean =>
  !Number.isInteger(numero) || numero < PREMIERE_SEMAINE || numero > SemaineISO.nombreDeSemaines(annee);

/**
 * Une semaine ISO, désignée par son année et son numéro. L'année est celle des semaines, pas celle du
 * calendrier : la semaine 1 de 2026 commence le 29 décembre 2025.
 */
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

  /**
   * Cette garde est la seule protection contre le back, qui accepte en silence la semaine 53 d'une année qui
   * n'en a que 52 et rend alors la première semaine de l'année suivante.
   */
  static nombreDeSemaines(annee: number): number {
    return estAnneeLongue(annee) ? SEMAINES_COURTES + 1 : SEMAINES_COURTES;
  }

  /** C'est le jeudi qui donne l'année ISO d'une semaine : lui seul tombe toujours dans l'année de sa semaine. */
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
