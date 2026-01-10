/**
 * Utility functions for pitch count display and formatting
 */

/**
 * Parse a date string as local time (not UTC)
 * Appends 'T00:00:00' to force local timezone interpretation
 * @param {string} dateString - ISO date string (YYYY-MM-DD)
 * @returns {Date} - Date object in local timezone
 */
export function parseLocalDate(dateString) {
  if (!dateString) {
    throw new Error('parseLocalDate requires a valid date string')
  }
  return new Date(dateString + 'T00:00:00')
}

/**
 * Format a date for display
 * @param {string} dateString - ISO date string (YYYY-MM-DD)
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} - Formatted date string
 */
export function formatDate(dateString, options = {}) {
  if (!dateString) return 'N/A'
  return parseLocalDate(dateString).toLocaleDateString('en-US', options)
}

/**
 * Calculate official pitch count from penultimate batter count
 * Per pitch count rules, the official count is penultimate + 1
 * @param {number|null|undefined} penultimate - Penultimate batter count
 * @returns {number} - Official pitch count
 */
export function getOfficialPitchCount(penultimate) {
  if (penultimate === null || penultimate === undefined) return 0
  // penultimate could be 0... if the pitcher just pitched to one batter
  return penultimate + 1
}

/**
 * Format a date for display in the roster
 * @param {string|null} dateString - ISO date string
 * @returns {string} - Formatted date or "N/A"
 */
export function formatRosterDate(dateString) {
  if (!dateString) return 'N/A'

  const date = parseLocalDate(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Get display values for a player's pitch count data
 * @param {Object|null} pitchingLog - The player's most recent pitching log
 * @returns {Object} - { lastDate, officialCount, nextEligibleDate }
 */
export function getPitchingDisplayData(pitchingLog) {
  if (!pitchingLog || !pitchingLog.game) {
    return {
      lastDate: 'Never pitched',
      officialCount: '--',
      nextEligibleDate: '--'
    }
  }

  const officialCount = getOfficialPitchCount(pitchingLog.penultimate_batter_count)

  return {
    lastDate: formatRosterDate(pitchingLog.game.game_date),
    officialCount: officialCount > 0 ? officialCount.toString() : '--',
    nextEligibleDate: pitchingLog.next_eligible_pitch_date
      ? formatRosterDate(pitchingLog.next_eligible_pitch_date)
      : 'Eligible now'
  }
}
