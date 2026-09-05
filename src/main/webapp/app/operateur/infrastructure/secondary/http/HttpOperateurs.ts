import { components } from '@/app/generated/schema';
import { Operateur } from '@/app/operateur/domain/Operateur';
import { OperateursPort } from '@/app/operateur/domain/OperateursPort';
import { PosteHabilite } from '@/app/operateur/domain/PosteHabilite';
import { ClientApi } from '@/app/shared/api-client/infrastructure/secondary/ClientApi';
import { Extrait } from '@/app/shared/pagination/domain/Extrait';
import { buildExtraitFrom, PLAFOND_DE_PAGE } from '@/app/shared/pagination/infrastructure/secondary/buildExtraitFrom';
import { inject, Injectable } from '@angular/core';

type RestOperateur = components['schemas']['RestOperateur'];
type RestPosteHabilite = components['schemas']['RestPosteHabilite'];

const toPosteHabilite = (poste: RestPosteHabilite): PosteHabilite => new PosteHabilite(poste.id, poste.libelle);

const toOperateur = (operateur: RestOperateur): Operateur =>
  new Operateur(operateur.id, operateur.nom, operateur.prenom, (operateur.postes ?? []).map(toPosteHabilite), operateur.matricule);

@Injectable()
export class HttpOperateurs extends OperateursPort {
  private readonly api = inject(ClientApi);

  override async operateurs(): Promise<Extrait<Operateur>> {
    const page = await this.api.read('/api/operateurs', { parametres: { size: PLAFOND_DE_PAGE } });

    return buildExtraitFrom(page, toOperateur);
  }
}
