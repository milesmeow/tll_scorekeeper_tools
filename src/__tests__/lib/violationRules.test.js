import { describe, it, expect } from 'vitest'
import {
  getEffectivePitchCount,
  getMaxPitchesForAge,
  hasInningsGap,
  cannotCatchDueToHighPitchCount,
  cannotPitchDueToFourInningsCatching,
  cannotCatchAgainDueToCombined,
  exceedsMaxPitchesForAge,
  pitchedBeforeEligibleDate
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
      expect(getMaxPitchesForAge(5)).toBe(null)
      expect(getMaxPitchesForAge(13)).toBe(null)
    })
  })


  /**
   * Rule 1: Pitchers must pitch consecutive innings
   * A pitcher cannot return after being taken out
   */
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


  /**
   * Rule 2: 41+ pitches -> cannot catch after pitching
   * If a pitcher throws 41+ pitches, they cannot catch for the remainder of the game
   */ 
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

  /**
   * Rule 3: 4 innings catching -> cannot pitch after
   * A player who catches 4+ innings cannot pitch in this game
   */
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

  /**
   * Rule 4: Catch 1-3 innings + 21+ pitches -> cannot return to catch
   * A player who caught 1-3 innings, moved to pitcher, and delivered 21+ pitches
   * may not return to the catcher position
   */
  describe('Rule 4: cannotCatchAgainDueToCombined', () => {
    it('should return false if caught less than 1 inning before pitching', () => {
      expect(cannotCatchAgainDueToCombined([2, 3], [], 25)).toBe(false)
    })

    it('should return false if caught more than 3 innings before pitching', () => {
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

    it('should return true if caught 1-3 innings before pitching, pitched 21+, then returned to catch', () => {
      expect(cannotCatchAgainDueToCombined([2, 3], [1, 4], 21)).toBe(true)
      expect(cannotCatchAgainDueToCombined([3, 4], [1, 2, 5], 30)).toBe(true)
    })
  })

  /**
   * Rule 5: Pitch count exceeds age-based limit
   * Players cannot exceed their age-specific pitch count limit per game
   * - Ages 7-8: Max 50 pitches
   * - Ages 9-10: Max 75 pitches
   * - Ages 11-12: Max 85 pitches
   */  
  describe('Rule 5: exceedsMaxPitchesForAge', () => {
    it('should return false if no age provided', () => {
      expect(exceedsMaxPitchesForAge(null, 100)).toBe(false)
      expect(exceedsMaxPitchesForAge(undefined, 100)).toBe(false)
    })

    it('should return false if age has no defined limit', () => {
      expect(exceedsMaxPitchesForAge(5, 100)).toBe(false)
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

  /**
   * Rule 6: Pitched before eligible date
   * A player cannot pitch until their next_eligible_pitch_date has arrived
   */
  describe('Rule 6: pitchedBeforeEligibleDate', () => {
    it('should return false if player did not pitch in this game', () => {
      expect(pitchedBeforeEligibleDate('2025-05-14', '2025-05-14', [])).toBe(false)
      expect(pitchedBeforeEligibleDate('2025-05-12', '2025-05-14', [])).toBe(false)
    })

    it('should return false if no previous pitching record (first time pitching)', () => {
      expect(pitchedBeforeEligibleDate('2025-05-14', null, [1, 2])).toBe(false)
      expect(pitchedBeforeEligibleDate('2025-05-14', undefined, [1, 2])).toBe(false)
    })

    it('should return false if no game date provided', () => {
      expect(pitchedBeforeEligibleDate(null, '2025-05-14', [1, 2])).toBe(false)
      expect(pitchedBeforeEligibleDate(undefined, '2025-05-14', [1, 2])).toBe(false)
      expect(pitchedBeforeEligibleDate('', '2025-05-14', [1, 2])).toBe(false)
    })

    it('should return false if game date is on or after eligible date', () => {
      // Exactly on eligible date
      expect(pitchedBeforeEligibleDate('2025-05-14', '2025-05-14', [1, 2])).toBe(false)
      // One day after eligible date
      expect(pitchedBeforeEligibleDate('2025-05-15', '2025-05-14', [1, 2])).toBe(false)
      // Several days after eligible date
      expect(pitchedBeforeEligibleDate('2025-05-20', '2025-05-14', [1, 2])).toBe(false)
    })

    it('should return true if game date is before eligible date (violation)', () => {
      // One day before eligible date
      expect(pitchedBeforeEligibleDate('2025-05-13', '2025-05-14', [1, 2])).toBe(true)
      // Two days before eligible date
      expect(pitchedBeforeEligibleDate('2025-05-12', '2025-05-14', [1, 2])).toBe(true)
      // Same scenario but with single inning pitched
      expect(pitchedBeforeEligibleDate('2025-05-13', '2025-05-14', [3])).toBe(true)
    })

    it('should handle year boundary cases', () => {
      // December game, January eligibility (not a violation - past date)
      expect(pitchedBeforeEligibleDate('2025-12-31', '2025-01-01', [1])).toBe(false)
      // January game, January eligibility (violation)
      expect(pitchedBeforeEligibleDate('2025-01-01', '2025-01-03', [1])).toBe(true)
    })

    it('should handle month boundary cases', () => {
      // Last day of May, eligible June 1 (violation)
      expect(pitchedBeforeEligibleDate('2025-05-31', '2025-06-01', [1, 2, 3])).toBe(true)
      // First day of June, eligible June 1 (not a violation)
      expect(pitchedBeforeEligibleDate('2025-06-01', '2025-06-01', [1, 2, 3])).toBe(false)
    })
  })

  /**
   * Extra Innings Support (7+, 8+, 9+, etc.)
   * These tests verify that all validation rules work correctly
   * when games extend beyond the standard 6 innings
   */
  describe('Extra Innings Support (7+, 8+, 9+)', () => {
    describe('Rule 1: hasInningsGap with extra innings', () => {
      it('should return false for consecutive innings through inning 8', () => {
        expect(hasInningsGap([1, 2, 3, 4, 5, 6, 7, 8])).toBe(false)
      })

      it('should return false for consecutive innings through inning 10', () => {
        expect(hasInningsGap([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBe(false)
      })

      it('should return false for consecutive innings through inning 12', () => {
        expect(hasInningsGap([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toBe(false)
      })

      it('should detect gap in 8-inning game', () => {
        expect(hasInningsGap([1, 2, 3, 4, 6, 7, 8])).toBe(true) // Missing inning 5
      })

      it('should detect gap in 10-inning game', () => {
        expect(hasInningsGap([1, 2, 3, 4, 5, 6, 7, 9, 10])).toBe(true) // Missing inning 8
      })

      it('should detect multiple gaps in 9-inning game', () => {
        expect(hasInningsGap([1, 2, 4, 6, 8, 9])).toBe(true) // Missing 3, 5, 7
      })

      it('should handle pitcher starting in inning 7', () => {
        expect(hasInningsGap([7, 8])).toBe(false)
      })

      it('should handle pitcher starting in inning 8 and going to 12', () => {
        expect(hasInningsGap([8, 9, 10, 11, 12])).toBe(false)
      })
    })

    describe('Rule 2: cannotCatchDueToHighPitchCount with extra innings', () => {
      it('should return true if catching in innings 8-9 after pitching 7 innings with 41+ pitches', () => {
        expect(cannotCatchDueToHighPitchCount([1, 2, 3, 4, 5, 6, 7], [8, 9], 45)).toBe(true)
      })

      it('should return true if catching in inning 10 after pitching with 41+ pitches', () => {
        expect(cannotCatchDueToHighPitchCount([1, 2, 3, 4, 5, 6, 7, 8], [10], 50)).toBe(true)
      })

      it('should return false if catching before pitching even in extra innings', () => {
        expect(cannotCatchDueToHighPitchCount([7, 8, 9], [1, 2, 3], 45)).toBe(false)
      })

      it('should return false if pitch count below 41 even in 10 inning game', () => {
        expect(cannotCatchDueToHighPitchCount([1, 2, 3, 4, 5, 6, 7, 8], [9, 10], 40)).toBe(false)
      })
    })

    describe('Rule 3: cannotPitchDueToFourInningsCatching with extra innings', () => {
      it('should return true if pitching in innings 8-9 after catching 4 innings', () => {
        expect(cannotPitchDueToFourInningsCatching([8, 9], [1, 2, 3, 4])).toBe(true)
      })

      it('should return true if pitching in inning 10 after catching 4 innings', () => {
        expect(cannotPitchDueToFourInningsCatching([10], [1, 2, 3, 4])).toBe(true)
      })

      it('should return true if catching 6 innings then pitching inning 8', () => {
        expect(cannotPitchDueToFourInningsCatching([8], [1, 2, 3, 4, 5, 6])).toBe(true)
      })

      it('should return false if pitching before 4th catching inning in 10-inning game', () => {
        expect(cannotPitchDueToFourInningsCatching([1, 2, 3], [4, 5, 6, 7, 8, 9, 10])).toBe(false)
      })

      it('should handle catching exactly 4 innings in 8-inning game', () => {
        expect(cannotPitchDueToFourInningsCatching([5, 6, 7, 8], [1, 2, 3, 4])).toBe(true)
      })
    })

    describe('Rule 4: cannotCatchAgainDueToCombined with extra innings', () => {
      it('should return true if caught 2 innings before pitching, pitched 21+, then caught again in inning 8', () => {
        expect(cannotCatchAgainDueToCombined([3, 4, 5, 6, 7], [1, 2, 8], 25)).toBe(true)
      })

      it('should return true if caught 3 innings before pitching, pitched 21+, then caught inning 10', () => {
        expect(cannotCatchAgainDueToCombined([4, 5, 6, 7, 8, 9], [1, 2, 3, 10], 30)).toBe(true)
      })

      it('should return false if caught 3 innings before pitching but did not return to catch', () => {
        expect(cannotCatchAgainDueToCombined([4, 5, 6, 7, 8, 9, 10], [1, 2, 3], 30)).toBe(false)
      })

      it('should return false if only caught after pitching in extra innings', () => {
        expect(cannotCatchAgainDueToCombined([1, 2, 3, 4, 5], [6, 7, 8, 9], 30)).toBe(false)
      })

      it('should return false if caught 1-3 innings before pitching but pitch count below 21', () => {
        expect(cannotCatchAgainDueToCombined([3, 4, 5, 6, 7], [1, 2, 8, 9], 20)).toBe(false)
      })

      it('should return false if caught 4+ innings before pitching (Rule 3 applies instead)', () => {
        expect(cannotCatchAgainDueToCombined([5, 6, 7, 8, 9], [1, 2, 3, 4, 10], 30)).toBe(false)
      })
    })

    describe('Complex scenarios with 10+ innings', () => {
      it('should validate pitcher who pitches all 12 innings', () => {
        expect(hasInningsGap([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toBe(false)
      })

      it('should detect violation if pitcher has gap in middle of 12-inning game', () => {
        expect(hasInningsGap([1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12])).toBe(true) // Missing 6
      })

      it('should handle catcher who catches innings 7-10 after pitching 1-3', () => {
        expect(cannotCatchDueToHighPitchCount([1, 2, 3], [7, 8, 9, 10], 30)).toBe(false)
      })

      it('should validate Rule 2 in 12-inning marathon game', () => {
        // Pitcher throws 45 pitches in innings 1-6, then catches 7-12 (violation)
        expect(cannotCatchDueToHighPitchCount([1, 2, 3, 4, 5, 6], [7, 8, 9, 10, 11, 12], 45)).toBe(true)
      })

      it('should validate Rule 3 in 10-inning game with 6 innings caught', () => {
        // Catches innings 1-6, pitches 7-10 (violation)
        expect(cannotPitchDueToFourInningsCatching([7, 8, 9, 10], [1, 2, 3, 4, 5, 6])).toBe(true)
      })

      it('should validate Rule 4 with catching before and after in 11-inning game', () => {
        // Catches 1-2 before, pitches 3-9 (25 pitches), catches 10-11 after (violation)
        expect(cannotCatchAgainDueToCombined([3, 4, 5, 6, 7, 8, 9], [1, 2, 10, 11], 25)).toBe(true)
      })
    })

    describe('Edge cases with maximum innings (12)', () => {
      it('should handle starting pitcher in inning 12', () => {
        expect(hasInningsGap([12])).toBe(false)
      })

      it('should handle pitcher finishing in inning 12', () => {
        expect(hasInningsGap([7, 8, 9, 10, 11, 12])).toBe(false)
      })

      it('should detect catching after 50-pitch performance ending in inning 12', () => {
        expect(cannotCatchDueToHighPitchCount([8, 9, 10, 11, 12], [12], 50)).toBe(false) // Same inning, no violation
      })
    })

    describe('Realistic extra inning scenarios', () => {
      it('should validate tied game going to 7th inning - pitcher continues', () => {
        // Pitcher throws innings 1-7 consecutively
        expect(hasInningsGap([1, 2, 3, 4, 5, 6, 7])).toBe(false)
      })

      it('should validate 8-inning game - relief pitcher enters in 7th', () => {
        // Relief pitcher enters for innings 7-8
        expect(hasInningsGap([7, 8])).toBe(false)
      })

      it('should catch violation in 9-inning game with pitcher re-entry attempt', () => {
        // Pitcher throws 1-3, taken out, tries to return in 9 (gap at 4-8)
        expect(hasInningsGap([1, 2, 3, 9])).toBe(true)
      })

      it('should validate catcher who catches full 8-inning game then pitches is violation', () => {
        // Catches all 8 innings, then pitches 9 (violation - caught 4+)
        expect(cannotPitchDueToFourInningsCatching([9], [1, 2, 3, 4, 5, 6, 7, 8])).toBe(true)
      })

      it('should validate pitcher with 45 pitches in 7 innings cannot catch inning 8', () => {
        expect(cannotCatchDueToHighPitchCount([1, 2, 3, 4, 5, 6, 7], [8], 45)).toBe(true)
      })
    })
  })
})
