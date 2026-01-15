/**
 * InningsVisualDisplay Component
 *
 * Visual display of pitched and caught innings using colored circles.
 * Shows all innings from 1 to the maximum inning (minimum 6 innings displayed).
 * Used in GameEntry Step 3 confirmation to visualize player positions.
 */

import InningsRow from './InningsRow'

export default function InningsVisualDisplay({
  pitchedInnings = [],
  caughtInnings = [],
  maxInningOverride = null
}) {
  // Don't render if no innings to display
  if (pitchedInnings.length === 0 && caughtInnings.length === 0) {
    return null
  }

  // Determine maximum inning from both pitched and caught, with a minimum of 6
  const maxInning = maxInningOverride || Math.max(
    6, // Minimum 6 innings
    pitchedInnings.length > 0 ? Math.max(...pitchedInnings) : 0,
    caughtInnings.length > 0 ? Math.max(...caughtInnings) : 0
  )

  const innings = Array.from({ length: maxInning }, (_, i) => i + 1)

  return (
    <div className="mt-2 flex flex-wrap gap-6 text-sm items-center">
      <InningsRow
        label="Pitching"
        activeInnings={pitchedInnings}
        innings={innings}
        keyPrefix="pitch"
        colorClasses={{ active: 'bg-blue-500 border-blue-600' }}
      />
      <InningsRow
        label="Catching"
        activeInnings={caughtInnings}
        innings={innings}
        keyPrefix="catch"
        colorClasses={{ active: 'bg-green-500 border-green-600' }}
      />
    </div>
  )
}
