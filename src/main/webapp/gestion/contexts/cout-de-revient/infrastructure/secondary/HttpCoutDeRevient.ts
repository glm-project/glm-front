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
import { TotalDeMontant } from '../../domain/montant/TotalDeMontant';
import { ActivitesEnCoursExclues } from '../../domain/rapport/ActivitesEnCoursExclues';
import { CoutDeRevient } from '../../domain/rapport/CoutDeRevient';
import { CoutDeRevientPort } from '../../domain/rapport/CoutDeRevientPort';
import { LigneDeCout } from '../../domain/rapport/LigneDeCout';
import { NatureDOperation } from '../../domain/rapport/NatureDOperation';
import { SequenceEnConflit } from '../../domain/rapport/SequenceEnConflit';
import { DureePassee } from '../../domain/temps/DureePassee';
import { InstantDeTravail } from '../../domain/temps/InstantDeTravail';
import { PeriodeDeTravail } from '../../domain/temps/PeriodeDeTravail';
import { TempsPasse } from '../../domain/temps/TempsPasse';
import { TotalDeTemps } from '../../domain/temps/TotalDeTemps';

type RestRapport = components['schemas']['RestCoutDeRevient'];
type RestLigne = components['schemas']['RestLigneDeCout'];
type RestTemps = components['schemas']['RestTempsPasse'];
type RestCout = components['schemas']['RestCout'];
type RestPeriode = components['schemas']['RestPeriodeDuCout'];

const ROUTE = '/api/couts-de-revient/{elementId}';
const ELEMENT_INCONNU = 404;

const toDuree = (total: components['schemas']['RestDureeDuCout'] | undefined, chemin: string): TotalDeTemps => {
  const lu = required(total, chemin);
  return lu.complete ? TotalDeTemps.complet(new DureePassee(required(lu.valeur, `${chemin}.valeur`))) : TotalDeTemps.incomplet();
};

const toMontant = (total: components['schemas']['RestMontantDuCout'] | undefined, chemin: string): TotalDeMontant => {
  const lu = required(total, chemin);
  return lu.complete ? TotalDeMontant.complet(new Montant(required(lu.valeur, `${chemin}.valeur`))) : TotalDeMontant.incomplet();
};

const toTemps = (temps: RestTemps | undefined, chemin: string): TempsPasse => {
  const lu = required(temps, chemin);
  return new TempsPasse(
    toDuree(lu.travail, `${chemin}.travail`),
    toDuree(lu.nonConformite, `${chemin}.nonConformite`),
    toDuree(lu.total, `${chemin}.total`),
  );
};

const toCout = (cout: RestCout | undefined, chemin: string): Cout => {
  const lu = required(cout, chemin);
  return new Cout(
    toMontant(lu.machine, `${chemin}.machine`),
    toMontant(lu.mainDOeuvre, `${chemin}.mainDOeuvre`),
    toMontant(lu.total, `${chemin}.total`),
  );
};

const toPeriode = (periode: RestPeriode | undefined, chemin: string): PeriodeDeTravail => {
  const lue = required(periode, chemin);
  return new PeriodeDeTravail(
    new InstantDeTravail(required(lue.debut, `${chemin}.debut`)),
    lue.fin === undefined ? undefined : new InstantDeTravail(lue.fin),
  );
};

const toNature = (nature: string | undefined): NatureDOperation | undefined =>
  nature === undefined ? undefined : new NatureDOperation(nature);

const toLigne = (ligne: RestLigne): LigneDeCout =>
  new LigneDeCout({
    nature: toNature(ligne.nature),
    periode: toPeriode(ligne.periode, 'ligne.periode'),
    temps: toTemps(ligne.temps, 'ligne.temps'),
    cout: toCout(ligne.cout, 'ligne.cout'),
    finsAutomatiques: required(ligne.finsAutomatiques, 'ligne.finsAutomatiques').map(periode => toPeriode(periode, 'ligne.finAutomatique')),
    nonConformites: required(ligne.nonConformites, 'ligne.nonConformites').map(periode => toPeriode(periode, 'ligne.nonConformite')),
  });

const toElement = (rapport: RestRapport): ElementChiffre => {
  const element = required(rapport.element, 'rapport.element');
  return new ElementChiffre(required(element.nom, 'rapport.element.nom'), required(element.type, 'rapport.element.type'));
};

const toRapport = (rapport: RestRapport): CoutDeRevient =>
  new CoutDeRevient(toElement(rapport), {
    evaluation: new InstantDeTravail(rapport.evaluation),
    activitesEnCours: new ActivitesEnCoursExclues(rapport.activitesEnCours),
    conflits: required(rapport.conflits, 'rapport.conflits').map(
      conflit => new SequenceEnConflit({ ...conflit, element: new ElementChiffreId(conflit.element), poste: conflit.poste }),
    ),
    lignes: required(rapport.lignes, 'rapport.lignes').map(toLigne),
    temps: toTemps(rapport.temps, 'rapport.temps'),
    cout: toCout(rapport.cout, 'rapport.cout'),
  });

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
