import { JourCalendaire } from './JourCalendaire';

const PREMIERE_ANNEE = 2000;
const DERNIERE_ANNEE = 2999;
const PREMIERE_SEMAINE = 1;
const SEMAINES_COURTES = 52;
const JOURS_PAR_SEMAINE = 7;
const LUNDI = 1;
const JEUDI = 4;

const lundiDeLaPremiereSemaine = (annee: number): JourCalendaire => {
  const quatreJanvier = new JourCalendaire(`${String(annee)}-01-04`);
  return quatreJanvier.plus(LUNDI - quatreJanvier.jourDeLaSemaine());
};

const estAnneeLongue = (annee: number): boolean =>
  [`${String(annee)}-01-01`, `${String(annee)}-12-31`].some(jour => new JourCalendaire(jour).jourDeLaSemaine() === JEUDI);

const nombreDeSemaines = (annee: number): number => (estAnneeLongue(annee) ? SEMAINES_COURTES + 1 : SEMAINES_COURTES);

const anneeHorsBornes = (annee: number): boolean => !Number.isInteger(annee) || annee < PREMIERE_ANNEE || annee > DERNIERE_ANNEE;

const numeroHorsBornes = (annee: number, numero: number): boolean =>
  !Number.isInteger(numero) || numero < PREMIERE_SEMAINE || numero > nombreDeSemaines(annee);

export class SemaineISO {
  constructor(
    readonly annee: number,
    readonly numero: number,
  ) {
    if (anneeHorsBornes(annee)) {
      throw new Error(`L’année d’une semaine se situe entre ${String(PREMIERE_ANNEE)} et ${String(DERNIERE_ANNEE)}.`);
    }
    if (numeroHorsBornes(annee, numero)) {
      throw new Error(`L’année ${String(annee)} ne porte pas de semaine ${String(numero)}.`);
    }
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

  precedente(): SemaineISO {
    return SemaineISO.contenant(this.lundi().plus(-JOURS_PAR_SEMAINE));
  }

  suivante(): SemaineISO {
    return SemaineISO.contenant(this.lundi().plus(JOURS_PAR_SEMAINE));
  }

  estLaMeme(autre: SemaineISO): boolean {
    return this.annee === autre.annee && this.numero === autre.numero;
  }
}
