import { components } from '@/app/api/schema';
import { ActiviteEnCours } from '@/app/atelier/domain/ActiviteEnCours';
import { EtatDAtelier } from '@/app/atelier/domain/EtatDAtelier';
import { SuiviDAtelier } from '@/app/atelier/domain/SuiviDAtelier';
import { Pointage, SuivisDAtelierPort } from '@/app/atelier/domain/SuivisDAtelierPort';
import { ClientApi } from '@/app/shared/api-client/infrastructure/secondary/ClientApi';
import { obligatoire } from '@/app/shared/api-client/infrastructure/secondary/obligatoire';
import { Extrait } from '@/app/shared/pagination/domain/Extrait';
import { extraitDe, PLAFOND_DE_PAGE } from '@/app/shared/pagination/infrastructure/secondary/extraitDe';
import { inject, Injectable } from '@angular/core';
import { envoyer } from '../envoiDAtelier';

type RestSuiviDAtelier = components['schemas']['RestSuiviDAtelier'];
type RestActiviteEnCours = components['schemas']['RestActiviteEnCours'];

const versActiviteEnCours = (activite: RestActiviteEnCours): ActiviteEnCours =>
  new ActiviteEnCours(
    obligatoire(activite.operateur, 'activite.operateur').id,
    obligatoire(activite.categorie, 'activite.categorie'),
    new Date(obligatoire(activite.depuis, 'activite.depuis')),
    activite.poste?.id,
  );

const versSuiviDAtelier = (suivi: RestSuiviDAtelier): SuiviDAtelier =>
  new SuiviDAtelier(
    obligatoire(suivi.id, 'suivi.id'),
    obligatoire(suivi.nom, 'suivi.nom'),
    obligatoire(suivi.etat, 'suivi.etat'),
    obligatoire(suivi.type, 'suivi.type'),
    (suivi.activitesEnCours ?? []).map(versActiviteEnCours),
  );

@Injectable()
export class HttpSuivisDAtelier extends SuivisDAtelierPort {
  private readonly api = inject(ClientApi);

  override async suivis(etats: readonly EtatDAtelier[]): Promise<Extrait<SuiviDAtelier>> {
    const page = await this.api.lire('/api/atelier/suivis', { parametres: { etats: [...etats], size: PLAFOND_DE_PAGE } });

    return extraitDe(page, versSuiviDAtelier);
  }

  override pointer(suiviId: string, pointage: Pointage): Promise<void> {
    return envoyer(() =>
      this.api.ecrire('/api/atelier/suivis/{id}/pointages', {
        chemin: { id: suiviId },
        corps: { operateur: pointage.operateurId, type: pointage.type, poste: pointage.posteId },
      }),
    );
  }
}
