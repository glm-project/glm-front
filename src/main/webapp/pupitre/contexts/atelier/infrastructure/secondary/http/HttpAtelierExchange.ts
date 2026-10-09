import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { findApiErrorIn } from '@/app/shared/api-client/infrastructure/secondary/findApiErrorIn';
import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import {
  GesteDePointage,
  OperateurDuPupitre,
  ReferentielDuPupitre,
  SuiviDuPupitre,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { RefusDePublication } from '@/pupitre/contexts/atelier/domain/refus/RefusDePublication';
import { AtelierExchangePort } from '@/pupitre/contexts/atelier/domain/synchronisation/AtelierExchangePort';
import { err, ok, Result } from '@/pupitre/contexts/atelier/domain/synchronisation/Result';
import { inject, Injectable } from '@angular/core';

import { toRefusDAtelier } from '../toRefusDAtelier';
import { dureeEnMillisecondes } from './dureeIso8601';

type RestActiviteDuPupitre = components['schemas']['RestActiviteDuPupitre'];
type RestOperateurDuPupitre = components['schemas']['RestOperateurDuPupitre'];
type RestPosteDuPupitre = components['schemas']['RestPosteDuPupitre'];
type RestSuiviDuPupitre = components['schemas']['RestSuiviDuPupitre'];

const toPosteHabilite = (poste: RestPosteDuPupitre): OperateurDuPupitre['postes'][number] => ({ id: poste.id, libelle: poste.libelle });

const toOperateurWithoutIdentifiant = (operateur: RestOperateurDuPupitre): OperateurDuPupitre => ({
  id: operateur.id,
  nom: operateur.nom,
  prenom: operateur.prenom,
  postes: operateur.postes.map(toPosteHabilite),
});

const toOperateur = (operateur: RestOperateurDuPupitre): OperateurDuPupitre =>
  operateur.identifiant === undefined
    ? toOperateurWithoutIdentifiant(operateur)
    : { ...toOperateurWithoutIdentifiant(operateur), identifiant: operateur.identifiant };

const toActivite = (activite: RestActiviteDuPupitre): SuiviDuPupitre['activites'][number] => ({
  operateurId: activite.operateur,
  categorie: activite.categorie,
  depuis: activite.depuis,
  ouverture: activite.ouverture,
  echeance: activite.echeance,
  ...(activite.poste === undefined ? {} : { posteId: activite.poste }),
});

const toSuiviWithoutReference = (suivi: RestSuiviDuPupitre): SuiviDuPupitre => ({
  id: suivi.id,
  nom: suivi.nom,
  etat: suivi.etat,
  categorie: suivi.categorie,
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
    return {
      operateurs: referentiel.operateurs.map(toOperateur),
      suivis: referentiel.suivis.map(toSuivi),
      categories: referentiel.categories,
      dureeMaximaleDActiviteEnMs: dureeEnMillisecondes(referentiel.dureeMaximaleDActivite),
      ...(referentiel.logo === undefined ? {} : { logo: { version: referentiel.logo.version } }),
    };
  }

  override async imageDuLogo(version: string): Promise<string> {
    const image = await this.api.readImage('/api/parametrage/logo/{version}', { pathParams: { version } });
    let binaire = '';
    for (const octet of new Uint8Array(await image.arrayBuffer())) binaire += String.fromCodePoint(octet);
    return `data:${image.type};base64,${btoa(binaire)}`;
  }

  override async send(geste: GesteDePointage): Promise<Result<void, RefusDePublication>> {
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

  override async reread(geste: GesteDePointage): Promise<void> {
    await this.api.read('/api/atelier/suivis/{id}', { pathParams: { id: geste.suiviId } });
  }

  private requireAuthorization(): void {
    if (this.authentication.currentToken() === undefined) {
      throw new Error('Aucune autorisation pour lire le référentiel.');
    }
  }

  private write(geste: GesteDePointage): Promise<components['schemas']['RestSuiviDAtelier']> {
    const body = { id: geste.id, dateDeSurvenue: geste.dateDeSurvenue, operateur: geste.operateurId };
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
