/**
 * Player CSV parsing utilities for bulk import functionality.
 *
 * This module provides a single source of truth for CSV player parsing,
 * used by both BulkAddModal and TeamPlayersModal components.
 */

// Constants for age validation (single source of truth)
export const PLAYER_AGE_MIN = 6
export const PLAYER_AGE_MAX = 12

/**
 * Parse CSV data into player objects for bulk import.
 * Format: Name, Age, Jersey# (optional)
 *
 * @param {string} csvData - Raw CSV string with one player per line
 * @param {string} teamId - Team UUID to assign players to
 * @returns {Array} Array of player objects ready for database insert
 * @throws {Error} Validation errors with line numbers for user feedback
 *
 * @example
 * const players = parsePlayerCsv("John Smith, 10, 5\nJane Doe, 11", "team-uuid")
 * // Returns: [
 * //   { name: "John Smith", age: 10, jersey_number: "5", team_id: "team-uuid" },
 * //   { name: "Jane Doe", age: 11, jersey_number: null, team_id: "team-uuid" }
 * // ]
 */
export function parsePlayerCsv(csvData, teamId) {
  const lines = csvData.trim().split('\n')
  const players = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const parts = line.split(',').map(p => p.trim())

    if (parts.length < 2) {
      throw new Error(`Line ${i + 1}: Invalid format. Expected: Name, Age, Jersey# (optional)`)
    }

    const [name, age, jersey] = parts

    if (!name) {
      throw new Error(`Line ${i + 1}: Name is required`)
    }

    const ageNum = parseInt(age)
    if (isNaN(ageNum) || ageNum < PLAYER_AGE_MIN || ageNum > PLAYER_AGE_MAX) {
      throw new Error(`Line ${i + 1}: Age must be between ${PLAYER_AGE_MIN} and ${PLAYER_AGE_MAX}`)
    }

    players.push({
      name,
      age: ageNum,
      jersey_number: jersey || null,
      team_id: teamId
    })
  }

  if (players.length === 0) {
    throw new Error('No valid players found in CSV data')
  }

  return players
}
