import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { Page } from '@/app/shared/pagination/domain/Page';
import { buildPageFrom, PAGE_SIZE } from '@/app/shared/pagination/infrastructure/secondary/buildPageFrom';
import { Operateur } from '@/gestion/contexts/operateur/domain/Operateur';
import { OperateursPort } from '@/gestion/contexts/operateur/domain/OperateursPort';
import { PosteHabilite } from '@/gestion/contexts/operateur/domain/PosteHabilite';
import { inject, Injectable } from '@angular/core';

type RestOperateur = components['schemas']['RestOperateur'];
type RestPosteHabilite = components['schemas']['RestPosteHabilite'];

const toPosteHabilite = (poste: RestPosteHabilite): PosteHabilite => new PosteHabilite(poste.id, poste.libelle);

const toOperateur = (operateur: RestOperateur): Operateur =>
  new Operateur(operateur.id, operateur.nom, operateur.prenom, operateur.postes.map(toPosteHabilite), operateur.matricule);

@Injectable()
export class HttpOperateurs extends OperateursPort {
  private readonly api = inject(ApiClient);

  override async operateurs(): Promise<Page<Operateur>> {
    const page = await this.api.read('/api/operateurs', { queryParams: { size: PAGE_SIZE } });

    return buildPageFrom(page, toOperateur);
  }
}
