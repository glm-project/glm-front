import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { findApiErrorIn } from '@/app/shared/api-client/infrastructure/secondary/findApiErrorIn';
import { required } from '@/app/shared/api-client/infrastructure/secondary/required';
import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import {
  LocalGeste,
  OperateurDuPupitre,
  ReferentielDuPupitre,
  SuiviDuPupitre,
} from '@/pupitre/contexts/atelier/domain/journal/LocalPupitreState';
import { PupitreServerPort } from '@/pupitre/contexts/atelier/domain/journal/PupitreServerPort';
import { RefusDuPupitre } from '@/pupitre/contexts/atelier/domain/refus/RefusDuPupitre';
import { inject, Injectable } from '@angular/core';

import { findRefusDAtelierIn } from '../findRefusDAtelierIn';

type RestOperateur = components['schemas']['RestOperateur'];
type RestPosteHabilite = components['schemas']['RestPosteHabilite'];
type RestSuiviDAtelierEnGrille = components['schemas']['RestSuiviDAtelierEnGrille'];

interface ReferentielEntry {
  id: string;
}

interface Page<T> {
  content: T[];
  currentPage: number;
  pageSize: number;
  totalElementsCount: number;
}

const requireStablePage = (previousTotal: number | undefined, count: number, received: number, pageSize: number): void => {
  if ((previousTotal !== undefined && previousTotal !== count) || (pageSize === 0 && received < count)) {
    throw new Error('Le referentiel a change pendant sa lecture.');
  }
};

const requireUniqueElements = (elements: ReferentielEntry[], total: number): void => {
  if (new Set(elements.map(element => element.id)).size !== elements.length || elements.length > total) {
    throw new Error('Le referentiel contient des doublons.');
  }
};

const readAll = async <T extends ReferentielEntry>(read: (page: number) => Promise<Page<T>>): Promise<T[]> => {
  const elements: T[] = [];
  let total: number | undefined;
  for (let page = 0; ; page++) {
    const answer = await read(page);
    const count = answer.totalElementsCount;
    const content = answer.content;
    requireStablePage(total, count, elements.length, content.length);
    total = count;
    elements.push(...content);
    requireUniqueElements(elements, total);
    if (elements.length === total) {
      return elements;
    }
  }
};

const toPosteHabilite = (poste: RestPosteHabilite): OperateurDuPupitre['postes'][number] => ({ id: poste.id, libelle: poste.libelle });

const toOperateurWithoutMatricule = (operateur: RestOperateur): OperateurDuPupitre => ({
  id: operateur.id,
  nom: operateur.nom,
  prenom: operateur.prenom,
  postes: operateur.postes.map(toPosteHabilite),
});

const toOperateur = (operateur: RestOperateur): OperateurDuPupitre => {
  const result = toOperateurWithoutMatricule(operateur);
  if (operateur.matricule !== undefined) {
    result.matricule = operateur.matricule;
  }
  return result;
};

const toActivite = (activite: RestSuiviDAtelierEnGrille['activitesEnCours'][number]): SuiviDuPupitre['activites'][number] => {
  const result: SuiviDuPupitre['activites'][number] = {
    operateurId: required(activite.operateur, 'activite.operateur').id,
    categorie: activite.categorie,
    depuis: activite.depuis,
  };
  if (activite.poste !== undefined) {
    result.posteId = activite.poste.id;
  }
  return result;
};

const toSuivi = (suivi: RestSuiviDAtelierEnGrille): SuiviDuPupitre => ({
  id: suivi.id,
  nom: suivi.nom,
  etat: suivi.etat,
  type: suivi.type,
  evenements: [],
  activites: suivi.activitesEnCours.map(toActivite),
});

@Injectable()
export class HttpPupitreServer extends PupitreServerPort {
  private readonly authentication = inject(AuthenticationPort);
  private readonly api = inject(ApiClient);

  override async referentiel(): Promise<ReferentielDuPupitre> {
    const token = this.authentication.currentToken();
    const operateurs = await readAll(page => {
      this.requireToken(token);
      return this.api.read('/api/operateurs', { queryParams: { page, size: 100 } });
    });
    const suivis = await readAll(page => {
      this.requireToken(token);
      return this.api.read('/api/atelier/suivis', { queryParams: { page, size: 100 } });
    });
    return { operateurs: operateurs.map(toOperateur), suivis: suivis.map(toSuivi) };
  }

  override async send(geste: LocalGeste): Promise<void> {
    try {
      await this.write(geste);
    } catch (failure: unknown) {
      const refusal = findApiErrorIn(failure);
      if (refusal !== undefined) {
        throw new RefusDuPupitre(refusal.urn, refusal.message, findRefusDAtelierIn(failure)?.code);
      }
      throw failure;
    }
  }

  override async reread(geste: LocalGeste): Promise<void> {
    if (geste.nature === 'POINTAGE') {
      await this.api.read('/api/atelier/suivis/{id}', { pathParams: { id: geste.suiviId } });
      return;
    }
    await this.api.read('/api/atelier/journees', { queryParams: { operateur: geste.operateurId, size: 100 } });
  }

  private requireToken(token: string | undefined): void {
    if (token === undefined || this.authentication.currentToken() !== token) {
      throw new Error('L’autorisation a change pendant la lecture.');
    }
  }

  private write(geste: LocalGeste): Promise<unknown> {
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
