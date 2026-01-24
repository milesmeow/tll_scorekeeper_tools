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

/**
 * Rule 6: Pitched before required rest days elapsed
 * A player cannot pitch until their next_eligible_pitch_date has arrived.
 *
 * @param {string} gameDate - The date of the current game (YYYY-MM-DD format)
 * @param {string|null} nextEligiblePitchDate - The player's next eligible pitch date from their most recent game (YYYY-MM-DD format)
 * @param {number[]} pitchedInnings - Array of innings the player pitched in the current game
 * @returns {boolean} - true if violation exists (pitched before eligible), false otherwise
 *
 * @example
 * // Player's last game was on May 10, threw 51 pitches (3 rest days required)
 * // Next eligible date: May 14
 * pitchedBeforeEligibleDate('2025-05-12', '2025-05-14', [1, 2]) // returns true (pitching on May 12, before May 14)
 * pitchedBeforeEligibleDate('2025-05-14', '2025-05-14', [1, 2]) // returns false (eligible on May 14)
 */
export function pitchedBeforeEligibleDate(gameDate, nextEligiblePitchDate, pitchedInnings) {
  // No violation if not pitching in this game
  if (!pitchedInnings || pitchedInnings.length === 0) {
    return false
  }

  // No violation if no previous pitching record (first time pitching)
  if (!nextEligiblePitchDate) {
    return false
  }

  // No violation if no game date (shouldn't happen, but defensive)
  if (!gameDate) {
    return false
  }

  // Compare dates - violation if game date is before eligible date
  // We use simple string comparison since both are in YYYY-MM-DD format
  return gameDate < nextEligiblePitchDate
}

/**
 * Calculate if a game has violations given its related data
 * This function is reusable for both save-time calculation and on-demand checks
 *
 * @param {Array} positions - positions_played records for the game
 * @param {Array} pitchingLogs - pitching_logs records for the game
 * @param {Object} playerAges - Map of player_id -> age
 * @param {string} [gameDate] - The date of the current game (YYYY-MM-DD format), required for Rule 6
 * @param {Object} [playerEligibilityDates] - Map of player_id -> next_eligible_pitch_date from previous games
 * @returns {boolean} - true if any violations exist, false otherwise
 */
export function calculateGameHasViolations(positions, pitchingLogs, playerAges, gameDate = null, playerEligibilityDates = {}) {
  // Group by player
  const playerData = {}

  positions.forEach(pos => {
    if (!playerData[pos.player_id]) {
      playerData[pos.player_id] = { pitched: [], caught: [], pitching: null }
    }
    if (pos.position === 'pitcher') {
      playerData[pos.player_id].pitched.push(pos.inning_number)
    } else if (pos.position === 'catcher') {
      playerData[pos.player_id].caught.push(pos.inning_number)
    }
  })

  pitchingLogs.forEach(log => {
    if (playerData[log.player_id]) {
      playerData[log.player_id].pitching = log
    }
  })

  // Check each player for violations
  for (const [playerId, player] of Object.entries(playerData)) {
    const pitchedInnings = player.pitched.sort((a, b) => a - b)
    const caughtInnings = player.caught.sort((a, b) => a - b)
    const effectivePitches = player.pitching ? (player.pitching.penultimate_batter_count + 1) : 0

    // Check Rule 1: Consecutive innings
    if (hasInningsGap(pitchedInnings)) return true

    // Check Rule 2: 41+ pitches -> cannot catch after
    if (cannotCatchDueToHighPitchCount(pitchedInnings, caughtInnings, effectivePitches)) return true

    // Check Rule 3: 4 innings catching -> cannot pitch after
    if (cannotPitchDueToFourInningsCatching(pitchedInnings, caughtInnings)) return true

    // Check Rule 4: Catch 1-3 + pitch 21+ -> cannot return to catch
    if (cannotCatchAgainDueToCombined(pitchedInnings, caughtInnings, effectivePitches)) return true

    // Check Rule 5: Pitch count exceeds age limit
    if (exceedsMaxPitchesForAge(playerAges[playerId], effectivePitches)) return true

    // Check Rule 6: Pitched before eligible date
    if (gameDate && pitchedBeforeEligibleDate(gameDate, playerEligibilityDates[playerId], pitchedInnings)) return true
  }

  return false
}
