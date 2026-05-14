export type OkResult<T> = { readonly ok: true; readonly value: T }
export type ErrResult<E> = { readonly ok: false; readonly error: E }
export type Result<T, E> = OkResult<T> | ErrResult<E>

export function ok<T>(value: T): OkResult<T> {
  return { ok: true, value }
}

export function err<E>(error: E): ErrResult<E> {
  return { ok: false, error }
}

export function map<T, E, U>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result as ErrResult<E>
}

export function flatMap<T, E, U>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  return result.ok ? fn(result.value) : result as ErrResult<E>
}

export function mapError<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  if (result.ok) return result as OkResult<T>
  return err(fn((result as ErrResult<E>).error))
}

export function match<T, E, R>(
  result: Result<T, E>,
  onOk: (value: T) => R,
  onErr: (error: E) => R
): R {
  return result.ok ? onOk(result.value) : onErr((result as ErrResult<E>).error)
}
