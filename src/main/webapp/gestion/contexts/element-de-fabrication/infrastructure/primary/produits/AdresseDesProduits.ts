import { ParamMap, Params } from '@angular/router';
import { CategorieDeProduit } from '../../../domain/CategorieDeProduit';
import { CYCLE_PAR_DEFAUT, CycleDuProduit, CYCLES_DU_PRODUIT } from '../../../domain/CycleDuProduit';
import { RequeteProduits } from '../../../domain/RequeteProduits';

const ETATS: Record<CycleDuProduit, string> = {
  EN_PREPARATION: 'en-preparation',
  EN_ATELIER: 'en-atelier',
  CLOTURE: 'clotures',
};

const cycleLu = (etat: string | null): CycleDuProduit => CYCLES_DU_PRODUIT.find(cycle => ETATS[cycle] === etat) ?? CYCLE_PAR_DEFAUT;

const categorieLue = (code: string | null): CategorieDeProduit | undefined => {
  if (code === null) return undefined;
  return CategorieDeProduit.erreur(code) === undefined ? new CategorieDeProduit(code) : undefined;
};

const pageLue = (page: string | null): number => {
  const numero = Number(page);
  return Number.isInteger(numero) && numero >= 1 ? numero - 1 : 0;
};

export const requeteDeLAdresse = (parametres: ParamMap): RequeteProduits =>
  new RequeteProduits({
    cycle: cycleLu(parametres.get('etat')),
    categorie: categorieLue(parametres.get('categorie')),
    recherche: parametres.get('recherche') ?? '',
    page: pageLue(parametres.get('page')),
  });

export const adresseDeLaRequete = (requete: RequeteProduits): Params => ({
  etat: ETATS[requete.cycle],
  ...(requete.categorie === undefined ? {} : { categorie: requete.categorie.value }),
  ...(requete.recherche === '' ? {} : { recherche: requete.recherche }),
  ...(requete.page === 0 ? {} : { page: requete.page + 1 }),
});
