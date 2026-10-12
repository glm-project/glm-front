import { ParamMap, Params } from '@angular/router';
import { CategorieDeProduit } from '../../../domain/CategorieDeProduit';
import { CYCLE_PAR_DEFAUT, CycleDuProduit, CYCLES_DU_PRODUIT } from '../../../domain/CycleDuProduit';
import {
  PERIODE_DE_CLOTURE_PAR_DEFAUT,
  PeriodeDeCloture,
  periodeLibre,
  PrereglageDeCloture,
  PREREGLAGES_DE_CLOTURE,
} from '../../../domain/PeriodeDeCloture';
import { RequeteProduits } from '../../../domain/RequeteProduits';

const ETATS: Record<CycleDuProduit, string> = {
  EN_PREPARATION: 'en-preparation',
  EN_ATELIER: 'en-atelier',
  CLOTURE: 'clotures',
};

const PERIODES: Record<PrereglageDeCloture, string> = {
  CE_MOIS: 'ce-mois',
  TROIS_MOIS: '3-mois',
  DOUZE_MOIS: '12-mois',
};

const prereglageLu = (periode: string | null): PeriodeDeCloture => {
  const prereglage = PREREGLAGES_DE_CLOTURE.find(candidat => PERIODES[candidat] === periode);
  return prereglage === undefined ? PERIODE_DE_CLOTURE_PAR_DEFAUT : { prereglage };
};

const clotureLue = (parametres: ParamMap): PeriodeDeCloture =>
  periodeLibre(parametres.get('du') ?? '', parametres.get('au') ?? '') ?? prereglageLu(parametres.get('periode'));

const adresseDeLaCloture = (cloture: PeriodeDeCloture): Params => {
  if ('du' in cloture) return { du: cloture.du, au: cloture.au };
  return cloture.prereglage === 'DOUZE_MOIS' ? {} : { periode: PERIODES[cloture.prereglage] };
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
    cloture: clotureLue(parametres),
  });

export const adresseDeLaRequete = (requete: RequeteProduits): Params => ({
  etat: ETATS[requete.cycle],
  ...(requete.categorie === undefined ? {} : { categorie: requete.categorie.value }),
  ...(requete.recherche === '' ? {} : { recherche: requete.recherche }),
  ...(requete.cycle === 'CLOTURE' ? adresseDeLaCloture(requete.cloture) : {}),
  ...(requete.page === 0 ? {} : { page: requete.page + 1 }),
});
