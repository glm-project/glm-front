import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { required } from '@/app/shared/api-client/infrastructure/secondary/required';
import { Page } from '@/app/shared/pagination/domain/Page';
import { buildPageFrom, PAGE_SIZE } from '@/app/shared/pagination/infrastructure/secondary/buildPageFrom';
import { ActiviteEnCours } from '@/pupitre/contexts/atelier/domain/suivi-d-atelier/ActiviteEnCours';
import { EtatDAtelier } from '@/pupitre/contexts/atelier/domain/suivi-d-atelier/EtatDAtelier';
import { SuiviDAtelier } from '@/pupitre/contexts/atelier/domain/suivi-d-atelier/SuiviDAtelier';
import { Pointage, SuivisDAtelierPort } from '@/pupitre/contexts/atelier/domain/suivi-d-atelier/SuivisDAtelierPort';
import { inject, Injectable } from '@angular/core';
import { send } from '../sendToAtelier';

type RestSuiviDAtelierEnGrille = components['schemas']['RestSuiviDAtelierEnGrille'];
type RestActiviteEnCours = components['schemas']['RestActiviteEnCours'];
type RestPointage = components['schemas']['RestPointage'];

const toActiviteEnCours = (activite: RestActiviteEnCours): ActiviteEnCours =>
  new ActiviteEnCours(
    required(activite.operateur, 'activite.operateur').id,
    activite.categorie,
    new Date(activite.depuis),
    activite.poste?.id,
  );

const toSuiviDAtelier = (suivi: RestSuiviDAtelierEnGrille): SuiviDAtelier =>
  new SuiviDAtelier(suivi.id, suivi.nom, suivi.etat, suivi.type, suivi.activitesEnCours.map(toActiviteEnCours));

const toRestPointage = (pointage: Pointage): RestPointage => {
  const body: RestPointage = {
    id: pointage.id,
    dateDeSurvenue: pointage.dateDeSurvenue,
    operateur: pointage.operateurId,
    type: pointage.type,
  };
  if (pointage.posteId !== undefined) {
    body.poste = pointage.posteId;
  }
  return body;
};

@Injectable()
export class HttpSuivisDAtelier extends SuivisDAtelierPort {
  private readonly api = inject(ApiClient);

  override async suivis(etats: readonly EtatDAtelier[]): Promise<Page<SuiviDAtelier>> {
    const page = await this.api.read('/api/atelier/suivis', { queryParams: { etats: [...etats], size: PAGE_SIZE } });

    return buildPageFrom(page, toSuiviDAtelier);
  }

  override recordPointage(suiviId: string, pointage: Pointage): Promise<void> {
    return send(
      () =>
        this.api.write('/api/atelier/suivis/{id}/pointages', {
          pathParams: { id: suiviId },
          body: toRestPointage(pointage),
        }),
      () => this.api.read('/api/atelier/suivis/{id}', { pathParams: { id: suiviId } }),
    );
  }
}
