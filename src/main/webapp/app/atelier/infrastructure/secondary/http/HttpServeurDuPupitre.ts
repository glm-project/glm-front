import { components } from '@/app/api/schema';
import { GesteLocal, OperateurDuPupitre, ReferentielDuPupitre, SuiviDuPupitre } from '@/app/atelier/domain/PupitreLocal';
import { RefusDuPupitre } from '@/app/atelier/domain/RefusDuPupitre';
import { ServeurDuPupitrePort } from '@/app/atelier/domain/ServeurDuPupitrePort';
import { ClientApi } from '@/app/shared/api-client/infrastructure/secondary/ClientApi';
import { findCodeDErreurIn } from '@/app/shared/api-client/infrastructure/secondary/findCodeDErreurIn';
import { required } from '@/app/shared/api-client/infrastructure/secondary/required';
import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { inject, Injectable } from '@angular/core';

import { findRefusDAtelierIn } from '../findRefusDAtelierIn';

type RestOperateur = components['schemas']['RestOperateur'];
type RestSuivi = components['schemas']['RestSuiviDAtelier'];

interface ElementDuReferentiel {
  id?: string;
}

interface Page<T> {
  content?: T[];
  totalElementsCount?: number;
}

const requireStablePage = (previousTotal: number | undefined, count: number, received: number, pageSize: number): void => {
  if ((previousTotal !== undefined && previousTotal !== count) || (pageSize === 0 && received < count)) {
    throw new Error('Le referentiel a change pendant sa lecture.');
  }
};

const requireUniqueElements = (elements: ElementDuReferentiel[], total: number): void => {
  if (new Set(elements.map(element => element.id)).size !== elements.length || elements.length > total) {
    throw new Error('Le referentiel contient des doublons.');
  }
};

const readAll = async <T extends ElementDuReferentiel>(read: (page: number) => Promise<Page<T>>): Promise<T[]> => {
  const elements: T[] = [];
  let total: number | undefined;
  for (let page = 0; ; page++) {
    const answer = await read(page);
    const count = required(answer.totalElementsCount, 'page.totalElementsCount');
    const content = required(answer.content, 'page.content');
    requireStablePage(total, count, elements.length, content.length);
    total = count;
    elements.push(...content);
    requireUniqueElements(elements, total);
    if (elements.length === total) {
      return elements;
    }
  }
};

const toOperateur = (operateur: RestOperateur): OperateurDuPupitre => ({
  id: operateur.id,
  nom: operateur.nom,
  prenom: operateur.prenom,
  matricule: operateur.matricule,
  postes: operateur.postes ?? [],
});

const toSuivi = (suivi: RestSuivi): SuiviDuPupitre => ({
  id: required(suivi.id, 'suivi.id'),
  nom: required(suivi.nom, 'suivi.nom'),
  etat: required(suivi.etat, 'suivi.etat'),
  type: required(suivi.type, 'suivi.type'),
  evenements: (suivi.journal ?? []).map(evenement => required(evenement.id, 'evenement.id')),
  activites: (suivi.activitesEnCours ?? []).map(activite => ({
    operateurId: required(activite.operateur, 'activite.operateur').id,
    categorie: required(activite.categorie, 'activite.categorie'),
    depuis: required(activite.depuis, 'activite.depuis'),
    posteId: activite.poste?.id,
  })),
});

@Injectable()
export class HttpServeurDuPupitre extends ServeurDuPupitrePort {
  private readonly authentication = inject(AuthenticationPort);
  private readonly api = inject(ClientApi);

  override async referentiel(): Promise<ReferentielDuPupitre> {
    const token = this.authentication.currentToken();
    const operateurs = await readAll(page => {
      this.requireToken(token);
      return this.api.read('/api/operateurs', { parametres: { page, size: 100 } });
    });
    const suivis = await readAll(page => {
      this.requireToken(token);
      return this.api.read('/api/atelier/suivis', { parametres: { page, size: 100 } });
    });
    return { operateurs: operateurs.map(toOperateur), suivis: suivis.map(toSuivi) };
  }

  override async send(geste: GesteLocal): Promise<void> {
    try {
      await this.write(geste);
    } catch (failure: unknown) {
      const refusal = findCodeDErreurIn(failure);
      if (refusal !== undefined) {
        throw new RefusDuPupitre(refusal.urn, refusal.message, findRefusDAtelierIn(failure)?.code);
      }
      throw failure;
    }
  }

  override async reread(geste: GesteLocal): Promise<void> {
    if (geste.nature === 'POINTAGE') {
      await this.api.read('/api/atelier/suivis/{id}', { chemin: { id: geste.suiviId } });
      return;
    }
    await this.api.read('/api/atelier/journees', { parametres: { operateur: geste.operateurId, size: 100 } });
  }

  private requireToken(token: string | undefined): void {
    if (token === undefined || this.authentication.currentToken() !== token) {
      throw new Error('L’autorisation a change pendant la lecture.');
    }
  }

  private write(geste: GesteLocal): Promise<unknown> {
    const body = { id: geste.id, dateDeSurvenue: geste.dateDeSurvenue, operateur: geste.operateurId };
    if (geste.nature === 'ARRIVEE') {
      return this.api.write('/api/atelier/journees', { body });
    }
    if (geste.nature === 'PRESENCE') {
      return this.api.write('/api/atelier/journees/pointages', { body: { ...body, type: geste.type } });
    }
    return this.api.write('/api/atelier/suivis/{id}/pointages', {
      chemin: { id: geste.suiviId },
      body: { ...body, type: geste.type, poste: geste.posteId },
    });
  }
}
