import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useCoachAssignments } from '../../lib/useCoachAssignments'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const POSITIONS = ['P', 'C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF']
const INNINGS = [1, 2, 3, 4, 5, 6]

function SortablePlayerRow({ id, index, player, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg mb-2 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none"
          aria-label={`Reorder ${player?.name}`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
          </svg>
        </button>
        <span className="font-mono text-sm text-gray-500 w-6 text-right">
          {index + 1}.
        </span>
        <span className="text-sm text-gray-500 font-medium">
          #{player?.jersey_number}
        </span>
        <span className="font-medium">{player?.name}</span>
      </div>
      <button
        onClick={() => onRemove(id)}
        className="text-red-400 hover:text-red-600 px-2 py-1"
        aria-label={`Remove ${player?.name} from lineup`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export default function LineupBuilder({ profile }) {
  const [seasons, setSeasons] = useState([])
  const [selectedSeason, setSelectedSeason] = useState(null)
  const [selectedDivision, setSelectedDivision] = useState('All')
  const [teams, setTeams] = useState([])
  const [selectedTeamId, setSelectedTeamId] = useState(
    () => localStorage.getItem('tll_lineup_selectedTeam') || ''
  )
  const [players, setPlayers] = useState([])
  const [battingOrder, setBattingOrder] = useState([])
  const [positions, setPositions] = useState({})
  const [selectedPlayerToAdd, setSelectedPlayerToAdd] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const lineupLoadedRef = useRef(false)

  const isCoach = profile?.role === 'coach'
  const coachData = useCoachAssignments(profile)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Fetch seasons on mount
  useEffect(() => {
    fetchSeasons()
  }, [])

  // Fetch teams when season changes
  useEffect(() => {
    if (selectedSeason && !coachData.loading) {
      fetchTeams()
    }
  }, [selectedSeason, coachData.loading, selectedDivision])

  // Fetch players when team changes; persist team selection
  useEffect(() => {
    lineupLoadedRef.current = false
    if (selectedTeamId) {
      localStorage.setItem('tll_lineup_selectedTeam', selectedTeamId)
      fetchPlayers()
    } else {
      localStorage.removeItem('tll_lineup_selectedTeam')
      setPlayers([])
      setBattingOrder([])
      setPositions({})
    }
  }, [selectedTeamId])

  const fetchSeasons = async () => {
    try {
      let query = supabase.from('seasons').select('*')

      if (isCoach) {
        query = query.eq('is_active', true)
      }

      query = query
        .order('is_active', { ascending: false })
        .order('start_date', { ascending: false })

      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError

      setSeasons(data)

      const activeSeason = data.find((s) => s.is_active)
      if (activeSeason) {
        setSelectedSeason(activeSeason.id)
      } else if (data.length > 0) {
        setSelectedSeason(data[0].id)
      }

      if (isCoach && !coachData.loading && coachData.divisions.length > 0) {
        setSelectedDivision(coachData.divisions[0])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeams = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('teams')
        .select('id, name, division')
        .eq('season_id', selectedSeason)
        .order('division')
        .order('name')

      if (fetchError) throw fetchError

      let filteredTeams = data

      if (isCoach) {
        // Coaches only see their specifically assigned teams (not entire division)
        const assignedTeamIds = new Set(coachData.teams)
        filteredTeams = filteredTeams.filter((t) => assignedTeamIds.has(t.id))
      }

      if (selectedDivision !== 'All') {
        filteredTeams = filteredTeams.filter(
          (t) => t.division === selectedDivision
        )
      }

      setTeams(filteredTeams)

      // Clear team selection if current team is no longer in the filtered list
      if (selectedTeamId && !filteredTeams.find((t) => t.id === selectedTeamId)) {
        setSelectedTeamId('')
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchPlayers = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('players')
        .select('id, name, jersey_number, age')
        .eq('team_id', selectedTeamId)
        .order('jersey_number')

      if (fetchError) throw fetchError

      setPlayers(data || [])
      loadFromLocalStorage(selectedTeamId, data || [])
    } catch (err) {
      setError(err.message)
    }
  }

  // Load saved lineup from localStorage, validating player IDs still exist
  const loadFromLocalStorage = useCallback((teamId, currentPlayers) => {
    try {
      const saved = localStorage.getItem(`tll_lineup_${teamId}`)
      if (!saved) {
        setBattingOrder([])
        setPositions({})
        lineupLoadedRef.current = true
        return
      }

      const parsed = JSON.parse(saved)
      const playerIds = new Set(currentPlayers.map((p) => p.id))

      // Validate batting order - remove players no longer on roster
      const validBattingOrder = (parsed.battingOrder || []).filter((id) =>
        playerIds.has(id)
      )
      setBattingOrder(validBattingOrder)

      // Validate positions - remove players no longer on roster
      const validPositions = {}
      if (parsed.positions) {
        for (const inning of INNINGS) {
          const inningPositions = parsed.positions[inning]
          if (inningPositions) {
            validPositions[inning] = {}
            for (const pos of POSITIONS) {
              if (inningPositions[pos] && playerIds.has(inningPositions[pos])) {
                validPositions[inning][pos] = inningPositions[pos]
              }
            }
          }
        }
      }
      setPositions(validPositions)
      lineupLoadedRef.current = true
    } catch {
      setBattingOrder([])
      setPositions({})
      lineupLoadedRef.current = true
    }
  }, [])

  // Auto-save to localStorage (only after initial load completes)
  useEffect(() => {
    if (!selectedTeamId || !lineupLoadedRef.current) return

    const data = { battingOrder, positions }
    const hasData =
      battingOrder.length > 0 ||
      Object.values(positions).some((inning) =>
        Object.values(inning).some(Boolean)
      )

    if (hasData) {
      try {
        localStorage.setItem(
          `tll_lineup_${selectedTeamId}`,
          JSON.stringify(data)
        )
      } catch {
        // localStorage quota exceeded - extremely unlikely for small JSON
      }
    } else {
      localStorage.removeItem(`tll_lineup_${selectedTeamId}`)
    }
  }, [battingOrder, positions, selectedTeamId])

  const handleAddPlayer = () => {
    if (!selectedPlayerToAdd) return
    setBattingOrder((prev) => [...prev, selectedPlayerToAdd])
    setSelectedPlayerToAdd('')
  }

  const handleRemovePlayer = (playerId) => {
    setBattingOrder((prev) => prev.filter((id) => id !== playerId))
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (active.id !== over?.id) {
      setBattingOrder((items) => {
        const oldIndex = items.indexOf(active.id)
        const newIndex = items.indexOf(over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const handlePositionChange = (inning, position, playerId) => {
    setPositions((prev) => ({
      ...prev,
      [inning]: {
        ...(prev[inning] || {}),
        [position]: playerId || undefined,
      },
    }))
  }

  const handleClear = () => {
    if (!window.confirm('Clear the entire lineup and positions? This cannot be undone.')) {
      return
    }
    setBattingOrder([])
    setPositions({})
    localStorage.removeItem(`tll_lineup_${selectedTeamId}`)
  }

  // Players available to add to batting order (not already in it)
  const availablePlayers = players.filter(
    (p) => !battingOrder.includes(p.id)
  )

  const getPlayerById = (id) => players.find((p) => p.id === id)

  const selectedTeam = teams.find((t) => t.id === selectedTeamId)
  const selectedTeamName = selectedTeam?.name

  // Build player → inning → position lookup (inverted from positions state)
  const getPlayerPositionsByInning = () => {
    const lookup = {}
    for (const inning of INNINGS) {
      if (positions[inning]) {
        for (const [pos, playerId] of Object.entries(positions[inning])) {
          if (playerId) {
            if (!lookup[playerId]) lookup[playerId] = {}
            lookup[playerId][inning] = pos
          }
        }
      }
    }
    return lookup
  }

  // Check if any player is in positions grid but not in batting order
  const getPositionWarnings = () => {
    const positionPlayerIds = new Set()
    for (const inning of INNINGS) {
      if (positions[inning]) {
        for (const pos of POSITIONS) {
          if (positions[inning][pos]) {
            positionPlayerIds.add(positions[inning][pos])
          }
        }
      }
    }
    return [...positionPlayerIds].filter((id) => !battingOrder.includes(id))
  }

  const positionWarnings = getPositionWarnings()

  if (loading || coachData.loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (isCoach && coachData.isEmpty) {
    return (
      <div className="card p-6 text-center">
        <p className="text-gray-500">
          You have no team assignments. Please contact an administrator.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        Lineup & Positions Builder
      </h1>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Season / Division / Team Selectors */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Season</label>
            <select
              className="input"
              value={selectedSeason || ''}
              onChange={(e) => {
                setSelectedSeason(e.target.value)
                setSelectedTeamId('')
              }}
            >
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name} {season.is_active ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Division</label>
            <select
              className="input"
              value={selectedDivision}
              onChange={(e) => {
                setSelectedDivision(e.target.value)
                setSelectedTeamId('')
              }}
            >
              {isCoach ? (
                <>
                  {coachData.divisions.length > 1 && (
                    <option value="All">All My Divisions</option>
                  )}
                  {coachData.divisions.map((division) => (
                    <option key={division} value={division}>
                      {division}
                    </option>
                  ))}
                </>
              ) : (
                <>
                  <option value="All">All Divisions</option>
                  <option value="Training">Training</option>
                  <option value="Minor">Minor</option>
                  <option value="Major">Major</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="label">Team</label>
            <select
              className="input"
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
            >
              <option value="">Select a team...</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.division})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!selectedTeamId && (
        <div className="card p-8 text-center text-gray-500">
          Select a team to start building your lineup.
        </div>
      )}

      {selectedTeamId && players.length === 0 && (
        <div className="card p-8 text-center text-gray-500">
          No players on this team's roster. Add players first.
        </div>
      )}

      {selectedTeamId && players.length > 0 && !showSummary && (
        <>
          {/* Batting Order Section */}
          <div className="card p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Batting Order
            </h2>

            {/* Add Player */}
            <div className="flex gap-2 mb-4">
              <select
                className="input flex-1"
                value={selectedPlayerToAdd}
                onChange={(e) => setSelectedPlayerToAdd(e.target.value)}
              >
                <option value="">
                  {availablePlayers.length === 0
                    ? 'All players added'
                    : 'Select a player to add...'}
                </option>
                {availablePlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    #{player.jersey_number} {player.name}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-primary"
                onClick={handleAddPlayer}
                disabled={!selectedPlayerToAdd}
              >
                + Add
              </button>
            </div>

            {/* Sortable List */}
            {battingOrder.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">
                No players in the batting order yet. Use the dropdown above to
                add players.
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={battingOrder}
                  strategy={verticalListSortingStrategy}
                >
                  {battingOrder.map((playerId, index) => {
                    const player = getPlayerById(playerId)
                    return (
                      <SortablePlayerRow
                        key={playerId}
                        id={playerId}
                        index={index}
                        player={player}
                        onRemove={handleRemovePlayer}
                      />
                    )
                  })}
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* Position Assignments Grid */}
          <div className="card p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Field Positions by Inning
            </h2>

            {positionWarnings.length > 0 && (
              <div className="alert alert-error mb-4 text-sm">
                Warning: {positionWarnings.map((id) => getPlayerById(id)?.name).join(', ')}{' '}
                assigned to field positions but not in the batting order.
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-semibold text-gray-700 w-16">
                      Pos
                    </th>
                    {INNINGS.map((inning) => (
                      <th
                        key={inning}
                        className="text-center py-2 px-1 font-semibold text-gray-700"
                      >
                        Inn {inning}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {POSITIONS.map((pos) => (
                    <tr key={pos} className="border-b border-gray-100">
                      <td className="py-2 px-2 font-medium text-gray-700">
                        {pos}
                      </td>
                      {INNINGS.map((inning) => (
                        <td key={inning} className="py-1 px-1">
                          <select
                            className="w-full text-xs border border-gray-200 rounded px-1 py-1.5 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                            value={positions[inning]?.[pos] || ''}
                            onChange={(e) =>
                              handlePositionChange(inning, pos, e.target.value)
                            }
                          >
                            <option value="">—</option>
                            {players
                              .filter((player) => {
                                // Hide players already assigned to another position this inning
                                const currentAssignment = positions[inning]?.[pos]
                                if (player.id === currentAssignment) return true
                                const inningAssignments = positions[inning] || {}
                                return !Object.values(inningAssignments).includes(player.id)
                              })
                              .map((player) => (
                              <option key={player.id} value={player.id}>
                                {player.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              className="btn btn-primary"
              onClick={() => setShowSummary(true)}
              disabled={battingOrder.length === 0}
            >
              View Summary
            </button>
            <button
              className="btn bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
              onClick={handleClear}
              disabled={
                battingOrder.length === 0 &&
                !Object.values(positions).some((inning) =>
                  Object.values(inning).some(Boolean)
                )
              }
            >
              Clear & Start Over
            </button>
          </div>
        </>
      )}

      {/* Printable Lineup Summary */}
      {selectedTeamId && showSummary && (
        <div className="lineup-print-summary">
          {/* Action buttons - hidden when printing */}
          <div className="flex justify-between mb-6 print-hide">
            <button
              className="btn btn-secondary"
              onClick={() => setShowSummary(false)}
            >
              &larr; Back to Builder
            </button>
            <button
              className="btn btn-primary"
              onClick={() => window.print()}
            >
              Print Lineup
            </button>
          </div>

          {/* Header */}
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {selectedTeamName}
              {selectedTeam?.division && (
                <span className="text-gray-500 font-normal"> ({selectedTeam.division})</span>
              )}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {/* Lineup Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-center w-10">#</th>
                  <th className="border border-gray-300 px-3 py-2 text-center w-16">Jersey</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Player</th>
                  {INNINGS.map((inning) => (
                    <th key={inning} className="border border-gray-300 px-3 py-2 text-center">
                      Inn {inning}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const playerPositions = getPlayerPositionsByInning()
                  return battingOrder.map((playerId, index) => {
                    const player = getPlayerById(playerId)
                    if (!player) return null
                    return (
                      <tr key={playerId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 px-3 py-2 text-center font-medium">
                          {index + 1}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center text-gray-600">
                          {player.jersey_number}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 font-medium">
                          {player.name}
                        </td>
                        {INNINGS.map((inning) => (
                          <td key={inning} className="border border-gray-300 px-3 py-2 text-center font-mono">
                            {playerPositions[playerId]?.[inning] || '—'}
                          </td>
                        ))}
                      </tr>
                    )
                  })
                })()}
              </tbody>
            </table>
          </div>

          {/* Playing Time Rules Reminder */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            <p className="font-semibold mb-1">Playing Time Reminders:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>No player will sit out 2 consecutive innings.</li>
              <li>All players must play at least 1 inning of defense in the infield each game.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
