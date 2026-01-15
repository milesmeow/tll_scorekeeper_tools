/**
 * PlayerViolationWarnings Component
 *
 * Displays all 5 Pitch Smart violation warnings in a consistent, reusable format.
 * Used in both GameDetailModal (detail variant) and GameEntry Step 3 (confirmation variant).
 */

export default function PlayerViolationWarnings({
  hasPitchingGap,
  violationHighPitchCount,
  violationFourInningsCatching,
  violationCombinedRule,
  violationExceedsPitchLimit,
  pitchedInnings = [],
  caughtInnings = [],
  effectivePitches = 0,
  playerAge,
  getMaxPitchesForAge,
  variant = 'detail'
}) {
  // Determine styling based on variant
  const isDetail = variant === 'detail'
  const containerClasses = isDetail
    ? 'mt-3 p-2 bg-red-50 border border-red-200 rounded'
    : 'mt-2 p-2 bg-red-100 border border-red-300 rounded'
  const textClasses = isDetail
    ? 'text-sm text-red-700'
    : 'text-xs text-red-800'

  return (
    <>
      {/* Rule 1: Pitching Gap - Consecutive Innings Violation */}
      {hasPitchingGap && (
        <div className={containerClasses}>
          <p className={textClasses}>
            {isDetail
              ? '⚠️ Violation: A pitcher cannot return after being taken out. Innings must be consecutive (e.g., 1,2,3 or 4,5,6).'
              : '⚠️ Violation: Pitcher cannot return after being taken out. Innings must be consecutive.'}
          </p>
        </div>
      )}

      {/* Rule 3: Four Innings Catching - Cannot Pitch */}
      {violationFourInningsCatching && (
        <div className={containerClasses}>
          <p className={textClasses}>
            ⚠️ Violation: Player caught {caughtInnings.length} innings and cannot pitch in this game.
          </p>
        </div>
      )}

      {/* Rule 2: High Pitch Count - Cannot Catch */}
      {violationHighPitchCount && (
        <div className={containerClasses}>
          <p className={textClasses}>
            ⚠️ Violation: Player threw {effectivePitches} pitches (41+) and cannot catch for the remainder of this game.
          </p>
        </div>
      )}

      {/* Rule 4: Combined Rule - Caught 1-3 innings + 21+ pitches */}
      {violationCombinedRule && (
        <div className={containerClasses}>
          <p className={textClasses}>
            ⚠️ Violation: Player caught 1-3 innings and threw {effectivePitches} pitches (21+). Cannot catch again in this game.
          </p>
        </div>
      )}

      {/* Rule 5: Exceeds Pitch Limit for Age */}
      {violationExceedsPitchLimit && (
        <div className={containerClasses}>
          <p className={textClasses}>
            ⚠️ Violation: Threw {effectivePitches} pitches, exceeding the maximum of {getMaxPitchesForAge(playerAge)} for age {playerAge}.
          </p>
        </div>
      )}
    </>
  )
}
