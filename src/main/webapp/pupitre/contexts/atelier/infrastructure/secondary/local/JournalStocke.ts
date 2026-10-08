import {
  JournalDuPupitre,
  ReferentielDuPupitre,
  SuiviDuPupitre,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';

const CATEGORIE_DU_TYPE = { ORDRE_DE_FABRICATION: 'OF', PRODUIT: 'MOULE' } as const;

type SuiviStockeAvantLesCategories = Omit<SuiviDuPupitre, 'categorie'> & { readonly type: keyof typeof CATEGORIE_DU_TYPE };

type SuiviStocke = SuiviDuPupitre | SuiviStockeAvantLesCategories;

type ReferentielStocke = Omit<ReferentielDuPupitre, 'suivis' | 'categories'> & {
  readonly suivis: readonly SuiviStocke[];
  readonly categories?: readonly string[];
};

export type JournalStocke = Omit<JournalDuPupitre, 'referentiel'> & { readonly referentiel?: ReferentielStocke };

const toSuiviDuPupitre = (suivi: SuiviStocke): SuiviDuPupitre => {
  if ('categorie' in suivi) {
    return suivi;
  }
  const { type, ...reste } = suivi;
  return { ...reste, categorie: CATEGORIE_DU_TYPE[type] };
};

const toReferentielDuPupitre = ({ suivis, categories, ...referentiel }: ReferentielStocke): ReferentielDuPupitre => ({
  ...referentiel,
  suivis: suivis.map(toSuiviDuPupitre),
  categories: categories ?? [],
});

export const toJournalDuPupitre = ({ referentiel, ...journal }: JournalStocke): JournalDuPupitre =>
  referentiel === undefined ? journal : { ...journal, referentiel: toReferentielDuPupitre(referentiel) };
