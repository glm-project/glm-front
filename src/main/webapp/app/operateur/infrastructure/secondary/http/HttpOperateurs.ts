import { components } from '@/app/api/schema';
import { Operateur } from '@/app/operateur/domain/Operateur';
import { OperateursPort } from '@/app/operateur/domain/OperateursPort';
import { PosteHabilite } from '@/app/operateur/domain/PosteHabilite';
import { ClientApi } from '@/app/shared/api-client/infrastructure/secondary/ClientApi';
import { Extrait } from '@/app/shared/pagination/domain/Extrait';
import { extraitDe, PLAFOND_DE_PAGE } from '@/app/shared/pagination/infrastructure/secondary/extraitDe';
import { inject, Injectable } from '@angular/core';

type RestOperateur = components['schemas']['RestOperateur'];
type RestPosteHabilite = components['schemas']['RestPosteHabilite'];

const versPosteHabilite = (poste: RestPosteHabilite): PosteHabilite => new PosteHabilite(poste.id, poste.libelle);

const versOperateur = (operateur: RestOperateur): Operateur =>
  new Operateur(operateur.id, operateur.nom, operateur.prenom, (operateur.postes ?? []).map(versPosteHabilite), operateur.matricule);

@Injectable()
export class HttpOperateurs extends OperateursPort {
  private readonly api = inject(ClientApi);

  override async operateurs(): Promise<Extrait<Operateur>> {
    const page = await this.api.lire('/api/operateurs', { parametres: { size: PLAFOND_DE_PAGE } });

    return extraitDe(page, versOperateur);
  }
}
