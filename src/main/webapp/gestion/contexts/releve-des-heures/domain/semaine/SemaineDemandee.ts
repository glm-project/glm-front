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

const neNommeRien = (parametres: ParametresDeSemaine): boolean => parametres.annee === undefined && parametres.semaine === undefined;

const depuisLesNombres = (annee: number, numero: number): SemaineDemandee =>
  SemaineISO.erreur(annee, numero) === undefined ? connue(new SemaineISO(annee, numero)) : refusee;

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
