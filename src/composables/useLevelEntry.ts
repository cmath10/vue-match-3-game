import type { Ref } from 'vue'

import type { GameSnapshot, PlayerState } from '@/domain/progress'

import { ref, watch } from 'vue'

import { initializePlayerProgress } from '@/state/playerProgress'
import { isLevelUnlocked } from '@/domain/progress'

type LevelEntryOptions = {
  getLevelId: () => number
  isResumeRequested: () => boolean
  playerState: Ref<PlayerState>
  restoreGame: (snapshot: GameSnapshot) => void
  startGame: () => void
  onLocked: () => void
}

type LevelEntryContext = {
  options: LevelEntryOptions
  ready: Ref<boolean>
  pendingAttempt: Ref<GameSnapshot | null>
}

const showGame = (context: LevelEntryContext, action: () => void): void => {
  action()
  context.pendingAttempt.value = null
  context.ready.value = true
}

const openAttempt = (context: LevelEntryContext, attempt: GameSnapshot): void => {
  if (context.options.isResumeRequested()) {
    showGame(context, () => context.options.restoreGame(attempt))
  } else {
    context.pendingAttempt.value = attempt
  }
}

const openLevel = (context: LevelEntryContext, levelId: number): void => {
  const attempt = context.options.playerState.value.levels[levelId]?.attempt

  if (attempt) {
    openAttempt(context, attempt)
  } else {
    showGame(context, context.options.startGame)
  }
}

const loadLevel = async (context: LevelEntryContext): Promise<void> => {
  context.ready.value = false
  context.pendingAttempt.value = null
  await initializePlayerProgress()

  const levelId = context.options.getLevelId()

  if (isLevelUnlocked(context.options.playerState.value, levelId)) {
    openLevel(context, levelId)
  } else {
    context.options.onLocked()
  }
}

const continueAttempt = (context: LevelEntryContext): void => {
  const attempt = context.pendingAttempt.value

  if (attempt) {
    showGame(context, () => context.options.restoreGame(attempt))
  }
}

export const useLevelEntry = (options: LevelEntryOptions) => {
  const context: LevelEntryContext = {
    options,
    ready: ref(false),
    pendingAttempt: ref(null),
  }

  watch(
    () => [options.getLevelId(), options.isResumeRequested()],
    () => void loadLevel(context),
    { immediate: true }
  )

  return {
    ready: context.ready,
    pendingAttempt: context.pendingAttempt,
    continueAttempt: () => continueAttempt(context),
    restartAttempt: () => showGame(context, options.startGame),
  }
}
