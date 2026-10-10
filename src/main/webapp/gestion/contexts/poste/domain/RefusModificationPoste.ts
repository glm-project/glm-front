import { LibellePosteDejaUtilise } from './LibellePosteDejaUtilise';
import { NatureInconnue } from './NatureInconnue';
import { PosteIntrouvable } from './PosteIntrouvable';

export type RefusModificationPoste = LibellePosteDejaUtilise | PosteIntrouvable | NatureInconnue;
