import { describe, it, expect } from 'vitest'
import { parsePlayerCsv, PLAYER_AGE_MIN, PLAYER_AGE_MAX } from '../../lib/playerCsvUtils'

describe('playerCsvUtils', () => {
  const testTeamId = 'test-team-uuid'

  describe('parsePlayerCsv', () => {
    it('should parse valid CSV with all fields', () => {
      const csv = 'John Smith, 10, 5'
      const result = parsePlayerCsv(csv, testTeamId)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        name: 'John Smith',
        age: 10,
        jersey_number: '5',
        team_id: testTeamId
      })
    })

    it('should parse valid CSV without jersey number', () => {
      const csv = 'Jane Doe, 11'
      const result = parsePlayerCsv(csv, testTeamId)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        name: 'Jane Doe',
        age: 11,
        jersey_number: null,
        team_id: testTeamId
      })
    })

    it('should parse multiple players', () => {
      const csv = `John Smith, 10, 5
Jane Doe, 11, 7
Bob Johnson, 12`
      const result = parsePlayerCsv(csv, testTeamId)

      expect(result).toHaveLength(3)
      expect(result[0].name).toBe('John Smith')
      expect(result[1].name).toBe('Jane Doe')
      expect(result[2].name).toBe('Bob Johnson')
    })

    it('should skip empty lines', () => {
      const csv = `John Smith, 10, 5

Jane Doe, 11`
      const result = parsePlayerCsv(csv, testTeamId)

      expect(result).toHaveLength(2)
    })

    it('should trim whitespace from all fields', () => {
      const csv = '  John Smith  ,  10  ,  5  '
      const result = parsePlayerCsv(csv, testTeamId)

      expect(result[0].name).toBe('John Smith')
      expect(result[0].age).toBe(10)
      expect(result[0].jersey_number).toBe('5')
    })

    it('should accept minimum age (6)', () => {
      const csv = 'Young Player, 6, 1'
      const result = parsePlayerCsv(csv, testTeamId)

      expect(result[0].age).toBe(6)
    })

    it('should accept maximum age (12)', () => {
      const csv = 'Older Player, 12, 99'
      const result = parsePlayerCsv(csv, testTeamId)

      expect(result[0].age).toBe(12)
    })

    describe('validation errors', () => {
      it('should throw error for missing age (invalid format)', () => {
        const csv = 'John Smith'

        expect(() => parsePlayerCsv(csv, testTeamId)).toThrow(
          'Line 1: Invalid format. Expected: Name, Age, Jersey# (optional)'
        )
      })

      it('should throw error for empty name', () => {
        const csv = ', 10, 5'

        expect(() => parsePlayerCsv(csv, testTeamId)).toThrow('Line 1: Name is required')
      })

      it('should throw error for age below minimum', () => {
        const csv = 'Too Young, 5, 1'

        expect(() => parsePlayerCsv(csv, testTeamId)).toThrow(
          `Line 1: Age must be between ${PLAYER_AGE_MIN} and ${PLAYER_AGE_MAX}`
        )
      })

      it('should throw error for age above maximum', () => {
        const csv = 'Too Old, 13, 1'

        expect(() => parsePlayerCsv(csv, testTeamId)).toThrow(
          `Line 1: Age must be between ${PLAYER_AGE_MIN} and ${PLAYER_AGE_MAX}`
        )
      })

      it('should throw error for non-numeric age', () => {
        const csv = 'Bad Age, ten, 5'

        expect(() => parsePlayerCsv(csv, testTeamId)).toThrow(
          `Line 1: Age must be between ${PLAYER_AGE_MIN} and ${PLAYER_AGE_MAX}`
        )
      })

      it('should throw error for empty CSV data', () => {
        const csv = ''

        expect(() => parsePlayerCsv(csv, testTeamId)).toThrow(
          'No valid players found in CSV data'
        )
      })

      it('should throw error for CSV with only empty lines', () => {
        const csv = `

`
        expect(() => parsePlayerCsv(csv, testTeamId)).toThrow(
          'No valid players found in CSV data'
        )
      })

      it('should include correct line number in error for multi-line CSV', () => {
        const csv = `John Smith, 10, 5
Bad Line`

        expect(() => parsePlayerCsv(csv, testTeamId)).toThrow('Line 2:')
      })
    })
  })

  describe('constants', () => {
    it('should export PLAYER_AGE_MIN as 6', () => {
      expect(PLAYER_AGE_MIN).toBe(6)
    })

    it('should export PLAYER_AGE_MAX as 12', () => {
      expect(PLAYER_AGE_MAX).toBe(12)
    })
  })
})
