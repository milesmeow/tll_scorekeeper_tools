import { describe, it, expect } from 'vitest'
import {
  getEffectivePitchCount,
  getMaxPitchesForAge,
  hasInningsGap,
  cannotCatchDueToHighPitchCount,
  cannotPitchDueToFourInningsCatching,
  cannotCatchAgainDueToCombined,
  exceedsMaxPitchesForAge
} from '../../lib/violationRules'

describe('violationRules', () => {
  describe('getEffectivePitchCount', () => {
    it('should return 0 for null or 0 input', () => {
      expect(getEffectivePitchCount(null)).toBe(0)
      expect(getEffectivePitchCount(0)).toBe(0)
    })

    it('should add 1 to penultimate batter count', () => {
      expect(getEffectivePitchCount(20)).toBe(21)
      expect(getEffectivePitchCount(40)).toBe(41)
      expect(getEffectivePitchCount(84)).toBe(85)
    })
  })

  describe('getMaxPitchesForAge', () => {
    it('should return correct limits for different age groups', () => {
      expect(getMaxPitchesForAge(7)).toBe(50)
      expect(getMaxPitchesForAge(8)).toBe(50)
      expect(getMaxPitchesForAge(9)).toBe(75)
      expect(getMaxPitchesForAge(10)).toBe(75)
      expect(getMaxPitchesForAge(11)).toBe(85)
      expect(getMaxPitchesForAge(12)).toBe(85)
    })

    it('should return null for ages outside defined ranges', () => {
      expect(getMaxPitchesForAge(6)).toBe(null)
      expect(getMaxPitchesForAge(13)).toBe(null)
    })
  })

  describe('Rule 1: hasInningsGap', () => {
    it('should return false for consecutive innings', () => {
      expect(hasInningsGap([1, 2, 3])).toBe(false)
      expect(hasInningsGap([2, 3, 4])).toBe(false)
    })

    it('should return false for single inning', () => {
      expect(hasInningsGap([1])).toBe(false)
      expect(hasInningsGap([5])).toBe(false)
    })

    it('should return false for empty array', () => {
      expect(hasInningsGap([])).toBe(false)
    })

    it('should return true for non-consecutive innings', () => {
      expect(hasInningsGap([1, 3])).toBe(true)
      expect(hasInningsGap([1, 2, 4])).toBe(true)
      expect(hasInningsGap([1, 5, 6])).toBe(true)
    })

    it('should handle unsorted innings', () => {
      expect(hasInningsGap([3, 1, 2])).toBe(false)
      expect(hasInningsGap([5, 1, 3])).toBe(true)
    })
  })

  describe('Rule 2: cannotCatchDueToHighPitchCount', () => {
    it('should return false if pitch count is below 41', () => {
      expect(cannotCatchDueToHighPitchCount([1, 2], [3, 4], 40)).toBe(false)
      expect(cannotCatchDueToHighPitchCount([1, 2], [3, 4], 30)).toBe(false)
    })

    it('should return false if no catching innings', () => {
      expect(cannotCatchDueToHighPitchCount([1, 2], [], 50)).toBe(false)
    })

    it('should return false if no pitching innings', () => {
      expect(cannotCatchDueToHighPitchCount([], [1, 2], 50)).toBe(false)
    })

    it('should return false if catching occurred before pitching', () => {
      expect(cannotCatchDueToHighPitchCount([3, 4, 5], [1, 2], 41)).toBe(false)
    })

    it('should return true if catching after pitching with 41+ pitches', () => {
      expect(cannotCatchDueToHighPitchCount([1, 2, 3], [4, 5], 41)).toBe(true)
      expect(cannotCatchDueToHighPitchCount([1, 2], [3], 50)).toBe(true)
    })
  })

  describe('Rule 3: cannotPitchDueToFourInningsCatching', () => {
    it('should return false if caught less than 4 innings', () => {
      expect(cannotPitchDueToFourInningsCatching([5, 6], [1, 2, 3])).toBe(false)
      expect(cannotPitchDueToFourInningsCatching([5], [1, 2])).toBe(false)
    })

    it('should return false if no pitching innings', () => {
      expect(cannotPitchDueToFourInningsCatching([], [1, 2, 3, 4])).toBe(false)
    })

    it('should return false if pitching occurred before 4th catching inning', () => {
      expect(cannotPitchDueToFourInningsCatching([1, 2], [3, 4, 5, 6])).toBe(false)
    })

    it('should return true if pitching after catching 4 innings', () => {
      expect(cannotPitchDueToFourInningsCatching([5, 6], [1, 2, 3, 4])).toBe(true)
      expect(cannotPitchDueToFourInningsCatching([6], [1, 2, 3, 4])).toBe(true)
    })

    it('should handle unsorted catching innings', () => {
      expect(cannotPitchDueToFourInningsCatching([5], [4, 2, 1, 3])).toBe(true)
    })
  })

  describe('Rule 4: cannotCatchAgainDueToCombined', () => {
    it('should return false if caught less than 1 inning', () => {
      expect(cannotCatchAgainDueToCombined([2, 3], [], 25)).toBe(false)
    })

    it('should return false if caught more than 3 innings', () => {
      expect(cannotCatchAgainDueToCombined([5, 6], [1, 2, 3, 4, 7], 25)).toBe(false)
    })

    it('should return false if pitch count below 21', () => {
      expect(cannotCatchAgainDueToCombined([2, 3], [1, 4], 20)).toBe(false)
      expect(cannotCatchAgainDueToCombined([2, 3], [1, 4], 15)).toBe(false)
    })

    it('should return false if no pitching innings', () => {
      expect(cannotCatchAgainDueToCombined([], [1, 2], 25)).toBe(false)
    })

    it('should return false if only caught after pitching', () => {
      expect(cannotCatchAgainDueToCombined([1, 2, 3], [4, 5], 25)).toBe(false)
    })

    it('should return false if caught before pitching but did not return', () => {
      expect(cannotCatchAgainDueToCombined([2, 3], [1], 25)).toBe(false)
    })

    it('should return true if caught 1-3 innings, pitched 21+, then returned to catch', () => {
      expect(cannotCatchAgainDueToCombined([2, 3], [1, 4], 21)).toBe(true)
      expect(cannotCatchAgainDueToCombined([3, 4], [1, 2, 5], 30)).toBe(true)
    })
  })

  describe('Rule 5: exceedsMaxPitchesForAge', () => {
    it('should return false if no age provided', () => {
      expect(exceedsMaxPitchesForAge(null, 100)).toBe(false)
      expect(exceedsMaxPitchesForAge(undefined, 100)).toBe(false)
    })

    it('should return false if age has no defined limit', () => {
      expect(exceedsMaxPitchesForAge(6, 100)).toBe(false)
      expect(exceedsMaxPitchesForAge(13, 100)).toBe(false)
    })

    it('should return false if pitch count is within limit', () => {
      expect(exceedsMaxPitchesForAge(7, 50)).toBe(false)
      expect(exceedsMaxPitchesForAge(8, 49)).toBe(false)
      expect(exceedsMaxPitchesForAge(9, 75)).toBe(false)
      expect(exceedsMaxPitchesForAge(10, 70)).toBe(false)
      expect(exceedsMaxPitchesForAge(11, 85)).toBe(false)
      expect(exceedsMaxPitchesForAge(12, 80)).toBe(false)
    })

    it('should return true if pitch count exceeds age limit', () => {
      expect(exceedsMaxPitchesForAge(7, 51)).toBe(true)
      expect(exceedsMaxPitchesForAge(8, 60)).toBe(true)
      expect(exceedsMaxPitchesForAge(9, 76)).toBe(true)
      expect(exceedsMaxPitchesForAge(10, 80)).toBe(true)
      expect(exceedsMaxPitchesForAge(11, 86)).toBe(true)
      expect(exceedsMaxPitchesForAge(12, 90)).toBe(true)
    })
  })
})
