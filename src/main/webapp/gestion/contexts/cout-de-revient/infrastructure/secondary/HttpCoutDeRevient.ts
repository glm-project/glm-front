import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { required } from '@/app/shared/api-client/infrastructure/secondary/required';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ElementChiffre } from '../../domain/element/ElementChiffre';
import { ElementChiffreId } from '../../domain/element/ElementChiffreId';
import { Cout } from '../../domain/montant/Cout';
import { Montant } from '../../domain/montant/Montant';
import { CoutDeRevient } from '../../domain/rapport/CoutDeRevient';
import { CoutDeRevientPort } from '../../domain/rapport/CoutDeRevientPort';
import { LigneDeCout } from '../../domain/rapport/LigneDeCout';
import { NatureDOperation } from '../../domain/rapport/NatureDOperation';
import { DureePassee } from '../../domain/temps/DureePassee';
import { InstantDeTravail } from '../../domain/temps/InstantDeTravail';
import { PeriodeDeTravail } from '../../domain/temps/PeriodeDeTravail';
import { TempsPasse } from '../../domain/temps/TempsPasse';

type RestRapport = components['schemas']['RestCoutDeRevient'];
type RestLigne = components['schemas']['RestLigneDeCout'];
type RestTemps = components['schemas']['RestTempsPasse'];
type RestCout = components['schemas']['RestCout'];
type RestPeriode = components['schemas']['RestPeriode'];

const ROUTE = '/api/couts-de-revient/{elementId}';
const ELEMENT_INCONNU = 404;

const toTemps = (temps: RestTemps | undefined, chemin: string): TempsPasse => {
  const lu = required(temps, chemin);
  return new TempsPasse(
    new DureePassee(required(lu.travail, `${chemin}.travail`)),
    new DureePassee(required(lu.nonConformite, `${chemin}.nonConformite`)),
    new DureePassee(required(lu.total, `${chemin}.total`)),
  );
};

const toCout = (cout: RestCout | undefined, chemin: string): Cout => {
  const lu = required(cout, chemin);
  return new Cout(
    new Montant(required(lu.machine, `${chemin}.machine`)),
    new Montant(required(lu.mainDOeuvre, `${chemin}.mainDOeuvre`)),
    new Montant(required(lu.total, `${chemin}.total`)),
  );
};

const toPeriode = (periode: RestPeriode | undefined, chemin: string): PeriodeDeTravail => {
  const lue = required(periode, chemin);
  return new PeriodeDeTravail(
    new InstantDeTravail(required(lue.debut, `${chemin}.debut`)),
    new InstantDeTravail(required(lue.fin, `${chemin}.fin`)),
  );
};

/** La nature manque pour un pointage sans poste : c'est une valeur absente du document, pas un champ oublié. */
const toNature = (nature: string | undefined): NatureDOperation | undefined =>
  nature === undefined ? undefined : new NatureDOperation(nature);

const toLigne = (ligne: RestLigne): LigneDeCout =>
  new LigneDeCout({
    nature: toNature(ligne.nature),
    periode: toPeriode(ligne.periode, 'ligne.periode'),
    temps: toTemps(ligne.temps, 'ligne.temps'),
    cout: toCout(ligne.cout, 'ligne.cout'),
    nonConformites: required(ligne.nonConformites, 'ligne.nonConformites').map(periode => toPeriode(periode, 'ligne.nonConformite')),
  });

const toElement = (rapport: RestRapport): ElementChiffre => {
  const element = required(rapport.element, 'rapport.element');
  return new ElementChiffre(required(element.nom, 'rapport.element.nom'), required(element.type, 'rapport.element.type'));
};

const toRapport = (rapport: RestRapport): CoutDeRevient =>
  new CoutDeRevient(toElement(rapport), {
    lignes: required(rapport.lignes, 'rapport.lignes').map(toLigne),
    temps: toTemps(rapport.temps, 'rapport.temps'),
    cout: toCout(rapport.cout, 'rapport.cout'),
  });

/**
 * L'élément inconnu se reconnaît au statut, pas à une URN : `CoutDeRevientExceptionAdvice` rend un
 * `ProblemDetail` sans `type`, que `findApiErrorIn` ne sait donc pas traduire. Cette route n'a qu'un seul
 * 404 métier, ce qui rend le statut suffisant. Voir `AGENTS.md`.
 */
const estElementInconnu = (failure: unknown): boolean => {
  if (!(failure instanceof HttpErrorResponse)) {
    return false;
  }
  return failure.status === ELEMENT_INCONNU;
};

@Injectable()
export class HttpCoutDeRevient extends CoutDeRevientPort {
  private readonly api = inject(ApiClient);
  private readonly errors = inject(ErrorHandlerPort);

  override async rapport(element: ElementChiffreId): Promise<CoutDeRevient | undefined> {
    try {
      const response = await this.api.read(ROUTE, { pathParams: { elementId: element.value } });
      return toRapport(response);
    } catch (failure) {
      if (estElementInconnu(failure)) {
        return undefined;
      }
      this.errors.handleError(failure);
      throw failure;
    }
  }
}
