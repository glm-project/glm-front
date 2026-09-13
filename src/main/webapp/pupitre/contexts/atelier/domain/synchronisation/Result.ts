export type Result<T, E> =
  { readonly ok: true; readonly value: T; readonly error?: never } | { readonly ok: false; readonly error: E; readonly value?: never };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
