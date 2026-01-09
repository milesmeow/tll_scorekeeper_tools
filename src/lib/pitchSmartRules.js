/**
 * MLB and USA Baseball Pitch Smart Guidelines
 *
 * These rules define pitch count limits and required rest days
 * to protect young pitchers' arms.
 */

export const PITCH_SMART_RULES = [
  {
    ageMin: 7,
    ageMax: 8,
    maxPitchesPerGame: 50,
    restDayRanges: [
      { minPitches: 1, maxPitches: 20, restDays: 0 },
      { minPitches: 21, maxPitches: 35, restDays: 1 },
      { minPitches: 36, maxPitches: 50, restDays: 2 }
    ]
  },
  {
    ageMin: 9,
    ageMax: 10,
    maxPitchesPerGame: 75,
    restDayRanges: [
      { minPitches: 1, maxPitches: 20, restDays: 0 },
      { minPitches: 21, maxPitches: 35, restDays: 1 },
      { minPitches: 36, maxPitches: 50, restDays: 2 },
      { minPitches: 51, maxPitches: 65, restDays: 3 },
      { minPitches: 66, maxPitches: 999, restDays: 4 }
    ]
  },
  {
    ageMin: 11,
    ageMax: 12,
    maxPitchesPerGame: 85,
    restDayRanges: [
      { minPitches: 1, maxPitches: 20, restDays: 0 },
      { minPitches: 21, maxPitches: 35, restDays: 1 },
      { minPitches: 36, maxPitches: 50, restDays: 2 },
      { minPitches: 51, maxPitches: 65, restDays: 3 },
      { minPitches: 66, maxPitches: 999, restDays: 4 }
    ]
  }
]

/**
 * Get the required rest days for a pitcher based on their age and pitch count
 *
 * @param {number} playerAge - The player's age
 * @param {number} pitchCount - Number of pitches thrown
 * @returns {number|null} Required rest days, or null if no rule found
 *
 * @example
 * getRequiredRestDays(12, 21) // returns 1 (needs 1 day of rest)
 * getRequiredRestDays(10, 66) // returns 4 (needs 4 days of rest)
 */
export function getRequiredRestDays(playerAge, pitchCount) {
  // Find the age range rule
  const rule = PITCH_SMART_RULES.find(
    r => playerAge >= r.ageMin && playerAge <= r.ageMax
  )

  if (!rule) {
    return null
  }

  // Find the pitch count range
  const range = rule.restDayRanges.find(
    r => pitchCount >= r.minPitches && pitchCount <= r.maxPitches
  )

  if (!range) {
    return null
  }

  return range.restDays
}

/**
 * Calculate the next eligible pitch date for a player
 *
 * @param {Date|string} gameDate - The date the player pitched
 * @param {number} playerAge - The player's age
 * @param {number} pitchCount - Number of pitches thrown
 * @returns {Date|null} The next date the player is eligible to pitch, or null if no rule found
 *
 * @example
 * calculateNextEligibleDate('2025-05-11', 12, 21) // returns Date('2025-05-13')
 */
export function calculateNextEligibleDate(gameDate, playerAge, pitchCount) {
  const restDays = getRequiredRestDays(playerAge, pitchCount)

  if (restDays === null) {
    return null
  }

  const gameDateObj = new Date(gameDate)
  const daysToAdd = restDays + 1
  const eligibleDateMs = gameDateObj.getTime() + (daysToAdd * 24 * 60 * 60 * 1000)

  return new Date(eligibleDateMs)
}
