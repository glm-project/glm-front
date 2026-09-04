import { paths } from '@/app/api/schema';
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

interface Operation {
  responses: unknown;
}

type RouteEnLecture = { [Route in keyof paths]: paths[Route]['get'] extends Operation ? Route : never }[keyof paths];
type RouteEnEcriture = { [Route in keyof paths]: paths[Route]['post'] extends Operation ? Route : never }[keyof paths];

type Lecture<Route extends RouteEnLecture> = paths[Route]['get'];
type Ecriture<Route extends RouteEnEcriture> = paths[Route]['post'];

type Rendu<Op> = Op extends { responses: { 200: { content: { '*/*': infer Corps } } } }
  ? Corps
  : Op extends { responses: { 201: { content: { '*/*': infer Corps } } } }
    ? Corps
    : never;

type Chemin<Op> = Op extends { parameters: { path: infer Valeurs } } ? { chemin: Valeurs } : { chemin?: never };

type Parametres<Op> = Op extends { parameters: { query?: infer Valeurs } }
  ? [NonNullable<Valeurs>] extends [never]
    ? { parametres?: never }
    : { parametres?: NonNullable<Valeurs> }
  : never;

type Corps<Op> = Op extends { requestBody: { content: { 'application/json': infer Envoi } } } ? { body: Envoi } : { body?: never };

type RequeteEnLecture<Route extends RouteEnLecture> = Chemin<Lecture<Route>> & Parametres<Lecture<Route>>;

type RequeteEnEcriture<Route extends RouteEnEcriture> = Chemin<Ecriture<Route>> & Parametres<Ecriture<Route>> & Corps<Ecriture<Route>>;

type ValeurDeParametre = string | number | boolean | readonly (string | number | boolean)[];

interface RequeteBrute {
  chemin?: Record<string, string>;
  parametres?: Record<string, unknown>;
  body?: unknown;
}

const buildUrlFor = (route: string, chemin: Record<string, string> | undefined): string =>
  Object.entries(chemin ?? {}).reduce((url, [nom, valeur]) => url.replace(`{${nom}}`, encodeURIComponent(valeur)), route);

const filterFilled = (parametres: Record<string, unknown> | undefined): [string, ValeurDeParametre][] =>
  Object.entries(parametres ?? {}).filter((entree): entree is [string, ValeurDeParametre] => entree[1] !== undefined);

const buildParamsFrom = (parametres: Record<string, unknown> | undefined): HttpParams =>
  new HttpParams({ fromObject: Object.fromEntries(filterFilled(parametres)) });

@Injectable()
export class ClientApi {
  private readonly http = inject(HttpClient);

  read<Route extends RouteEnLecture>(route: Route, requete: RequeteEnLecture<Route>): Promise<Rendu<Lecture<Route>>> {
    const { chemin, parametres } = requete as RequeteBrute;

    return firstValueFrom(this.http.get<Rendu<Lecture<Route>>>(buildUrlFor(route, chemin), { params: buildParamsFrom(parametres) }));
  }

  write<Route extends RouteEnEcriture>(route: Route, requete: RequeteEnEcriture<Route>): Promise<Rendu<Ecriture<Route>>> {
    const { chemin, parametres, body } = requete as RequeteBrute;

    return firstValueFrom(
      this.http.post<Rendu<Ecriture<Route>>>(buildUrlFor(route, chemin), body, { params: buildParamsFrom(parametres) }),
    );
  }
}
