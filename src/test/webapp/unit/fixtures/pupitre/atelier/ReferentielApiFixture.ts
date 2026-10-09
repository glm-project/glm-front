import { components } from '@/app/generated/schema';

type ChampsDuReferentiel = { readonly [champ in keyof components['schemas']['RestReferentielDuPupitre']]?: unknown };

export const referentielApiFixture = (champs: ChampsDuReferentiel = {}): ChampsDuReferentiel => ({
  dureeMaximaleDActivite: 'PT13H',
  genereLe: '2026-09-05T08:05:00Z',
  operateurs: [],
  suivis: [],
  categories: [],
  ...champs,
});
