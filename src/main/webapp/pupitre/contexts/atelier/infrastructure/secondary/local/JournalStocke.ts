import {
  JournalDuPupitre,
  ReferentielDuPupitre,
  SuiviDuPupitre,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';

const CATEGORIE_DU_TYPE = { ORDRE_DE_FABRICATION: 'OF', PRODUIT: 'MOULE' } as const;

type SuiviStockeAvantLesCategories = Omit<SuiviDuPupitre, 'categorie'> & { readonly type: keyof typeof CATEGORIE_DU_TYPE };

type SuiviStocke = SuiviDuPupitre | SuiviStockeAvantLesCategories;

type ReferentielStocke = Omit<ReferentielDuPupitre, 'suivis'> & { readonly suivis: readonly SuiviStocke[] };

export type JournalStocke = Omit<JournalDuPupitre, 'referentiel'> & { readonly referentiel?: ReferentielStocke };

const toSuiviDuPupitre = (suivi: SuiviStocke): SuiviDuPupitre => {
  if ('categorie' in suivi) {
    return suivi;
  }
  const { type, ...reste } = suivi;
  return { ...reste, categorie: CATEGORIE_DU_TYPE[type] };
};

export const toJournalDuPupitre = ({ referentiel, ...journal }: JournalStocke): JournalDuPupitre =>
  referentiel === undefined ? journal : { ...journal, referentiel: { ...referentiel, suivis: referentiel.suivis.map(toSuiviDuPupitre) } };
