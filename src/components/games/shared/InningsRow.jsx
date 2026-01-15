/**
 * InningsRow Component
 *
 * Reusable row component for displaying innings circles (pitched or caught).
 * Used by InningsVisualDisplay to show visual representation of innings played.
 */

export default function InningsRow({ label, activeInnings, innings, keyPrefix, colorClasses }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-medium text-gray-700">{label}</span>
      <div className="flex gap-1">
        {innings.map(inning => (
          <div key={`${keyPrefix}-${inning}`} className="flex flex-col items-center">
            <span className="text-xs text-gray-400 mb-0.5">{inning}</span>
            <div
              className={`w-5 h-5 rounded-full border-2 ${
                activeInnings.includes(inning)
                  ? colorClasses.active
                  : 'bg-white border-gray-300'
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
