export type LevelCompilationErrorCode =
  | 'invalid-layout'
  | 'unknown-layout-token'
  | 'invalid-tile-pool'
  | 'invalid-fixed-tile'
  | 'invalid-spawn'
  | 'invalid-collector'
  | 'invalid-objective'
  | 'invalid-gravity-edge'
  | 'invalid-gravity-zone'
  | 'invalid-edge-target'
  | 'gravity-cycle'
  | 'unreachable-cell'

export type DefinitionPathSegment = string | number

export type LevelCompilationError = {
  code: LevelCompilationErrorCode
  path: readonly DefinitionPathSegment[]
  message: string
}

export type LevelCompilationResult<T> =
  | { ok: true; level: T }
  | { ok: false; errors: readonly LevelCompilationError[] }

export const levelError = (
  code: LevelCompilationErrorCode,
  path: readonly DefinitionPathSegment[],
  message: string
): LevelCompilationError => ({ code, path, message })
