import { describe, it, expect } from 'vitest'
import {
  PITCH_SMART_RULES,
  getRequiredRestDays,
  calculateNextEligibleDate
} from '../../lib/pitchSmartRules'

describe('pitchSmartRules', () => {
  describe('PITCH_SMART_RULES data structure', () => {
    it('should have rules for ages 7-12', () => {
      expect(PITCH_SMART_RULES).toHaveLength(3)
      expect(PITCH_SMART_RULES[0].ageMin).toBe(7)
      expect(PITCH_SMART_RULES[0].ageMax).toBe(8)
      expect(PITCH_SMART_RULES[1].ageMin).toBe(9)
      expect(PITCH_SMART_RULES[1].ageMax).toBe(10)
      expect(PITCH_SMART_RULES[2].ageMin).toBe(11)
      expect(PITCH_SMART_RULES[2].ageMax).toBe(12)
    })

    it('should have correct max pitches per game', () => {
      expect(PITCH_SMART_RULES[0].maxPitchesPerGame).toBe(50)  // 7-8
      expect(PITCH_SMART_RULES[1].maxPitchesPerGame).toBe(75)  // 9-10
      expect(PITCH_SMART_RULES[2].maxPitchesPerGame).toBe(85)  // 11-12
    })
  })

  describe('getRequiredRestDays', () => {
    describe('ages 7-8', () => {
      it('should return 0 rest days for 1-20 pitches', () => {
        expect(getRequiredRestDays(7, 1)).toBe(0)
        expect(getRequiredRestDays(8, 10)).toBe(0)
        expect(getRequiredRestDays(7, 20)).toBe(0)
      })

      it('should return 1 rest day for 21-35 pitches', () => {
        expect(getRequiredRestDays(7, 21)).toBe(1)
        expect(getRequiredRestDays(8, 28)).toBe(1)
        expect(getRequiredRestDays(7, 35)).toBe(1)
      })

      it('should return 2 rest days for 36-50 pitches', () => {
        expect(getRequiredRestDays(7, 36)).toBe(2)
        expect(getRequiredRestDays(8, 45)).toBe(2)
        expect(getRequiredRestDays(7, 50)).toBe(2)
      })
    })

    describe('ages 9-10', () => {
      it('should return 0 rest days for 1-20 pitches', () => {
        expect(getRequiredRestDays(9, 1)).toBe(0)
        expect(getRequiredRestDays(10, 15)).toBe(0)
        expect(getRequiredRestDays(9, 20)).toBe(0)
      })

      it('should return 1 rest day for 21-35 pitches', () => {
        expect(getRequiredRestDays(9, 21)).toBe(1)
        expect(getRequiredRestDays(10, 30)).toBe(1)
        expect(getRequiredRestDays(9, 35)).toBe(1)
      })

      it('should return 2 rest days for 36-50 pitches', () => {
        expect(getRequiredRestDays(9, 36)).toBe(2)
        expect(getRequiredRestDays(10, 45)).toBe(2)
        expect(getRequiredRestDays(9, 50)).toBe(2)
      })

      it('should return 3 rest days for 51-65 pitches', () => {
        expect(getRequiredRestDays(9, 51)).toBe(3)
        expect(getRequiredRestDays(10, 60)).toBe(3)
        expect(getRequiredRestDays(9, 65)).toBe(3)
      })

      it('should return 4 rest days for 66+ pitches', () => {
        expect(getRequiredRestDays(9, 66)).toBe(4)
        expect(getRequiredRestDays(10, 70)).toBe(4)
        expect(getRequiredRestDays(9, 75)).toBe(4)
        expect(getRequiredRestDays(10, 100)).toBe(4)
      })
    })

    describe('ages 11-12', () => {
      it('should return 0 rest days for 1-20 pitches', () => {
        expect(getRequiredRestDays(11, 1)).toBe(0)
        expect(getRequiredRestDays(12, 15)).toBe(0)
        expect(getRequiredRestDays(11, 20)).toBe(0)
      })

      it('should return 1 rest day for 21-35 pitches', () => {
        expect(getRequiredRestDays(11, 21)).toBe(1)
        expect(getRequiredRestDays(12, 30)).toBe(1)
        expect(getRequiredRestDays(11, 35)).toBe(1)
      })

      it('should return 2 rest days for 36-50 pitches', () => {
        expect(getRequiredRestDays(11, 36)).toBe(2)
        expect(getRequiredRestDays(12, 45)).toBe(2)
        expect(getRequiredRestDays(11, 50)).toBe(2)
      })

      it('should return 3 rest days for 51-65 pitches', () => {
        expect(getRequiredRestDays(11, 51)).toBe(3)
        expect(getRequiredRestDays(12, 60)).toBe(3)
        expect(getRequiredRestDays(11, 65)).toBe(3)
      })

      it('should return 4 rest days for 66+ pitches', () => {
        expect(getRequiredRestDays(11, 66)).toBe(4)
        expect(getRequiredRestDays(12, 75)).toBe(4)
        expect(getRequiredRestDays(11, 85)).toBe(4)
        expect(getRequiredRestDays(12, 100)).toBe(4)
      })
    })

    describe('edge cases', () => {
      it('should return null for ages outside defined ranges', () => {
        expect(getRequiredRestDays(6, 20)).toBe(null)
        expect(getRequiredRestDays(13, 20)).toBe(null)
        expect(getRequiredRestDays(5, 30)).toBe(null)
        expect(getRequiredRestDays(15, 40)).toBe(null)
      })

      it('should return null for pitch counts outside defined ranges', () => {
        // Ages 7-8 max is 50, so anything above 50 goes to 999 range
        expect(getRequiredRestDays(7, 51)).toBe(null)
        expect(getRequiredRestDays(8, 60)).toBe(null)
      })

      it('should handle boundary values correctly', () => {
        expect(getRequiredRestDays(10, 20)).toBe(0)  // Top of 1-20 range
        expect(getRequiredRestDays(10, 21)).toBe(1)  // Bottom of 21-35 range
        expect(getRequiredRestDays(10, 35)).toBe(1)  // Top of 21-35 range
        expect(getRequiredRestDays(10, 36)).toBe(2)  // Bottom of 36-50 range
      })
    })
  })

  describe('calculateNextEligibleDate', () => {
    describe('basic calculations', () => {
      it('should calculate next day for 0 rest days', () => {
        const gameDate = '2025-05-10'
        const nextDate = calculateNextEligibleDate(gameDate, 10, 15)
        expect(nextDate).toBeInstanceOf(Date)
        expect(nextDate.toISOString().split('T')[0]).toBe('2025-05-11')
      })

      it('should calculate 2 days later for 1 rest day', () => {
        const gameDate = '2025-05-10'
        const nextDate = calculateNextEligibleDate(gameDate, 10, 25)
        expect(nextDate).toBeInstanceOf(Date)
        expect(nextDate.toISOString().split('T')[0]).toBe('2025-05-12')
      })

      it('should calculate 3 days later for 2 rest days', () => {
        const gameDate = '2025-05-10'
        const nextDate = calculateNextEligibleDate(gameDate, 10, 40)
        expect(nextDate).toBeInstanceOf(Date)
        expect(nextDate.toISOString().split('T')[0]).toBe('2025-05-13')
      })

      it('should calculate 4 days later for 3 rest days', () => {
        const gameDate = '2025-05-10'
        const nextDate = calculateNextEligibleDate(gameDate, 10, 55)
        expect(nextDate).toBeInstanceOf(Date)
        expect(nextDate.toISOString().split('T')[0]).toBe('2025-05-14')
      })

      it('should calculate 5 days later for 4 rest days', () => {
        const gameDate = '2025-05-10'
        const nextDate = calculateNextEligibleDate(gameDate, 10, 70)
        expect(nextDate).toBeInstanceOf(Date)
        expect(nextDate.toISOString().split('T')[0]).toBe('2025-05-15')
      })
    })

    describe('different age groups', () => {
      it('should work for ages 7-8', () => {
        const gameDate = '2025-05-10'
        // 30 pitches = 1 rest day for ages 7-8
        const nextDate = calculateNextEligibleDate(gameDate, 7, 30)
        expect(nextDate.toISOString().split('T')[0]).toBe('2025-05-12')
      })

      it('should work for ages 9-10', () => {
        const gameDate = '2025-05-10'
        // 55 pitches = 3 rest days for ages 9-10
        const nextDate = calculateNextEligibleDate(gameDate, 9, 55)
        expect(nextDate.toISOString().split('T')[0]).toBe('2025-05-14')
      })

      it('should work for ages 11-12', () => {
        const gameDate = '2025-05-10'
        // 66 pitches = 4 rest days for ages 11-12
        const nextDate = calculateNextEligibleDate(gameDate, 12, 66)
        expect(nextDate.toISOString().split('T')[0]).toBe('2025-05-15')
      })
    })

    describe('date object input', () => {
      it('should accept Date object as input', () => {
        const gameDate = new Date('2025-05-10')
        const nextDate = calculateNextEligibleDate(gameDate, 10, 25)
        expect(nextDate).toBeInstanceOf(Date)
        expect(nextDate.toISOString().split('T')[0]).toBe('2025-05-12')
      })
    })

    describe('edge cases', () => {
      it('should return null for ages outside defined ranges', () => {
        expect(calculateNextEligibleDate('2025-05-10', 6, 20)).toBe(null)
        expect(calculateNextEligibleDate('2025-05-10', 13, 20)).toBe(null)
      })

      it('should return null for pitch counts outside defined ranges', () => {
        expect(calculateNextEligibleDate('2025-05-10', 7, 60)).toBe(null)
      })

      it('should handle month boundaries', () => {
        const gameDate = '2025-05-30'
        const nextDate = calculateNextEligibleDate(gameDate, 10, 70)
        expect(nextDate.toISOString().split('T')[0]).toBe('2025-06-04')
      })

      it('should handle year boundaries', () => {
        const gameDate = '2025-12-30'
        const nextDate = calculateNextEligibleDate(gameDate, 10, 70)
        expect(nextDate.toISOString().split('T')[0]).toBe('2026-01-04')
      })
    })

    describe('real-world scenarios', () => {
      it('should calculate correct date for high pitch count scenario', () => {
        // 12-year-old throws 75 pitches (4 rest days)
        const gameDate = '2025-05-11'
        const nextDate = calculateNextEligibleDate(gameDate, 12, 75)
        // Game on May 11, needs 4 rest days, eligible on May 16
        expect(nextDate.toISOString().split('T')[0]).toBe('2025-05-16')
      })

      it('should allow same-day eligibility for minimal pitches', () => {
        // 10-year-old throws 10 pitches (0 rest days)
        const gameDate = '2025-05-11'
        const nextDate = calculateNextEligibleDate(gameDate, 10, 10)
        // Eligible next day
        expect(nextDate.toISOString().split('T')[0]).toBe('2025-05-12')
      })

      it('should handle mid-range pitch counts', () => {
        // 9-year-old throws 40 pitches (2 rest days)
        const gameDate = '2025-05-15'
        const nextDate = calculateNextEligibleDate(gameDate, 9, 40)
        // Game on May 15, needs 2 rest days, eligible on May 18
        expect(nextDate.toISOString().split('T')[0]).toBe('2025-05-18')
      })
    })
  })
})
