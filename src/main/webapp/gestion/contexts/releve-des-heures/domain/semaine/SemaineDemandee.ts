import { JourCalendaire } from './JourCalendaire';
import { SemaineISO } from './SemaineISO';

const ENTIER = /^\d{1,4}$/;

export interface ParametresDeSemaine {
  readonly annee: string | undefined;
  readonly semaine: string | undefined;
}

export type SemaineDemandee = { readonly estConnue: true; readonly semaine: SemaineISO } | { readonly estConnue: false };

const connue = (semaine: SemaineISO): SemaineDemandee => ({ estConnue: true, semaine });
const refusee: SemaineDemandee = { estConnue: false };

const nombreDe = (valeur: string): number | undefined => (ENTIER.test(valeur) ? Number(valeur) : undefined);

/** Aucun paramètre : c'est le cas nominal, la semaine en cours, et non une erreur. */
const neNommeRien = (parametres: ParametresDeSemaine): boolean => parametres.annee === undefined && parametres.semaine === undefined;

const depuisLesNombres = (annee: number, numero: number): SemaineDemandee =>
  SemaineISO.erreur(annee, numero) === undefined ? connue(new SemaineISO(annee, numero)) : refusee;

/**
 * Ce que l'URL désigne. Nommée à moitié, illisible, hors bornes ou inexistante au calendrier, la semaine est
 * refusée : l'écran l'explique et ne demande rien au serveur, ce qui rend le 400 de l'API inatteignable.
 */
export const semaineDemandee = (parametres: ParametresDeSemaine, jourCourant: JourCalendaire): SemaineDemandee => {
  if (neNommeRien(parametres)) {
    return connue(SemaineISO.contenant(jourCourant));
  }
  const { annee, semaine } = parametres;
  if (annee === undefined) {
    return refusee;
  }
  if (semaine === undefined) {
    return refusee;
  }
  const anneeLue = nombreDe(annee);
  const numeroLu = nombreDe(semaine);
  if (anneeLue === undefined) {
    return refusee;
  }
  if (numeroLu === undefined) {
    return refusee;
  }
  return depuisLesNombres(anneeLue, numeroLu);
};
