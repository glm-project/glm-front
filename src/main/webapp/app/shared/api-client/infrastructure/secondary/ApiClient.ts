import { paths } from '@/app/generated/schema';
import { HttpClient, HttpErrorResponse, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, firstValueFrom, from, map, Observable, switchMap, throwError, timeout } from 'rxjs';

const NETWORK_TIMEOUT_MS = 30_000;

interface Operation {
  responses: unknown;
}

type ReadRoute = { [Route in keyof paths]: paths[Route]['get'] extends Operation ? Route : never }[keyof paths];
type WriteRoute = { [Route in keyof paths]: paths[Route]['post'] extends Operation ? Route : never }[keyof paths];
type UpdateRoute = { [Route in keyof paths]: paths[Route]['put'] extends Operation ? Route : never }[keyof paths];
type DeleteRoute = { [Route in keyof paths]: paths[Route]['delete'] extends Operation ? Route : never }[keyof paths];

type ImageRoute = {
  [Route in keyof paths]: paths[Route]['get'] extends { responses: { 200: { content: { 'image/png': unknown } } } } ? Route : never;
}[keyof paths];

type DownloadedContent = { 'application/pdf': unknown } | { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': unknown };

type DownloadRoute = {
  [Route in keyof paths]: paths[Route]['get'] extends { responses: { 200: { content: DownloadedContent } } } ? Route : never;
}[keyof paths];

type UploadRoute = {
  [Route in keyof paths]: paths[Route]['put'] extends { requestBody?: { content: { 'multipart/form-data': unknown } } } ? Route : never;
}[keyof paths];

type UploadPart<Route extends UploadRoute> = keyof NonNullable<paths[Route]['put']['requestBody']>['content']['multipart/form-data'];

type ReadOperation<Route extends ReadRoute> = paths[Route]['get'];
type WriteOperation<Route extends WriteRoute> = paths[Route]['post'];
type UpdateOperation<Route extends UpdateRoute> = paths[Route]['put'];
type DeleteOperation<Route extends DeleteRoute> = paths[Route]['delete'];

type ResponseBody<Op> = Op extends { responses: { 200: { content: { '*/*': infer Body } } } }
  ? Body
  : Op extends { responses: { 201: { content: { '*/*': infer Body } } } }
    ? Body
    : Op extends { responses: { 204: unknown } }
      ? null
      : unknown;

type PathParameters<Op> = Op extends { parameters: { path: infer Values } } ? { pathParams: Values } : { pathParams?: never };

type QueryParameters<Op> = Op extends { parameters: { query?: infer Values } }
  ? [NonNullable<Values>] extends [never]
    ? { queryParams?: never }
    : { queryParams?: { [Parameter in keyof NonNullable<Values>]?: NonNullable<Values>[Parameter] | undefined } }
  : never;

type RequestBody<Op> = Op extends { requestBody: { content: { 'application/json': infer Body } } } ? { body: Body } : { body?: never };

type ImageRequest<Route extends ImageRoute> = PathParameters<paths[Route]['get']>;

type DownloadRequest<Route extends DownloadRoute> = PathParameters<paths[Route]['get']> & QueryParameters<paths[Route]['get']>;

type ReadRequest<Route extends ReadRoute> = PathParameters<ReadOperation<Route>> & QueryParameters<ReadOperation<Route>>;

type WriteRequest<Route extends WriteRoute> = PathParameters<WriteOperation<Route>>
  & QueryParameters<WriteOperation<Route>>
  & RequestBody<WriteOperation<Route>>;

type UpdateRequest<Route extends UpdateRoute> = PathParameters<UpdateOperation<Route>>
  & QueryParameters<UpdateOperation<Route>>
  & RequestBody<UpdateOperation<Route>>;

type DeleteRequest<Route extends DeleteRoute> = PathParameters<DeleteOperation<Route>> & QueryParameters<DeleteOperation<Route>>;

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

export interface DownloadedFile {
  readonly content: Blob;
  readonly filename: string | undefined;
}

const ENCODED_FILENAME = /filename\*=UTF-8''([^;]+)/i;
const FILENAME = /filename="([^"]+)"/i;

const filenameIn = (disposition: string): string | undefined => {
  const encoded = ENCODED_FILENAME.exec(disposition)?.[1];
  return encoded === undefined ? FILENAME.exec(disposition)?.[1] : decodeURIComponent(encoded);
};

const toDownloadedFile = (response: HttpResponse<Blob>): DownloadedFile => ({
  content: response.body ?? new Blob(),
  filename: filenameIn(response.headers.get('Content-Disposition') ?? ''),
});

const parsedOrRaw = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

type ProblemSentAsBytes = Omit<HttpErrorResponse, 'error'> & { readonly error: Blob };

const isProblemSentAsBytes = (failure: unknown): failure is ProblemSentAsBytes =>
  failure instanceof HttpErrorResponse && failure.error instanceof Blob;

const withReadableProblem = (failure: unknown): Observable<never> => {
  if (!isProblemSentAsBytes(failure)) {
    return throwError(() => failure);
  }
  return from(failure.error.text()).pipe(
    switchMap(text =>
      throwError(
        () =>
          new HttpErrorResponse({
            error: parsedOrRaw(text),
            headers: failure.headers,
            status: failure.status,
          }),
      ),
    ),
  );
};

@Injectable()
export class ApiClient {
  private readonly http = inject(HttpClient);

  read<Route extends ReadRoute>(route: Route, request: ReadRequest<Route>): Promise<ResponseBody<ReadOperation<Route>>> {
    const { pathParams, queryParams } = request as RawRequest;

    return firstValueFrom(
      this.http
        .get<ResponseBody<ReadOperation<Route>>>(buildUrlFor(route, pathParams), { params: buildParamsFrom(queryParams) })
        .pipe(timeout(NETWORK_TIMEOUT_MS)),
    );
  }

  readImage<Route extends ImageRoute>(route: Route, request: ImageRequest<Route>): Promise<Blob> {
    const { pathParams } = request as RawRequest;

    return firstValueFrom(this.http.get(buildUrlFor(route, pathParams), { responseType: 'blob' }).pipe(timeout(NETWORK_TIMEOUT_MS)));
  }

  download<Route extends DownloadRoute>(route: Route, request: DownloadRequest<Route>): Promise<DownloadedFile> {
    const { pathParams, queryParams } = request as RawRequest;

    return firstValueFrom(
      this.http
        .get(buildUrlFor(route, pathParams), { params: buildParamsFrom(queryParams), observe: 'response', responseType: 'blob' })
        .pipe(timeout(NETWORK_TIMEOUT_MS), map(toDownloadedFile), catchError(withReadableProblem)),
    );
  }

  upload<Route extends UploadRoute>(route: Route, part: UploadPart<Route>, file: Blob): Promise<ResponseBody<paths[Route]['put']>> {
    const body = new FormData();
    body.append(String(part), file, String(part));

    return firstValueFrom(this.http.put<ResponseBody<paths[Route]['put']>>(route, body).pipe(timeout(NETWORK_TIMEOUT_MS)));
  }

  write<Route extends WriteRoute>(route: Route, request: WriteRequest<Route>): Promise<ResponseBody<WriteOperation<Route>>> {
    const { pathParams, queryParams, body } = request as RawRequest;

    return firstValueFrom(
      this.http
        .post<ResponseBody<WriteOperation<Route>>>(buildUrlFor(route, pathParams), body, { params: buildParamsFrom(queryParams) })
        .pipe(timeout(NETWORK_TIMEOUT_MS)),
    );
  }

  update<Route extends UpdateRoute>(route: Route, request: UpdateRequest<Route>): Promise<ResponseBody<UpdateOperation<Route>>> {
    const { pathParams, queryParams, body } = request as RawRequest;

    return firstValueFrom(
      this.http
        .put<ResponseBody<UpdateOperation<Route>>>(buildUrlFor(route, pathParams), body, { params: buildParamsFrom(queryParams) })
        .pipe(timeout(NETWORK_TIMEOUT_MS)),
    );
  }

  delete<Route extends DeleteRoute>(route: Route, request: DeleteRequest<Route>): Promise<ResponseBody<DeleteOperation<Route>>> {
    const { pathParams, queryParams } = request as RawRequest;

    return firstValueFrom(
      this.http
        .delete<ResponseBody<DeleteOperation<Route>>>(buildUrlFor(route, pathParams), { params: buildParamsFrom(queryParams) })
        .pipe(timeout(NETWORK_TIMEOUT_MS)),
    );
  }
}
