/**
 * Integration Test Setup
 *
 * This setup file configures integration tests to use the REAL Supabase database.
 *
 * IMPORTANT: These tests require:
 * 1. Valid Supabase credentials in .env.local
 * 2. A test user account with admin role in Supabase Authentication
 * 3. A test season named "Integration Test Season" with data
 * 4. Proper RLS policies configured
 *
 * Environment Variables Required (in .env.local):
 * - VITE_SUPABASE_URL: Your Supabase project URL
 * - VITE_SUPABASE_ANON_KEY: Your Supabase anonymous key
 * - VITE_TEST_USER_EMAIL: Test user email (must exist in Supabase Auth)
 * - VITE_TEST_USER_PASSWORD: Test user password (use quotes if special chars)
 *
 * Setup Instructions:
 * 1. Add credentials to .env.local (see TESTING.md)
 * 2. Create "Integration Test Season" in your database
 * 3. Add teams, players, games to the test season
 * 4. Run: npm run test:run
 *
 * Authentication:
 * - Tests authenticate before running queries (required for RLS)
 * - Automatically sign out after test completion
 * - Read-only operations (no database modifications)
 *
 * Note: Integration tests will skip if credentials are missing
 */

import { createClient } from '@supabase/supabase-js'

// Check for environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const testUserEmail = import.meta.env.VITE_TEST_USER_EMAIL
const testUserPassword = import.meta.env.VITE_TEST_USER_PASSWORD

export const hasSupabaseCredentials = !!(supabaseUrl && supabaseAnonKey && testUserEmail && testUserPassword)

// Create real Supabase client for integration tests
export const integrationSupabase = hasSupabaseCredentials
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Track authentication state
let isAuthenticated = false

// Test data constants - update these to match your test season
export const TEST_DATA = {
  // These will be populated by querying the database for a test season
  SEASON_ID: null,
  SEASON_NAME: 'Integration Test Season', // Name to search for
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
    // Authenticate if not already authenticated
    if (!isAuthenticated) {
      const { data: authData, error: authError } = await integrationSupabase.auth.signInWithPassword({
        email: testUserEmail,
        password: testUserPassword
      })

      if (authError) {
        console.error('❌ Authentication failed:', authError.message)
        console.log('   Check your VITE_TEST_USER_EMAIL and VITE_TEST_USER_PASSWORD in .env.local')
        return false
      }

      if (!authData?.user) {
        console.error('❌ Authentication succeeded but no user returned')
        return false
      }

      console.log(`✅ Authenticated as: ${authData.user.email}`)
      isAuthenticated = true
    }

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
 * Cleanup function - signs out after tests complete
 */
export async function cleanupTestData() {
  if (isAuthenticated && integrationSupabase) {
    await integrationSupabase.auth.signOut()
    isAuthenticated = false
    console.log('✅ Signed out test user')
  }
}
