/**
 * Integration Test Setup
 *
 * This setup file configures integration tests to use the REAL Supabase database.
 *
 * IMPORTANT: These tests require:
 * 1. Valid Supabase credentials in environment variables
 * 2. A test season with known data in the database
 * 3. Proper RLS policies configured
 *
 * Environment Variables Required:
 * - VITE_SUPABASE_URL: Your Supabase project URL
 * - VITE_SUPABASE_ANON_KEY: Your Supabase anonymous key
 *
 * To run integration tests:
 * 1. Create a .env.test file with your Supabase credentials
 * 2. Run: npm run test:integration
 *
 * Note: Integration tests will NOT run in CI/CD unless credentials are provided
 */

import { beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Check for environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const hasSupabaseCredentials = !!(supabaseUrl && supabaseAnonKey)

// Create real Supabase client for integration tests
export const integrationSupabase = hasSupabaseCredentials
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Test data constants - update these to match your test season
export const TEST_DATA = {
  // These will be populated by querying the database for a test season
  SEASON_ID: null,
  SEASON_NAME: 'Test Season', // Name to search for
  TEAM_IDS: [],
  PLAYER_IDS: [],
  GAME_IDS: []
}

/**
 * Finds and caches test season data
 * This should be called in beforeAll() of integration tests
 */
export async function setupTestData() {
  if (!hasSupabaseCredentials || !integrationSupabase) {
    console.log('⚠️  Skipping integration tests - no Supabase credentials')
    return false
  }

  try {
    // Find test season by name
    const { data: season, error: seasonError } = await integrationSupabase
      .from('seasons')
      .select('*')
      .ilike('name', `%${TEST_DATA.SEASON_NAME}%`)
      .limit(1)
      .single()

    if (seasonError || !season) {
      console.log(`⚠️  Test season "${TEST_DATA.SEASON_NAME}" not found in database`)
      console.log('   Create a test season in your database to run integration tests')
      return false
    }

    TEST_DATA.SEASON_ID = season.id

    // Get test teams
    const { data: teams } = await integrationSupabase
      .from('teams')
      .select('id')
      .eq('season_id', season.id)

    TEST_DATA.TEAM_IDS = teams?.map(t => t.id) || []

    // Get test players
    if (TEST_DATA.TEAM_IDS.length > 0) {
      const { data: players } = await integrationSupabase
        .from('players')
        .select('id')
        .in('team_id', TEST_DATA.TEAM_IDS)

      TEST_DATA.PLAYER_IDS = players?.map(p => p.id) || []
    }

    // Get test games
    const { data: games } = await integrationSupabase
      .from('games')
      .select('id')
      .eq('season_id', season.id)

    TEST_DATA.GAME_IDS = games?.map(g => g.id) || []

    console.log('✅ Integration test data loaded:')
    console.log(`   Season: ${season.name} (${TEST_DATA.SEASON_ID})`)
    console.log(`   Teams: ${TEST_DATA.TEAM_IDS.length}`)
    console.log(`   Players: ${TEST_DATA.PLAYER_IDS.length}`)
    console.log(`   Games: ${TEST_DATA.GAME_IDS.length}`)

    return true
  } catch (error) {
    console.error('❌ Error loading test data:', error.message)
    return false
  }
}

/**
 * Cleanup function (optional - for tests that modify data)
 */
export async function cleanupTestData() {
  // Currently no cleanup needed since we use existing test season
  // Add cleanup logic here if tests start modifying data
}
