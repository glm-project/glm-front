import { components } from '@/app/api/schema';
import { ActiviteEnCours } from '@/app/atelier/domain/ActiviteEnCours';
import { EtatDAtelier } from '@/app/atelier/domain/EtatDAtelier';
import { SuiviDAtelier } from '@/app/atelier/domain/SuiviDAtelier';
import { Pointage, SuivisDAtelierPort } from '@/app/atelier/domain/SuivisDAtelierPort';
import { ClientApi } from '@/app/shared/api-client/infrastructure/secondary/ClientApi';
import { required } from '@/app/shared/api-client/infrastructure/secondary/required';
import { Extrait } from '@/app/shared/pagination/domain/Extrait';
import { buildExtraitFrom, PLAFOND_DE_PAGE } from '@/app/shared/pagination/infrastructure/secondary/buildExtraitFrom';
import { inject, Injectable } from '@angular/core';
import { send } from '../envoiDAtelier';

type RestSuiviDAtelier = components['schemas']['RestSuiviDAtelier'];
type RestActiviteEnCours = components['schemas']['RestActiviteEnCours'];

const toActiviteEnCours = (activite: RestActiviteEnCours): ActiviteEnCours =>
  new ActiviteEnCours(
    required(activite.operateur, 'activite.operateur').id,
    required(activite.categorie, 'activite.categorie'),
    new Date(required(activite.depuis, 'activite.depuis')),
    activite.poste?.id,
  );

const toSuiviDAtelier = (suivi: RestSuiviDAtelier): SuiviDAtelier =>
  new SuiviDAtelier(
    required(suivi.id, 'suivi.id'),
    required(suivi.nom, 'suivi.nom'),
    required(suivi.etat, 'suivi.etat'),
    required(suivi.type, 'suivi.type'),
    (suivi.activitesEnCours ?? []).map(toActiviteEnCours),
  );

@Injectable()
export class HttpSuivisDAtelier extends SuivisDAtelierPort {
  private readonly api = inject(ClientApi);

  override async suivis(etats: readonly EtatDAtelier[]): Promise<Extrait<SuiviDAtelier>> {
    const page = await this.api.read('/api/atelier/suivis', { parametres: { etats: [...etats], size: PLAFOND_DE_PAGE } });

    return buildExtraitFrom(page, toSuiviDAtelier);
  }

  override recordPointage(suiviId: string, pointage: Pointage): Promise<void> {
    return send(() =>
      this.api.write('/api/atelier/suivis/{id}/pointages', {
        chemin: { id: suiviId },
        body: { operateur: pointage.operateurId, type: pointage.type, poste: pointage.posteId },
      }),
    );
  }
}
