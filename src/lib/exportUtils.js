import { supabase } from './supabase'
import JSZip from 'jszip'

/**
 * Fetch all season data including all related tables
 */
async function fetchSeasonData(seasonId) {
  try {
    // Fetch season info
    const { data: season, error: seasonError } = await supabase
      .from('seasons')
      .select('*')
      .eq('id', seasonId)
      .single()

    if (seasonError) throw seasonError

    // Fetch teams
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .eq('season_id', seasonId)
      .order('division', { ascending: true })
      .order('name', { ascending: true })

    if (teamsError) throw teamsError

    const teamIds = teams.map(t => t.id)

    // Fetch players
    const { data: players, error: playersError } = teamIds.length > 0
      ? await supabase
          .from('players')
          .select('*')
          .in('team_id', teamIds)
          .order('name', { ascending: true })
      : { data: [], error: null }

    if (playersError) throw playersError

    // Fetch team coaches
    const { data: teamCoaches, error: teamCoachesError } = teamIds.length > 0
      ? await supabase
          .from('team_coaches')
          .select('*, user_profiles(name, email)')
          .in('team_id', teamIds)
      : { data: [], error: null }

    if (teamCoachesError) throw teamCoachesError

    // Fetch games
    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select('*')
      .eq('season_id', seasonId)
      .order('game_date', { ascending: true })

    if (gamesError) throw gamesError

    const gameIds = games.map(g => g.id)

    // Fetch game players
    const { data: gamePlayers, error: gamePlayersError } = gameIds.length > 0
      ? await supabase
          .from('game_players')
          .select('*')
          .in('game_id', gameIds)
      : { data: [], error: null }

    if (gamePlayersError) throw gamePlayersError

    // Fetch pitching logs
    const { data: pitchingLogs, error: pitchingLogsError } = gameIds.length > 0
      ? await supabase
          .from('pitching_logs')
          .select('*')
          .in('game_id', gameIds)
      : { data: [], error: null }

    if (pitchingLogsError) throw pitchingLogsError

    // Fetch positions played
    const { data: positionsPlayed, error: positionsPlayedError } = gameIds.length > 0
      ? await supabase
          .from('positions_played')
          .select('*')
          .in('game_id', gameIds)
      : { data: [], error: null }

    if (positionsPlayedError) throw positionsPlayedError

    return {
      season,
      teams,
      players,
      teamCoaches,
      games,
      gamePlayers,
      pitchingLogs,
      positionsPlayed
    }
  } catch (error) {
    console.error('Error fetching season data:', error)
    throw error
  }
}

/**
 * Download a file to the user's computer
 */
function downloadFile(content, filename, contentType) {
  const blob = new Blob([content], { type: contentType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export season data as JSON backup
 */
export async function exportSeasonBackup(seasonId) {
  const data = await fetchSeasonData(seasonId)

  const backup = {
    exportDate: new Date().toISOString(),
    exportVersion: '1.0',
    ...data
  }

  const json = JSON.stringify(backup, null, 2)
  const filename = `backup_${data.season.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.json`

  downloadFile(json, filename, 'application/json')
}

/**
 * Convert array of objects to CSV string
 */
function arrayToCSV(data, headers) {
  if (!data || data.length === 0) {
    return headers.join(',') + '\n'
  }

  const csvRows = []

  // Add header row
  csvRows.push(headers.join(','))

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header]
      if (value === null || value === undefined) return ''

      // Handle nested objects (like user_profiles in team_coaches)
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value).replace(/"/g, '""')
      }

      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const stringValue = String(value)
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    })
    csvRows.push(values.join(','))
  }

  return csvRows.join('\n')
}

/**
 * Export season data as multiple CSV files in a ZIP
 */
export async function exportSeasonCSV(seasonId) {
  const data = await fetchSeasonData(seasonId)
  const zip = new JSZip()

  // Create season.csv
  const seasonCSV = arrayToCSV([data.season], ['id', 'name', 'start_date', 'end_date', 'is_active', 'created_by', 'created_at', 'updated_at'])
  zip.file('season.csv', seasonCSV)

  // Create teams.csv
  const teamsCSV = arrayToCSV(data.teams, ['id', 'season_id', 'name', 'division', 'created_at', 'updated_at'])
  zip.file('teams.csv', teamsCSV)

  // Create players.csv
  const playersCSV = arrayToCSV(data.players, ['id', 'team_id', 'name', 'age', 'jersey_number', 'created_at', 'updated_at'])
  zip.file('players.csv', playersCSV)

  // Create team_coaches.csv with simplified coach info
  const coachesData = data.teamCoaches.map(tc => ({
    id: tc.id,
    team_id: tc.team_id,
    user_id: tc.user_id,
    coach_name: tc.user_profiles?.name || '',
    coach_email: tc.user_profiles?.email || '',
    role: tc.role,
    can_edit: tc.can_edit,
    created_at: tc.created_at
  }))
  const coachesCSV = arrayToCSV(coachesData, ['id', 'team_id', 'user_id', 'coach_name', 'coach_email', 'role', 'can_edit', 'created_at'])
  zip.file('team_coaches.csv', coachesCSV)

  // Create games.csv
  const gamesCSV = arrayToCSV(data.games, ['id', 'season_id', 'game_date', 'home_team_id', 'away_team_id', 'home_score', 'away_score', 'scorekeeper_name', 'scorekeeper_team_id', 'notes', 'created_at', 'updated_at'])
  zip.file('games.csv', gamesCSV)

  // Create game_players.csv
  const gamePlayersCSV = arrayToCSV(data.gamePlayers, ['id', 'game_id', 'player_id', 'was_present', 'absence_note', 'created_at'])
  zip.file('game_players.csv', gamePlayersCSV)

  // Create pitching_logs.csv
  const pitchingLogsCSV = arrayToCSV(data.pitchingLogs, ['id', 'game_id', 'player_id', 'final_pitch_count', 'penultimate_batter_count', 'next_eligible_pitch_date', 'created_at'])
  zip.file('pitching_logs.csv', pitchingLogsCSV)

  // Create positions_played.csv
  const positionsPlayedCSV = arrayToCSV(data.positionsPlayed, ['id', 'game_id', 'player_id', 'inning_number', 'position', 'created_at'])
  zip.file('positions_played.csv', positionsPlayedCSV)

  // Generate ZIP file
  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const filename = `csv_export_${data.season.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.zip`

  const url = URL.createObjectURL(zipBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export season data as formatted HTML report
 */
export async function exportSeasonHTML(seasonId) {
  const data = await fetchSeasonData(seasonId)

  // Build team lookup for easy reference
  const teamLookup = {}
  data.teams.forEach(team => {
    teamLookup[team.id] = team
  })

  // Build player lookup
  const playerLookup = {}
  data.players.forEach(player => {
    playerLookup[player.id] = player
  })

  // Group players by team
  const playersByTeam = {}
  data.players.forEach(player => {
    if (!playersByTeam[player.team_id]) {
      playersByTeam[player.team_id] = []
    }
    playersByTeam[player.team_id].push(player)
  })

  // Sort players within each team
  Object.keys(playersByTeam).forEach(teamId => {
    playersByTeam[teamId].sort((a, b) => a.name.localeCompare(b.name))
  })

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.season.name} - Season Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f9fafb;
    }
    h1 {
      color: #1f2937;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 10px;
    }
    h2 {
      color: #374151;
      margin-top: 30px;
      border-bottom: 2px solid #9ca3af;
      padding-bottom: 8px;
    }
    h3 {
      color: #4b5563;
      margin-top: 20px;
    }
    .section {
      background: white;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th {
      background: #f3f4f6;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #d1d5db;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    tr:hover {
      background: #f9fafb;
    }
    .meta {
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 20px;
    }
    .division-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .division-training {
      background: #dbeafe;
      color: #1e40af;
    }
    .division-minor {
      background: #fef3c7;
      color: #92400e;
    }
    .division-major {
      background: #dcfce7;
      color: #166534;
    }
    .status-active {
      color: #059669;
      font-weight: 600;
    }
    .status-inactive {
      color: #dc2626;
    }
    @media print {
      body {
        background: white;
      }
      .section {
        box-shadow: none;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <h1>⚾ ${data.season.name} - Season Report</h1>

  <div class="meta">
    <strong>Season Period:</strong> ${new Date(data.season.start_date).toLocaleDateString()}
    ${data.season.end_date ? `to ${new Date(data.season.end_date).toLocaleDateString()}` : '(ongoing)'}
    <br>
    <strong>Status:</strong> <span class="${data.season.is_active ? 'status-active' : 'status-inactive'}">${data.season.is_active ? 'Active' : 'Inactive'}</span>
    <br>
    <strong>Report Generated:</strong> ${new Date().toLocaleString()}
  </div>

  ${data.teams.length > 0 ? `
  <div class="section">
    <h2>Teams Overview</h2>
    <table>
      <thead>
        <tr>
          <th>Team Name</th>
          <th>Division</th>
          <th>Players</th>
          <th>Coaches</th>
        </tr>
      </thead>
      <tbody>
        ${data.teams.map(team => {
          const teamPlayers = playersByTeam[team.id] || []
          const teamCoaches = data.teamCoaches.filter(tc => tc.team_id === team.id)
          return `
            <tr>
              <td><strong>${team.name}</strong></td>
              <td><span class="division-badge division-${team.division.toLowerCase()}">${team.division}</span></td>
              <td>${teamPlayers.length}</td>
              <td>${teamCoaches.length}</td>
            </tr>
          `
        }).join('')}
      </tbody>
    </table>
  </div>

  ${data.teams.map(team => {
    const teamPlayers = playersByTeam[team.id] || []
    const teamCoaches = data.teamCoaches.filter(tc => tc.team_id === team.id)
    const teamGames = data.games.filter(g => g.home_team_id === team.id || g.away_team_id === team.id)

    return `
      <div class="section">
        <h2>${team.name} <span class="division-badge division-${team.division.toLowerCase()}">${team.division}</span></h2>

        ${teamCoaches.length > 0 ? `
          <h3>Coaches</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Can Edit</th>
              </tr>
            </thead>
            <tbody>
              ${teamCoaches.map(tc => `
                <tr>
                  <td>${tc.user_profiles?.name || 'N/A'}</td>
                  <td>${tc.user_profiles?.email || 'N/A'}</td>
                  <td>${tc.role.replace('_', ' ')}</td>
                  <td>${tc.can_edit ? '✓' : '✗'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p>No coaches assigned</p>'}

        ${teamPlayers.length > 0 ? `
          <h3>Roster (${teamPlayers.length} Players)</h3>
          <table>
            <thead>
              <tr>
                <th>Jersey #</th>
                <th>Player Name</th>
                <th>Age</th>
              </tr>
            </thead>
            <tbody>
              ${teamPlayers.map(player => `
                <tr>
                  <td><strong>${player.jersey_number || 'N/A'}</strong></td>
                  <td>${player.name}</td>
                  <td>${player.age}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p>No players on roster</p>'}

        ${teamGames.length > 0 ? `
          <h3>Games (${teamGames.length})</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Home Team</th>
                <th>Away Team</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              ${teamGames.map(game => `
                <tr>
                  <td>${new Date(game.game_date).toLocaleDateString()}</td>
                  <td>${teamLookup[game.home_team_id]?.name || 'Unknown'}</td>
                  <td>${teamLookup[game.away_team_id]?.name || 'Unknown'}</td>
                  <td><strong>${game.home_score || 0} - ${game.away_score || 0}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p>No games recorded</p>'}
      </div>
    `
  }).join('')}
  ` : '<div class="section"><p>No teams in this season</p></div>'}

  ${data.games.length > 0 ? `
  <div class="section">
    <h2>All Games (${data.games.length})</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Home Team</th>
          <th>Away Team</th>
          <th>Score</th>
          <th>Scorekeeper</th>
        </tr>
      </thead>
      <tbody>
        ${data.games.map(game => `
          <tr>
            <td>${new Date(game.game_date).toLocaleDateString()}</td>
            <td>${teamLookup[game.home_team_id]?.name || 'Unknown'}</td>
            <td>${teamLookup[game.away_team_id]?.name || 'Unknown'}</td>
            <td><strong>${game.home_score || 0} - ${game.away_score || 0}</strong></td>
            <td>${game.scorekeeper_name || 'N/A'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${data.pitchingLogs.length > 0 ? `
  <div class="section">
    <h2>Pitching Logs (${data.pitchingLogs.length})</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Player</th>
          <th>Game</th>
          <th>Pitch Count</th>
          <th>Next Eligible</th>
        </tr>
      </thead>
      <tbody>
        ${data.pitchingLogs.map(log => {
          const game = data.games.find(g => g.id === log.game_id)
          const player = playerLookup[log.player_id]
          return `
            <tr>
              <td>${game ? new Date(game.game_date).toLocaleDateString() : 'N/A'}</td>
              <td>${player?.name || 'Unknown'}</td>
              <td>${game ? `${teamLookup[game.home_team_id]?.name} vs ${teamLookup[game.away_team_id]?.name}` : 'N/A'}</td>
              <td><strong>${log.final_pitch_count}</strong></td>
              <td>${log.next_eligible_pitch_date ? new Date(log.next_eligible_pitch_date).toLocaleDateString() : 'N/A'}</td>
            </tr>
          `
        }).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

</body>
</html>`

  const filename = `report_${data.season.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.html`
  downloadFile(html, filename, 'text/html')
}
