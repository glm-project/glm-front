import { components } from '@/app/generated/schema';

type DeepReadonly<T> = T extends readonly (infer Element)[]
  ? readonly DeepReadonly<Element>[]
  : T extends object
    ? { readonly [champ in keyof T]: DeepReadonly<T[champ]> }
    : T;

type ReferentielApi = DeepReadonly<components['schemas']['RestReferentielDuPupitre']>;

const referentielParDefaut = {
  dureeMaximaleDActivite: 'PT13H',
  genereLe: '2026-09-05T08:05:00Z',
  operateurs: [],
  suivis: [],
  categories: [],
} satisfies ReferentielApi;

export const referentielApiFixture = (champs: Partial<ReferentielApi> = {}): ReferentielApi => ({
  ...referentielParDefaut,
  ...champs,
});
