/**
 * Validation rules for pitching and catching restrictions
 *
 * These rules enforce MLB/USA Baseball Pitch Smart Guidelines
 * and Little League safety rules to protect young players.
 */

import { PITCH_SMART_RULES } from './pitchSmartRules'

/**
 * Calculate effective pitch count for rest day calculation
 * Uses penultimate batter count + 1 per pitch count rules
 */
export function getEffectivePitchCount(penultimateBatterCount) {
  if (!penultimateBatterCount || penultimateBatterCount === 0) return 0
  return penultimateBatterCount + 1
}

/**
 * Get maximum allowed pitches per game for a player's age
 */
export function getMaxPitchesForAge(age) {
  const rule = PITCH_SMART_RULES.find(
    r => age >= r.ageMin && age <= r.ageMax
  )
  return rule ? rule.maxPitchesPerGame : null
}

/**
 * Rule 1: Pitchers must pitch consecutive innings
 * A pitcher cannot return after being taken out
 */
export function hasInningsGap(innings) {
  if (innings.length <= 1) return false
  const sorted = [...innings].sort((a, b) => a - b)
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1] - sorted[i] !== 1) {
      return true
    }
  }
  return false
}

/**
 * Rule 2: 41+ pitches -> cannot catch after pitching
 * If a pitcher throws 41+ pitches, they cannot catch for the remainder of the game
 */
export function cannotCatchDueToHighPitchCount(pitchedInnings, caughtInnings, effectivePitches) {
  if (effectivePitches < 41 || caughtInnings.length === 0 || pitchedInnings.length === 0) {
    return false
  }
  const maxPitchingInning = Math.max(...pitchedInnings)
  return caughtInnings.some(inning => inning > maxPitchingInning)
}

/**
 * Rule 3: 4 innings catching -> cannot pitch after
 * A player who catches 4+ innings cannot pitch in this game
 */
export function cannotPitchDueToFourInningsCatching(pitchedInnings, caughtInnings) {
  if (caughtInnings.length < 4 || pitchedInnings.length === 0) {
    return false
  }
  const sortedCatchingInnings = [...caughtInnings].sort((a, b) => a - b)
  const fourthCatchingInning = sortedCatchingInnings[3]
  return pitchedInnings.some(inning => inning > fourthCatchingInning)
}

/**
 * Rule 4: Catch 1-3 innings + 21+ pitches -> cannot return to catch
 * A player who caught 1-3 innings, moved to pitcher, and delivered 21+ pitches
 * may not return to the catcher position
 */
export function cannotCatchAgainDueToCombined(pitchedInnings, caughtInnings, effectivePitches) {
  if (caughtInnings.length < 1 || caughtInnings.length > 3 || effectivePitches < 21 || pitchedInnings.length === 0) {
    return false
  }
  const minPitchingInning = Math.min(...pitchedInnings)
  const maxPitchingInning = Math.max(...pitchedInnings)
  const hasCaughtBeforePitching = caughtInnings.some(inning => inning < minPitchingInning)
  const hasReturnedToCatch = caughtInnings.some(inning => inning > maxPitchingInning)
  return hasCaughtBeforePitching && hasReturnedToCatch
}

/**
 * Rule 5: Pitch count exceeds age-based limit
 * Players cannot exceed their age-specific pitch count limit per game
 * - Ages 7-8: Max 50 pitches
 * - Ages 9-10: Max 75 pitches
 * - Ages 11-12: Max 85 pitches
 */
export function exceedsMaxPitchesForAge(age, effectivePitches) {
  if (!age) return false
  const maxPitches = getMaxPitchesForAge(age)
  if (!maxPitches) return false
  return effectivePitches > maxPitches
}
