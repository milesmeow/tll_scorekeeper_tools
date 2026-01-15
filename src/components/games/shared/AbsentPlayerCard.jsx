/**
 * AbsentPlayerCard Component
 *
 * Displays a card for absent players with optional absence reason.
 * Used in both GameDetailModal (detail variant) and GameEntry Step 3 (confirmation variant).
 */

export default function AbsentPlayerCard({
  player,
  variant = 'detail'
}) {
  const isDetail = variant === 'detail'

  // Determine styling based on variant
  const containerClasses = isDetail
    ? 'bg-red-50 border border-red-200 rounded p-3'
    : 'bg-red-50 border border-red-200 rounded p-2 text-sm'

  const nameTag = isDetail ? 'h6' : 'span'
  const NameTag = nameTag
  const nameClasses = isDetail
    ? 'font-semibold text-gray-800'
    : 'font-semibold'

  const metaClasses = isDetail
    ? 'text-sm text-gray-600'
    : 'text-xs text-gray-600'

  const reasonTag = isDetail ? 'p' : 'div'
  const ReasonTag = reasonTag
  const reasonClasses = isDetail
    ? 'text-sm text-gray-600 mt-1'
    : 'text-xs text-gray-600 mt-1'

  return (
    <div className={containerClasses}>
      <div className="flex items-center gap-3">
        <NameTag className={nameClasses}>{player.name}</NameTag>
        <span className={metaClasses}>Age: {player.age}</span>
        {player.jersey_number && (
          <span className={metaClasses}>#{player.jersey_number}</span>
        )}
      </div>
      {player.absence_note && (
        <ReasonTag className={reasonClasses}>
          {isDetail && <span className="font-medium">Reason: </span>}
          {!isDetail && 'Reason: '}
          {player.absence_note}
        </ReasonTag>
      )}
    </div>
  )
}
