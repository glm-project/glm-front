import { paths } from '@/app/generated/schema';
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

interface Operation {
  responses: unknown;
}

type ReadRoute = { [Route in keyof paths]: paths[Route]['get'] extends Operation ? Route : never }[keyof paths];
type WriteRoute = { [Route in keyof paths]: paths[Route]['post'] extends Operation ? Route : never }[keyof paths];

type ReadOperation<Route extends ReadRoute> = paths[Route]['get'];
type WriteOperation<Route extends WriteRoute> = paths[Route]['post'];

type ResponseBody<Op> = Op extends { responses: { 200: { content: { '*/*': infer Body } } } }
  ? Body
  : Op extends { responses: { 201: { content: { '*/*': infer Body } } } }
    ? Body
    : never;

type PathParameters<Op> = Op extends { parameters: { path: infer Values } } ? { pathParams: Values } : { pathParams?: never };

type QueryParameters<Op> = Op extends { parameters: { query?: infer Values } }
  ? [NonNullable<Values>] extends [never]
    ? { queryParams?: never }
    : { queryParams?: NonNullable<Values> }
  : never;

type RequestBody<Op> = Op extends { requestBody: { content: { 'application/json': infer Body } } } ? { body: Body } : { body?: never };

type ReadRequest<Route extends ReadRoute> = PathParameters<ReadOperation<Route>> & QueryParameters<ReadOperation<Route>>;

type WriteRequest<Route extends WriteRoute> = PathParameters<WriteOperation<Route>>
  & QueryParameters<WriteOperation<Route>>
  & RequestBody<WriteOperation<Route>>;

type QueryValue = string | number | boolean | readonly (string | number | boolean)[];

interface RawRequest {
  pathParams?: Record<string, string>;
  queryParams?: Record<string, unknown>;
  body?: unknown;
}

const buildUrlFor = (route: string, pathParams: Record<string, string> | undefined): string =>
  Object.entries(pathParams ?? {}).reduce((url, [name, value]) => url.replace(`{${name}}`, encodeURIComponent(value)), route);

const filterFilled = (queryParams: Record<string, unknown> | undefined): [string, QueryValue][] =>
  Object.entries(queryParams ?? {}).filter((entry): entry is [string, QueryValue] => entry[1] !== undefined);

const buildParamsFrom = (queryParams: Record<string, unknown> | undefined): HttpParams =>
  new HttpParams({ fromObject: Object.fromEntries(filterFilled(queryParams)) });

@Injectable()
export class ApiClient {
  private readonly http = inject(HttpClient);

  read<Route extends ReadRoute>(route: Route, request: ReadRequest<Route>): Promise<ResponseBody<ReadOperation<Route>>> {
    const { pathParams, queryParams } = request as RawRequest;

    return firstValueFrom(
      this.http.get<ResponseBody<ReadOperation<Route>>>(buildUrlFor(route, pathParams), { params: buildParamsFrom(queryParams) }),
    );
  }

  write<Route extends WriteRoute>(route: Route, request: WriteRequest<Route>): Promise<ResponseBody<WriteOperation<Route>>> {
    const { pathParams, queryParams, body } = request as RawRequest;

    return firstValueFrom(
      this.http.post<ResponseBody<WriteOperation<Route>>>(buildUrlFor(route, pathParams), body, { params: buildParamsFrom(queryParams) }),
    );
  }
}
