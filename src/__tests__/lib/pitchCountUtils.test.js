import { describe, it, expect } from 'vitest'
import {
  parseLocalDate,
  formatDate,
  getOfficialPitchCount,
  formatRosterDate,
  getPitchingDisplayData
} from '../../lib/pitchCountUtils'

describe('pitchCountUtils', () => {
  describe('parseLocalDate', () => {
    it('should parse date string as local time', () => {
      const date = parseLocalDate('2025-05-15')
      expect(date).toBeInstanceOf(Date)
      expect(date.getFullYear()).toBe(2025)
      expect(date.getMonth()).toBe(4) // 0-indexed, May = 4
      expect(date.getDate()).toBe(15)
    })

    it('should parse date without timezone offset', () => {
      const date = parseLocalDate('2025-01-15')
      // Should show Jan 15, not Jan 14 (no UTC offset)
      expect(date.getDate()).toBe(15)
      expect(date.getMonth()).toBe(0) // January
    })

    it('should handle different months', () => {
      expect(parseLocalDate('2025-01-01').getMonth()).toBe(0)  // January
      expect(parseLocalDate('2025-06-15').getMonth()).toBe(5)  // June
      expect(parseLocalDate('2025-12-31').getMonth()).toBe(11) // December
    })

    it('should throw error for null or undefined', () => {
      expect(() => parseLocalDate(null)).toThrow('parseLocalDate requires a valid date string')
      expect(() => parseLocalDate(undefined)).toThrow('parseLocalDate requires a valid date string')
    })

    it('should throw error for empty string', () => {
      expect(() => parseLocalDate('')).toThrow('parseLocalDate requires a valid date string')
    })

    it('should handle leap years', () => {
      const date = parseLocalDate('2024-02-29') // 2024 is a leap year
      expect(date.getDate()).toBe(29)
      expect(date.getMonth()).toBe(1) // February
    })
  })

  describe('formatDate', () => {
    it('should format date with default options', () => {
      const formatted = formatDate('2025-05-15')
      expect(formatted).toBe('5/15/2025')
    })

    it('should format date with custom options', () => {
      const formatted = formatDate('2025-05-15', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
      expect(formatted).toBe('May 15, 2025')
    })

    it('should format date with short month', () => {
      const formatted = formatDate('2025-05-15', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
      expect(formatted).toBe('May 15, 2025')
    })

    it('should return "N/A" for null', () => {
      expect(formatDate(null)).toBe('N/A')
    })

    it('should return "N/A" for undefined', () => {
      expect(formatDate(undefined)).toBe('N/A')
    })

    it('should return "N/A" for empty string', () => {
      expect(formatDate('')).toBe('N/A')
    })

    it('should handle different dates correctly', () => {
      expect(formatDate('2025-01-01')).toBe('1/1/2025')
      expect(formatDate('2025-12-31')).toBe('12/31/2025')
    })
  })

  describe('getOfficialPitchCount', () => {
    it('should add 1 to penultimate batter count', () => {
      expect(getOfficialPitchCount(0)).toBe(1)
      expect(getOfficialPitchCount(10)).toBe(11)
      expect(getOfficialPitchCount(20)).toBe(21)
      expect(getOfficialPitchCount(40)).toBe(41)
      expect(getOfficialPitchCount(84)).toBe(85)
    })

    it('should return 0 for null', () => {
      expect(getOfficialPitchCount(null)).toBe(0)
    })

    it('should return 0 for undefined', () => {
      expect(getOfficialPitchCount(undefined)).toBe(0)
    })

    it('should handle zero correctly', () => {
      // If penultimate is 0, official count is 1 (pitched to one batter)
      expect(getOfficialPitchCount(0)).toBe(1)
    })

    it('should handle high pitch counts', () => {
      expect(getOfficialPitchCount(100)).toBe(101)
      expect(getOfficialPitchCount(120)).toBe(121)
    })
  })

  describe('formatRosterDate', () => {
    it('should format date in roster style', () => {
      const formatted = formatRosterDate('2025-05-15')
      expect(formatted).toBe('May 15, 2025')
    })

    it('should return "N/A" for null', () => {
      expect(formatRosterDate(null)).toBe('N/A')
    })

    it('should return "N/A" for undefined', () => {
      expect(formatRosterDate(undefined)).toBe('N/A')
    })

    it('should handle different months', () => {
      expect(formatRosterDate('2025-01-01')).toBe('Jan 1, 2025')
      expect(formatRosterDate('2025-06-15')).toBe('Jun 15, 2025')
      expect(formatRosterDate('2025-12-31')).toBe('Dec 31, 2025')
    })

    it('should handle single-digit days', () => {
      expect(formatRosterDate('2025-05-05')).toBe('May 5, 2025')
    })

    it('should handle double-digit days', () => {
      expect(formatRosterDate('2025-05-25')).toBe('May 25, 2025')
    })
  })

  describe('getPitchingDisplayData', () => {
    describe('with valid pitching log', () => {
      it('should return formatted data for player with pitching history', () => {
        const pitchingLog = {
          penultimate_batter_count: 40,
          next_eligible_pitch_date: '2025-05-15',
          game: {
            game_date: '2025-05-10'
          }
        }

        const result = getPitchingDisplayData(pitchingLog)

        expect(result.lastDate).toBe('May 10, 2025')
        expect(result.officialCount).toBe('41')
        expect(result.nextEligibleDate).toBe('May 15, 2025')
      })

      it('should show "Eligible now" when no next eligible date', () => {
        const pitchingLog = {
          penultimate_batter_count: 10,
          next_eligible_pitch_date: null,
          game: {
            game_date: '2025-05-10'
          }
        }

        const result = getPitchingDisplayData(pitchingLog)

        expect(result.nextEligibleDate).toBe('Eligible now')
      })

      it('should handle zero pitch count (pitched to one batter)', () => {
        const pitchingLog = {
          penultimate_batter_count: 0,
          next_eligible_pitch_date: null,
          game: {
            game_date: '2025-05-10'
          }
        }

        const result = getPitchingDisplayData(pitchingLog)

        // penultimate = 0 means pitched to 1 batter, so official count = 1
        expect(result.officialCount).toBe('1')
      })

      it('should handle high pitch counts', () => {
        const pitchingLog = {
          penultimate_batter_count: 84,
          next_eligible_pitch_date: '2025-05-20',
          game: {
            game_date: '2025-05-10'
          }
        }

        const result = getPitchingDisplayData(pitchingLog)

        expect(result.officialCount).toBe('85')
      })
    })

    describe('with null or missing pitching log', () => {
      it('should return default values for null', () => {
        const result = getPitchingDisplayData(null)

        expect(result.lastDate).toBe('Never pitched')
        expect(result.officialCount).toBe('--')
        expect(result.nextEligibleDate).toBe('--')
      })

      it('should return default values for undefined', () => {
        const result = getPitchingDisplayData(undefined)

        expect(result.lastDate).toBe('Never pitched')
        expect(result.officialCount).toBe('--')
        expect(result.nextEligibleDate).toBe('--')
      })

      it('should return default values when game is missing', () => {
        const pitchingLog = {
          penultimate_batter_count: 40,
          next_eligible_pitch_date: '2025-05-15'
          // game is missing
        }

        const result = getPitchingDisplayData(pitchingLog)

        expect(result.lastDate).toBe('Never pitched')
        expect(result.officialCount).toBe('--')
        expect(result.nextEligibleDate).toBe('--')
      })
    })

    describe('edge cases', () => {
      it('should handle penultimate count of 1', () => {
        const pitchingLog = {
          penultimate_batter_count: 1,
          next_eligible_pitch_date: null,
          game: {
            game_date: '2025-05-10'
          }
        }

        const result = getPitchingDisplayData(pitchingLog)

        expect(result.officialCount).toBe('2')
      })

      it('should handle different date formats', () => {
        const pitchingLog = {
          penultimate_batter_count: 20,
          next_eligible_pitch_date: '2025-12-25',
          game: {
            game_date: '2025-12-20'
          }
        }

        const result = getPitchingDisplayData(pitchingLog)

        expect(result.lastDate).toBe('Dec 20, 2025')
        expect(result.nextEligibleDate).toBe('Dec 25, 2025')
      })

      it('should handle year boundaries', () => {
        const pitchingLog = {
          penultimate_batter_count: 50,
          next_eligible_pitch_date: '2026-01-05',
          game: {
            game_date: '2025-12-31'
          }
        }

        const result = getPitchingDisplayData(pitchingLog)

        expect(result.lastDate).toBe('Dec 31, 2025')
        expect(result.nextEligibleDate).toBe('Jan 5, 2026')
      })
    })

    describe('real-world scenarios', () => {
      it('should display data for player who just pitched', () => {
        const pitchingLog = {
          penultimate_batter_count: 25,
          next_eligible_pitch_date: '2025-05-13',
          game: {
            game_date: '2025-05-11'
          }
        }

        const result = getPitchingDisplayData(pitchingLog)

        expect(result.lastDate).toBe('May 11, 2025')
        expect(result.officialCount).toBe('26')
        expect(result.nextEligibleDate).toBe('May 13, 2025')
      })

      it('should display data for player with high pitch count needing rest', () => {
        const pitchingLog = {
          penultimate_batter_count: 74,
          next_eligible_pitch_date: '2025-05-16',
          game: {
            game_date: '2025-05-11'
          }
        }

        const result = getPitchingDisplayData(pitchingLog)

        expect(result.lastDate).toBe('May 11, 2025')
        expect(result.officialCount).toBe('75')
        expect(result.nextEligibleDate).toBe('May 16, 2025')
      })

      it('should display data for player who pitched minimal pitches', () => {
        const pitchingLog = {
          penultimate_batter_count: 5,
          next_eligible_pitch_date: null,
          game: {
            game_date: '2025-05-11'
          }
        }

        const result = getPitchingDisplayData(pitchingLog)

        expect(result.lastDate).toBe('May 11, 2025')
        expect(result.officialCount).toBe('6')
        expect(result.nextEligibleDate).toBe('Eligible now')
      })
    })
  })
})
