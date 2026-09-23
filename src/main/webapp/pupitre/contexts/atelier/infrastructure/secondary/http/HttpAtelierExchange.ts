import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { findApiErrorIn } from '@/app/shared/api-client/infrastructure/secondary/findApiErrorIn';
import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import {
  GesteDAtelier,
  OperateurDuPupitre,
  ReferentielDuPupitre,
  SuiviDuPupitre,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { RefusDePublication } from '@/pupitre/contexts/atelier/domain/refus/RefusDePublication';
import { AtelierExchangePort } from '@/pupitre/contexts/atelier/domain/synchronisation/AtelierExchangePort';
import { err, ok, Result } from '@/pupitre/contexts/atelier/domain/synchronisation/Result';
import { inject, Injectable } from '@angular/core';

import { toRefusDAtelier } from '../toRefusDAtelier';

type RestActiviteDuPupitre = components['schemas']['RestActiviteDuPupitre'];
type RestOperateurDuPupitre = components['schemas']['RestOperateurDuPupitre'];
type RestPosteDuPupitre = components['schemas']['RestPosteDuPupitre'];
type RestSuiviDuPupitre = components['schemas']['RestSuiviDuPupitre'];

const toPosteHabilite = (poste: RestPosteDuPupitre): OperateurDuPupitre['postes'][number] => ({ id: poste.id, libelle: poste.libelle });

const toOperateurWithoutMatricule = (operateur: RestOperateurDuPupitre): OperateurDuPupitre => ({
  id: operateur.id,
  nom: operateur.nom,
  prenom: operateur.prenom,
  etat: operateur.etat,
  postes: operateur.postes.map(toPosteHabilite),
});

const toOperateur = (operateur: RestOperateurDuPupitre): OperateurDuPupitre =>
  operateur.matricule === undefined
    ? toOperateurWithoutMatricule(operateur)
    : { ...toOperateurWithoutMatricule(operateur), matricule: operateur.matricule };

const toActivite = (activite: RestActiviteDuPupitre): SuiviDuPupitre['activites'][number] =>
  activite.poste === undefined
    ? { operateurId: activite.operateur, categorie: activite.categorie, depuis: activite.depuis }
    : { operateurId: activite.operateur, categorie: activite.categorie, depuis: activite.depuis, posteId: activite.poste };

const toSuiviWithoutReference = (suivi: RestSuiviDuPupitre): SuiviDuPupitre => ({
  id: suivi.id,
  nom: suivi.nom,
  etat: suivi.etat,
  type: suivi.type,
  evenements: [],
  activites: suivi.activites.map(toActivite),
});

const toSuivi = (suivi: RestSuiviDuPupitre): SuiviDuPupitre =>
  suivi.reference === undefined ? toSuiviWithoutReference(suivi) : { ...toSuiviWithoutReference(suivi), reference: suivi.reference };

@Injectable()
export class HttpAtelierExchange extends AtelierExchangePort {
  private readonly authentication = inject(AuthenticationPort);
  private readonly api = inject(ApiClient);

  override async referentiel(): Promise<ReferentielDuPupitre> {
    this.requireAuthorization();
    const referentiel = await this.api.read('/api/pupitre/referentiel', {});
    return { operateurs: referentiel.operateurs.map(toOperateur), suivis: referentiel.suivis.map(toSuivi) };
  }

  override async send(geste: GesteDAtelier): Promise<Result<void, RefusDePublication>> {
    try {
      await this.write(geste);
      return ok(undefined);
    } catch (failure: unknown) {
      const refusal = findApiErrorIn(failure);
      if (refusal !== undefined) {
        return err(new RefusDePublication(refusal.urn, refusal.message, toRefusDAtelier(refusal.urn, refusal.message)?.motif));
      }
      throw failure;
    }
  }

  override async reread(geste: GesteDAtelier): Promise<void> {
    if (geste.nature === 'POINTAGE') {
      await this.api.read('/api/atelier/suivis/{id}', { pathParams: { id: geste.suiviId } });
      return;
    }
    await this.api.read('/api/atelier/journees', { queryParams: { operateur: geste.operateurId, size: 100 } });
  }

  private requireAuthorization(): void {
    if (this.authentication.currentToken() === undefined) {
      throw new Error('Aucune autorisation pour lire le référentiel.');
    }
  }

  private write(geste: GesteDAtelier): Promise<unknown> {
    const body = { id: geste.id, dateDeSurvenue: geste.dateDeSurvenue, operateur: geste.operateurId };
    if (geste.nature === 'ARRIVEE') {
      return this.api.write('/api/atelier/journees', { body });
    }
    if (geste.nature === 'PRESENCE') {
      return this.api.write('/api/atelier/journees/pointages', { body: { ...body, type: geste.type } });
    }
    const request = {
      pathParams: { id: geste.suiviId },
      body: { ...body, type: geste.type },
    };
    if (geste.posteId === undefined) {
      return this.api.write('/api/atelier/suivis/{id}/pointages', request);
    }
    return this.api.write('/api/atelier/suivis/{id}/pointages', { ...request, body: { ...request.body, poste: geste.posteId } });
  }
}
