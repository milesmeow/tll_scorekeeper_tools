import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { calculateNextEligibleDate } from '../../lib/pitchSmartRules'

export default function GameDetailModal({ game, onClose }) {
  const [loading, setLoading] = useState(true)
  const [gameData, setGameData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchGameDetails()
  }, [])

  // Validation helper functions (same as in form)
  const getEffectivePitchCount = (penultimate) => {
    if (!penultimate || penultimate === 0) return 0
    return penultimate + 1
  }

  const hasInningsGap = (innings) => {
    if (innings.length <= 1) return false
    const sorted = [...innings].sort((a, b) => a - b)
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1] - sorted[i] !== 1) {
        return true
      }
    }
    return false
  }

  const cannotCatchDueToHighPitchCount = (pitchedInnings, caughtInnings, effectivePitches) => {
    if (effectivePitches < 41 || caughtInnings.length === 0 || pitchedInnings.length === 0) {
      return false
    }
    const maxPitchingInning = Math.max(...pitchedInnings)
    return caughtInnings.some(inning => inning > maxPitchingInning)
  }

  const cannotPitchDueToFourInningsCatching = (pitchedInnings, caughtInnings) => {
    if (caughtInnings.length < 4 || pitchedInnings.length === 0) {
      return false
    }
    const sortedCatchingInnings = [...caughtInnings].sort((a, b) => a - b)
    const fourthCatchingInning = sortedCatchingInnings[3]
    return pitchedInnings.some(inning => inning > fourthCatchingInning)
  }

  const cannotCatchAgainDueToCombined = (pitchedInnings, caughtInnings, effectivePitches) => {
    if (caughtInnings.length < 1 || caughtInnings.length > 3 || effectivePitches < 21 || pitchedInnings.length === 0) {
      return false
    }
    const minPitchingInning = Math.min(...pitchedInnings)
    const maxPitchingInning = Math.max(...pitchedInnings)
    const hasCaughtBeforePitching = caughtInnings.some(inning => inning < minPitchingInning)
    const hasReturnedToCatch = caughtInnings.some(inning => inning > maxPitchingInning)
    return hasCaughtBeforePitching && hasReturnedToCatch
  }

  const fetchGameDetails = async () => {
    try {
      // Fetch game_players with player info
      const { data: gamePlayers, error: playersError } = await supabase
        .from('game_players')
        .select(`
          *,
          player:players(*)
        `)
        .eq('game_id', game.id)

      if (playersError) throw playersError

      // Fetch pitching_logs with player info
      const { data: pitchingLogs, error: pitchingError } = await supabase
        .from('pitching_logs')
        .select(`
          *,
          player:players(*)
        `)
        .eq('game_id', game.id)

      if (pitchingError) throw pitchingError

      // Fetch positions_played with player info
      const { data: positionsPlayed, error: positionsError } = await supabase
        .from('positions_played')
        .select(`
          *,
          player:players(*)
        `)
        .eq('game_id', game.id)

      if (positionsError) throw positionsError

      // Organize data by team and player
      const homePlayerData = []
      const awayPlayerData = []

      gamePlayers.forEach(gp => {
        const playerData = {
          ...gp,
          pitching: pitchingLogs.find(pl => pl.player_id === gp.player_id),
          positions: positionsPlayed.filter(pp => pp.player_id === gp.player_id)
        }

        if (gp.player.team_id === game.home_team_id) {
          homePlayerData.push(playerData)
        } else {
          awayPlayerData.push(playerData)
        }
      })

      setGameData({
        homePlayers: homePlayerData,
        awayPlayers: awayPlayerData
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-5xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-bold">{game.away_team.name} at {game.home_team.name}</h3>
            <p className="text-gray-600 mt-1">
              {new Date(game.game_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
            <p className="text-lg font-semibold mt-2">
              Final Score: {game.away_score} - {game.home_score}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Scorekeeper: {game.scorekeeper_name} ({game.scorekeeper_team?.name})
            </p>
            {game.notes && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm font-semibold text-yellow-900 mb-1">📝 Game Notes:</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{game.notes}</p>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="alert alert-error mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading game details...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Home Team Section */}
            <TeamDetailSection
              teamName={game.home_team.name}
              players={gameData.homePlayers}
              isHome={true}
              gameDate={game.game_date}
              hasInningsGap={hasInningsGap}
              cannotCatchDueToHighPitchCount={cannotCatchDueToHighPitchCount}
              cannotPitchDueToFourInningsCatching={cannotPitchDueToFourInningsCatching}
              cannotCatchAgainDueToCombined={cannotCatchAgainDueToCombined}
              getEffectivePitchCount={getEffectivePitchCount}
            />

            {/* Away Team Section */}
            <TeamDetailSection
              teamName={game.away_team.name}
              players={gameData.awayPlayers}
              isHome={false}
              gameDate={game.game_date}
              hasInningsGap={hasInningsGap}
              cannotCatchDueToHighPitchCount={cannotCatchDueToHighPitchCount}
              cannotPitchDueToFourInningsCatching={cannotPitchDueToFourInningsCatching}
              cannotCatchAgainDueToCombined={cannotCatchAgainDueToCombined}
              getEffectivePitchCount={getEffectivePitchCount}
            />
          </div>
        )}

        <div className="flex justify-end mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function TeamDetailSection({
  teamName,
  players,
  isHome,
  gameDate,
  hasInningsGap,
  cannotCatchDueToHighPitchCount,
  cannotPitchDueToFourInningsCatching,
  cannotCatchAgainDueToCombined,
  getEffectivePitchCount
}) {
  // Only show players who pitched, caught, or were absent
  const pitchersAndCatchers = players.filter(p => p.was_present && p.positions.length > 0)
  const absentPlayers = players.filter(p => !p.was_present)

  return (
    <div className="border rounded-lg p-4">
      <h4 className="text-lg font-bold mb-4 bg-blue-200 -m-4 p-4 rounded-t-lg border-b">
        {teamName} {isHome ? '(Home)' : '(Away)'}
      </h4>

      {/* Pitchers and Catchers */}
      {pitchersAndCatchers.length > 0 && (
        <div className="mt-4">
          <h5 className="font-semibold mb-3 text-blue-700">Pitchers & Catchers</h5>
          <div className="space-y-3">
            {pitchersAndCatchers.map(playerData => {
              const pitchedInnings = playerData.positions
                .filter(p => p.position === 'pitcher')
                .map(p => p.inning_number)
                .sort((a, b) => a - b)

              const caughtInnings = playerData.positions
                .filter(p => p.position === 'catcher')
                .map(p => p.inning_number)
                .sort((a, b) => a - b)

              // Calculate violations
              const effectivePitches = getEffectivePitchCount(playerData.pitching?.penultimate_batter_count || 0)
              const hasPitchingGap = hasInningsGap(pitchedInnings)
              const violationHighPitchCount = cannotCatchDueToHighPitchCount(pitchedInnings, caughtInnings, effectivePitches)
              const violationFourInningsCatching = cannotPitchDueToFourInningsCatching(pitchedInnings, caughtInnings)
              const violationCombinedRule = cannotCatchAgainDueToCombined(pitchedInnings, caughtInnings, effectivePitches)

              return (
                <div key={playerData.player_id} className="bg-gray-50 border rounded p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h6 className="font-semibold">{playerData.player.name}</h6>
                        <span className="text-sm text-gray-600">Age: {playerData.player.age}</span>
                        {playerData.player.jersey_number && (
                          <span className="text-sm text-gray-600">#{playerData.player.jersey_number}</span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {/* Pitching Info */}
                        {pitchedInnings.length > 0 && (
                          <div>
                            <span className="font-medium text-gray-700">Pitched: </span>
                            <span className="text-gray-600">
                              {pitchedInnings.length === 1
                                ? `Inning ${pitchedInnings[0]}`
                                : `Innings ${pitchedInnings.join(', ')}`
                              }
                            </span>
                            {playerData.pitching && (
                              <div className="mt-1 pl-2 border-l-2 border-blue-300">
                                <div>
                                  <span className="font-medium text-gray-700">Final Pitch Count: </span>
                                  <span className="text-blue-700 font-semibold">
                                    {playerData.pitching.final_pitch_count}
                                  </span>
                                </div>
                                {playerData.pitching.penultimate_batter_count > 0 && (
                                  <div>
                                    <span className="font-medium text-gray-700">Before Last Batter: </span>
                                    <span className="text-gray-600">
                                      {playerData.pitching.penultimate_batter_count}
                                    </span>
                                  </div>
                                )}
                                {(() => {
                                  // Calculate eligibility based on THIS game's data (snapshot)
                                  // Use penultimate_batter_count + 1 as per pitch count rules
                                  const effectivePitchCount = (playerData.pitching.penultimate_batter_count || 0) + 1
                                  const nextEligibleDate = calculateNextEligibleDate(
                                    gameDate,
                                    playerData.player.age,
                                    effectivePitchCount
                                  )

                                  if (!nextEligibleDate) return null

                                  const eligibleDate = new Date(nextEligibleDate)

                                  return (
                                    <div className="mt-2">
                                      <span className="font-medium text-gray-700">Next Eligible: </span>
                                      <span className="text-blue-700 font-semibold">
                                        {eligibleDate.toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric'
                                        })}
                                      </span>
                                    </div>
                                  )
                                })()}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Catching Info */}
                        {caughtInnings.length > 0 && (
                          <div>
                            <span className="font-medium text-gray-700">Caught: </span>
                            <span className="text-gray-600">
                              {caughtInnings.length === 1
                                ? `Inning ${caughtInnings[0]}`
                                : `Innings ${caughtInnings.join(', ')}`
                              }
                            </span>
                          </div>
                        )}
                      </div>

                      {pitchedInnings.length === 0 && caughtInnings.length === 0 && (
                        <p className="text-sm text-gray-500 italic">
                          No pitching or catching recorded
                        </p>
                      )}

                      {/* Violation Warnings */}
                      {hasPitchingGap && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                          <p className="text-sm text-red-700">
                            ⚠️ Violation: A pitcher cannot return after being taken out. Innings must be consecutive (e.g., 1,2,3 or 4,5,6).
                          </p>
                        </div>
                      )}
                      {violationFourInningsCatching && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                          <p className="text-sm text-red-700">
                            ⚠️ Violation: Player caught {caughtInnings.length} innings and cannot pitch in this game.
                          </p>
                        </div>
                      )}
                      {violationHighPitchCount && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                          <p className="text-sm text-red-700">
                            ⚠️ Violation: Player threw {effectivePitches} pitches (41+) and cannot catch for the remainder of this game.
                          </p>
                        </div>
                      )}
                      {violationCombinedRule && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                          <p className="text-sm text-red-700">
                            ⚠️ Violation: Player caught 1-3 innings and threw {effectivePitches} pitches (21+). Cannot catch again in this game.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Absent Players */}
      {absentPlayers.length > 0 && (
        <div className="mt-4">
          <h5 className="font-semibold mb-3 text-red-700">Absent ({absentPlayers.length})</h5>
          <div className="space-y-2">
            {absentPlayers.map(playerData => (
              <div key={playerData.player_id} className="bg-red-50 border border-red-200 rounded p-3">
                <div className="flex items-center gap-3">
                  <h6 className="font-semibold text-gray-800">{playerData.player.name}</h6>
                  <span className="text-sm text-gray-600">Age: {playerData.player.age}</span>
                  {playerData.player.jersey_number && (
                    <span className="text-sm text-gray-600">#{playerData.player.jersey_number}</span>
                  )}
                </div>
                {playerData.absence_note && (
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">Reason: </span>
                    {playerData.absence_note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {pitchersAndCatchers.length === 0 && absentPlayers.length === 0 && (
        <p className="text-gray-500 text-sm italic text-center py-4">
          No pitchers, catchers, or absences recorded
        </p>
      )}
    </div>
  )
}
