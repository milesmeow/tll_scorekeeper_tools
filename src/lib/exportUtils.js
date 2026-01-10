/**
 * Export utilities for season data
 *
 * This module provides three export formats:
 * 1. JSON Backup - Complete season data for backup/restore
 * 2. CSV Export - Multiple CSV files in a ZIP for spreadsheet analysis
 * 3. HTML Report - Formatted, human-readable report
 *
 * All exports use parseLocalDate() to prevent timezone offset issues
 * All filenames include timestamps in format: YYYY-MM-DD_HH-MM-SS
 *
 * @module exportUtils
 */

import { supabase } from './supabase'
import JSZip from 'jszip'
import { parseLocalDate, getOfficialPitchCount, formatDate } from './pitchCountUtils'

/**
 * Fetch all season data including all related tables (ACCEPTS DEPENDENCY)
 *
 * Retrieves a complete snapshot of a season including:
 * - Season metadata
 * - Teams (with division info)
 * - Players (rosters with ages and jersey numbers)
 * - Team coaches (with user profile data)
 * - Games (with scores and scorekeeper info)
 * - Game players (attendance records)
 * - Pitching logs (pitch counts and rest dates)
 * - Positions played (by inning)
 *
 * @param {Object} supabaseClient - Supabase client instance
 * @param {string} seasonId - UUID of the season to export
 * @returns {Promise<Object>} Complete season data object
 * @throws {Error} If any database query fails
 */
export async function fetchSeasonData(supabaseClient, seasonId) {
  // Fetch season info
  const { data: season, error: seasonError } = await supabaseClient
      .from('seasons')
      .select('*')
      .eq('id', seasonId)
      .single()

    if (seasonError) throw seasonError

    // Fetch teams
    const { data: teams, error: teamsError } = await supabaseClient
      .from('teams')
      .select('*')
      .eq('season_id', seasonId)
      .order('division', { ascending: true })
      .order('name', { ascending: true })

    if (teamsError) throw teamsError

    const teamIds = teams.map(t => t.id)

    // Fetch players
    const { data: players, error: playersError } = teamIds.length > 0
      ? await supabaseClient
          .from('players')
          .select('*')
          .in('team_id', teamIds)
          .order('name', { ascending: true })
      : { data: [], error: null }

    if (playersError) throw playersError

    // Fetch team coaches
    const { data: teamCoaches, error: teamCoachesError } = teamIds.length > 0
      ? await supabaseClient
          .from('team_coaches')
          .select('*, user_profiles(name, email)')
          .in('team_id', teamIds)
      : { data: [], error: null }

    if (teamCoachesError) throw teamCoachesError

    // Fetch games
    const { data: games, error: gamesError } = await supabaseClient
      .from('games')
      .select('*')
      .eq('season_id', seasonId)
      .order('game_date', { ascending: true })

    if (gamesError) throw gamesError

    const gameIds = games.map(g => g.id)

    // Fetch game players
    const { data: gamePlayers, error: gamePlayersError } = gameIds.length > 0
      ? await supabaseClient
          .from('game_players')
          .select('*')
          .in('game_id', gameIds)
      : { data: [], error: null }

    if (gamePlayersError) throw gamePlayersError

    // Fetch pitching logs
    const { data: pitchingLogs, error: pitchingLogsError } = gameIds.length > 0
      ? await supabaseClient
          .from('pitching_logs')
          .select('*')
          .in('game_id', gameIds)
      : { data: [], error: null }

    if (pitchingLogsError) throw pitchingLogsError

    // Fetch positions played
    const { data: positionsPlayed, error: positionsPlayedError } = gameIds.length > 0
      ? await supabaseClient
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
}

/**
 * Get formatted timestamp for filenames (PURE)
 *
 * Creates a timestamp string suitable for filenames with date and time
 * Format: YYYY-MM-DD_HH-MM-SS (24-hour time)
 * Example: 2026-01-06_14-30-45
 *
 * @param {Date} date - Date object to format
 * @returns {string} Formatted timestamp
 */
export function getTimestamp(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`
}

/**
 * Download a file to the user's computer (BROWSER SIDE EFFECT)
 *
 * Creates a blob, generates a temporary URL, triggers download, then cleans up
 *
 * @param {string} content - File content to download
 * @param {string} filename - Name for the downloaded file
 * @param {string} contentType - MIME type (e.g., 'application/json', 'text/html')
 */
export function browserDownloadFile(content, filename, contentType) {
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
 *
 * Creates a complete JSON backup of all season data including teams, players,
 * coaches, games, attendance, pitch counts, and positions played.
 *
 * The backup is structured for future import functionality and includes
 * an export version number for compatibility tracking.
 *
 * Filename format: backup_SeasonName_YYYY-MM-DD_HH-MM-SS.json
 *
 * @param {string} seasonId - UUID of the season to export
 * @returns {Promise<void>} Downloads file to user's computer
 * @throws {Error} If data fetch or download fails
 */
export async function exportSeasonBackup(seasonId) {
  const data = await fetchSeasonData(supabase, seasonId)

  const backup = {
    exportDate: new Date().toISOString(),
    exportVersion: '1.0',
    ...data
  }

  const json = JSON.stringify(backup, null, 2)
  const filename = `backup_${data.season.name.replace(/[^a-z0-9]/gi, '_')}_${getTimestamp(new Date())}.json`

  browserDownloadFile(json, filename, 'application/json')
}

/**
 * Convert array of objects to CSV string
 *
 * Handles proper CSV escaping for commas, quotes, and newlines
 * Nested objects (like user_profiles) are JSON stringified
 *
 * @param {Array<Object>} data - Array of objects to convert
 * @param {Array<string>} headers - Column headers (object keys to include)
 * @returns {string} CSV formatted string with header row
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
 *
 * Creates 4 human-readable CSV files packaged in a ZIP archive:
 * - teams_roster.csv - All players organized by division and team
 * - games.csv - All games organized by division and date
 * - pitching_catching_log.csv - All pitching and catching activities by division and date
 *   (includes innings played as comma-separated list, e.g., "1,2,3")
 * - absent_players.csv - All player absences organized by division and player name
 *
 * Filename format: csv_export_SeasonName_YYYY-MM-DD_HH-MM-SS.zip
 *
 * @param {string} seasonId - UUID of the season to export
 * @returns {Promise<void>} Downloads ZIP file to user's computer
 * @throws {Error} If data fetch, CSV conversion, or ZIP generation fails
 */
export async function exportSeasonCSV(seasonId) {
  const data = await fetchSeasonData(supabase, seasonId)
  const zip = new JSZip()

  // Build lookups for efficient data access
  const teamLookup = {}
  data.teams.forEach(team => {
    teamLookup[team.id] = team
  })

  const playerLookup = {}
  data.players.forEach(player => {
    playerLookup[player.id] = player
  })

  // Division sorting order
  const divOrder = { 'Training': 1, 'Minor': 2, 'Major': 3 }

  // 1. CREATE TEAMS_ROSTER.CSV
  // Flatten teams and players data
  const rosterData = []
  data.players.forEach(player => {
    const team = teamLookup[player.team_id]
    if (team) {
      rosterData.push({
        division: team.division,
        teamName: team.name,
        playerName: player.name,
        age: player.age,
        jerseyNumber: player.jersey_number || ''
      })
    }
  })

  // Sort by division, team name, player name
  rosterData.sort((a, b) => {
    if (divOrder[a.division] !== divOrder[b.division]) {
      return divOrder[a.division] - divOrder[b.division]
    }
    if (a.teamName !== b.teamName) {
      return a.teamName.localeCompare(b.teamName)
    }
    return a.playerName.localeCompare(b.playerName)
  })

  const rosterCSV = arrayToCSV(rosterData, ['division', 'teamName', 'playerName', 'age', 'jerseyNumber'])
  zip.file('teams_roster.csv', rosterCSV)

  // 2. CREATE GAMES.CSV
  // Flatten games data with team names
  const gamesData = data.games.map(game => {
    const homeTeam = teamLookup[game.home_team_id]
    const awayTeam = teamLookup[game.away_team_id]
    return {
      division: homeTeam?.division || 'Unknown',
      date: game.game_date,
      homeTeam: homeTeam?.name || 'Unknown',
      awayTeam: awayTeam?.name || 'Unknown',
      homeScore: game.home_score || 0,
      awayScore: game.away_score || 0
    }
  })

  // Sort by division, then date
  gamesData.sort((a, b) => {
    if (divOrder[a.division] !== divOrder[b.division]) {
      return divOrder[a.division] - divOrder[b.division]
    }
    return new Date(a.date) - new Date(b.date)
  })

  const gamesCSV = arrayToCSV(gamesData, ['division', 'date', 'homeTeam', 'awayTeam', 'homeScore', 'awayScore'])
  zip.file('games.csv', gamesCSV)

  // 3. CREATE PITCHING_CATCHING_LOG.CSV
  const logData = []

  // Build innings lookup for pitchers from positions_played
  const pitchingInningsByPlayerGame = {}
  data.positionsPlayed.forEach(pos => {
    if (pos.position === 'pitcher') {
      const key = `${pos.player_id}_${pos.game_id}`
      if (!pitchingInningsByPlayerGame[key]) {
        pitchingInningsByPlayerGame[key] = []
      }
      pitchingInningsByPlayerGame[key].push(pos.inning_number)
    }
  })

  // Add pitching logs
  data.pitchingLogs.forEach(log => {
    const player = playerLookup[log.player_id]
    const game = data.games.find(g => g.id === log.game_id)
    if (player && game) {
      const team = teamLookup[player.team_id]
      const homeTeam = teamLookup[game.home_team_id]
      const awayTeam = teamLookup[game.away_team_id]

      // Get innings from positions_played
      const key = `${log.player_id}_${log.game_id}`
      const innings = pitchingInningsByPlayerGame[key] || []
      const inningsStr = innings.sort((a, b) => a - b).join(',')

      logData.push({
        division: team?.division || 'Unknown',
        team: team?.name || 'Unknown',
        playerName: player.name,
        age: player.age,
        jerseyNumber: player.jersey_number || '',
        position: 'Pitch',
        innings: inningsStr,
        finalPitchCount: log.final_pitch_count,
        officialPitchCount: getOfficialPitchCount(log.penultimate_batter_count),
        date: game.game_date,
        game: `${homeTeam?.name || 'Unknown'} vs ${awayTeam?.name || 'Unknown'}`
      })
    }
  })

  // Add catching data from positions_played
  // Group positions_played by player and game to collect inning numbers
  const catchingByPlayerGame = {}
  data.positionsPlayed.forEach(pos => {
    if (pos.position === 'catcher') {
      const key = `${pos.player_id}_${pos.game_id}`
      if (!catchingByPlayerGame[key]) {
        catchingByPlayerGame[key] = {
          player_id: pos.player_id,
          game_id: pos.game_id,
          inningNumbers: []
        }
      }
      catchingByPlayerGame[key].inningNumbers.push(pos.inning_number)
    }
  })

  // Convert catching data to log format
  Object.values(catchingByPlayerGame).forEach(catchData => {
    const player = playerLookup[catchData.player_id]
    const game = data.games.find(g => g.id === catchData.game_id)
    if (player && game) {
      const team = teamLookup[player.team_id]
      const homeTeam = teamLookup[game.home_team_id]
      const awayTeam = teamLookup[game.away_team_id]

      // Format innings as comma-separated string
      const inningsStr = catchData.inningNumbers.sort((a, b) => a - b).join(',')

      logData.push({
        division: team?.division || 'Unknown',
        team: team?.name || 'Unknown',
        playerName: player.name,
        age: player.age,
        jerseyNumber: player.jersey_number || '',
        position: 'Catch',
        innings: inningsStr,
        finalPitchCount: '',
        officialPitchCount: '',
        date: game.game_date,
        game: `${homeTeam?.name || 'Unknown'} vs ${awayTeam?.name || 'Unknown'}`
      })
    }
  })

  // Sort by division, then date
  logData.sort((a, b) => {
    if (divOrder[a.division] !== divOrder[b.division]) {
      return divOrder[a.division] - divOrder[b.division]
    }
    return new Date(a.date) - new Date(b.date)
  })

  const logCSV = arrayToCSV(logData, ['division', 'date', 'team', 'playerName', 'age', 'jerseyNumber', 'position', 'innings', 'finalPitchCount', 'officialPitchCount', 'game'])
  zip.file('pitching_catching_log.csv', logCSV)

  // 4. CREATE ABSENT_PLAYERS.CSV
  // Filter for absent players and format data
  const absentData = []
  data.gamePlayers
    .filter(gp => gp.was_present === false)
    .forEach(gp => {
      const player = playerLookup[gp.player_id]
      const game = data.games.find(g => g.id === gp.game_id)
      if (player && game) {
        const team = teamLookup[player.team_id]
        absentData.push({
          division: team?.division || 'Unknown',
          playerName: player.name,
          dateAbsent: game.game_date,
          team: team?.name || 'Unknown',
          jerseyNumber: player.jersey_number || ''
        })
      }
    })

  // Sort by division, then player name
  absentData.sort((a, b) => {
    if (divOrder[a.division] !== divOrder[b.division]) {
      return divOrder[a.division] - divOrder[b.division]
    }
    return a.playerName.localeCompare(b.playerName)
  })

  const absentCSV = arrayToCSV(absentData, ['division', 'playerName', 'dateAbsent', 'team', 'jerseyNumber'])
  zip.file('absent_players.csv', absentCSV)

  // Generate ZIP file
  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const filename = `csv_export_${data.season.name.replace(/[^a-z0-9]/gi, '_')}_${getTimestamp(new Date())}.zip`

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
 *
 * Generates a professional, human-readable HTML report with:
 * - Season overview (dates, status)
 * - Teams overview table (name, division, player count)
 * - Detailed team sections with coaches, rosters, and game schedules
 * - Games organized by division (Training, Minor, Major) in chronological order
 * - Pitching logs organized by division
 *
 * Features:
 * - Print-friendly styling with page breaks
 * - Color-coded division badges
 * - Responsive design for mobile viewing
 * - All dates use parseLocalDate() to prevent timezone issues
 * - Shows both Final Pitch Count and Official Pitch Count (Penultimate + 1)
 *
 * Filename format: report_SeasonName_YYYY-MM-DD_HH-MM-SS.html
 *
 * @param {string} seasonId - UUID of the season to export
 * @returns {Promise<void>} Downloads HTML file to user's computer
 * @throws {Error} If data fetch or HTML generation fails
 */
export async function exportSeasonHTML(seasonId) {
  const data = await fetchSeasonData(supabase, seasonId)

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

  // Group games by division (based on home team's division)
  const gamesByDivision = {
    'Training': [],
    'Minor': [],
    'Major': []
  }

  data.games.forEach(game => {
    const homeTeam = teamLookup[game.home_team_id]
    if (homeTeam) {
      gamesByDivision[homeTeam.division].push(game)
    }
  })

  // Sort each division's games chronologically
  Object.keys(gamesByDivision).forEach(division => {
    gamesByDivision[division].sort((a, b) =>
      new Date(a.game_date) - new Date(b.game_date)
    )
  })

  // Group pitching logs by division (based on player's team division)
  const logsByDivision = {
    'Training': [],
    'Minor': [],
    'Major': []
  }

  data.pitchingLogs.forEach(log => {
    const player = playerLookup[log.player_id]
    if (player) {
      const team = teamLookup[player.team_id]
      if (team) {
        logsByDivision[team.division].push(log)
      }
    }
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
    <strong>Season Period:</strong> ${formatDate(data.season.start_date)}
    ${data.season.end_date ? `to ${formatDate(data.season.end_date)}` : '(ongoing)'}
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
        </tr>
      </thead>
      <tbody>
        ${data.teams.map(team => {
          const teamPlayers = playersByTeam[team.id] || []
          return `
            <tr>
              <td><strong>${team.name}</strong></td>
              <td><span class="division-badge division-${team.division.toLowerCase()}">${team.division}</span></td>
              <td>${teamPlayers.length}</td>
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
              </tr>
            </thead>
            <tbody>
              ${teamCoaches.map(tc => `
                <tr>
                  <td>${tc.user_profiles?.name || 'N/A'}</td>
                  <td>${tc.user_profiles?.email || 'N/A'}</td>
                  <td>${tc.role.replace('_', ' ')}</td>
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
                  <td>${formatDate(game.game_date)}</td>
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

  ${['Training', 'Minor', 'Major'].map(division => {
    const divisionGames = gamesByDivision[division]
    if (divisionGames.length === 0) return ''

    return `
  <div class="section">
    <h2>${division} Division Games (${divisionGames.length})</h2>
    <span class="division-badge division-${division.toLowerCase()}">${division}</span>
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
        ${divisionGames.map(game => `
          <tr>
            <td>${formatDate(game.game_date)}</td>
            <td>${teamLookup[game.home_team_id]?.name || 'Unknown'}</td>
            <td>${teamLookup[game.away_team_id]?.name || 'Unknown'}</td>
            <td><strong>${game.home_score || 0} - ${game.away_score || 0}</strong></td>
            <td>${game.scorekeeper_name || 'N/A'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
    `
  }).join('')}

  ${['Training', 'Minor', 'Major'].map(division => {
    const divisionLogs = logsByDivision[division]
    if (divisionLogs.length === 0) return ''

    return `
  <div class="section">
    <h2>${division} Division Pitching Logs (${divisionLogs.length})</h2>
    <span class="division-badge division-${division.toLowerCase()}">${division}</span>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Player</th>
          <th>Team</th>
          <th>Game</th>
          <th>Final Pitch Count</th>
          <th>Official Pitch Count</th>
          <th>Next Eligible</th>
        </tr>
      </thead>
      <tbody>
        ${divisionLogs.map(log => {
          const game = data.games.find(g => g.id === log.game_id)
          const player = playerLookup[log.player_id]
          const team = player ? teamLookup[player.team_id] : null
          return `
            <tr>
              <td>${game ? formatDate(game.game_date) : 'N/A'}</td>
              <td>${player?.name || 'Unknown'}</td>
              <td>${team?.name || 'Unknown'}</td>
              <td>${game ? `${teamLookup[game.home_team_id]?.name} vs ${teamLookup[game.away_team_id]?.name}` : 'N/A'}</td>
              <td><strong>${log.final_pitch_count}</strong></td>
              <td><strong>${getOfficialPitchCount(log.penultimate_batter_count)}</strong></td>
              <td>${formatDate(log.next_eligible_pitch_date)}</td>
            </tr>
          `
        }).join('')}
      </tbody>
    </table>
  </div>
    `
  }).join('')}

</body>
</html>`

  const filename = `report_${data.season.name.replace(/[^a-z0-9]/gi, '_')}_${getTimestamp(new Date())}.html`
  browserDownloadFile(html, filename, 'text/html')
}
