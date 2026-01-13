/**
 * Integration Tests for Coach Assignments
 *
 * These tests query the REAL Supabase database to verify:
 * - Coach assignment queries work correctly
 * - Join queries with team_coaches and teams tables
 * - RLS policies for coach data access
 *
 * Prerequisites:
 * 1. A test coach user must exist in the database
 * 2. The coach should be assigned to at least one team
 * 3. Environment variables must be set
 */

import { describe, it, expect, beforeAll } from 'vitest'
import {
  integrationSupabase,
  hasSupabaseCredentials,
  setupTestData,
  TEST_DATA
} from './setup'

const describeOrSkip = hasSupabaseCredentials ? describe : describe.skip

describeOrSkip('Coach Assignments - Integration Tests', () => {
  let testCoachId = null
  let coachAssignments = []

  beforeAll(async () => {
    const success = await setupTestData()
    if (!success) {
      throw new Error('Failed to load test data - cannot run integration tests')
    }

    // Try to find a coach user in the database
    const { data: coaches } = await integrationSupabase
      .from('user_profiles')
      .select('id, name, role')
      .eq('role', 'coach')
      .limit(1)

    if (coaches && coaches.length > 0) {
      testCoachId = coaches[0].id
      console.log(`   Using test coach: ${coaches[0].name} (${testCoachId})`)

      // Get coach's team assignments
      const { data: assignments } = await integrationSupabase
        .from('team_coaches')
        .select('*')
        .eq('user_id', testCoachId)

      coachAssignments = assignments || []
    }
  })

  it('should fetch coach assignments with team data joined', async () => {
    if (!testCoachId) {
      console.log('⚠️  No test coach found - skipping test')
      return
    }

    const { data, error } = await integrationSupabase
      .from('team_coaches')
      .select(`
        team_id,
        teams:team_id (
          id,
          name,
          division
        )
      `)
      .eq('user_id', testCoachId)

    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)

    if (data.length > 0) {
      // Verify join worked correctly
      expect(data[0]).toHaveProperty('team_id')
      expect(data[0]).toHaveProperty('teams')
      expect(data[0].teams).toHaveProperty('id')
      expect(data[0].teams).toHaveProperty('name')
      expect(data[0].teams).toHaveProperty('division')
      expect(['Training', 'Minor', 'Major']).toContain(data[0].teams.division)
    }
  })

  it('should verify coach is assigned to teams in test season', async () => {
    if (!testCoachId || coachAssignments.length === 0) {
      console.log('⚠️  No coach assignments found - skipping test')
      return
    }

    // Get teams for these assignments
    const teamIds = coachAssignments.map(a => a.team_id)

    const { data: teams, error } = await integrationSupabase
      .from('teams')
      .select('*')
      .in('id', teamIds)

    expect(error).toBeNull()
    expect(teams.length).toBe(coachAssignments.length)

    // Verify all teams exist
    teams.forEach(team => {
      expect(team).toHaveProperty('id')
      expect(team).toHaveProperty('name')
      expect(team).toHaveProperty('division')
      expect(team).toHaveProperty('season_id')
    })
  })

  it('should handle queries for non-coach users (admins)', async () => {
    // Find an admin user
    const { data: admins } = await integrationSupabase
      .from('user_profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)

    if (!admins || admins.length === 0) {
      console.log('⚠️  No admin users found - skipping test')
      return
    }

    const adminId = admins[0].id

    // Query coach assignments for admin (should return empty)
    const { data, error } = await integrationSupabase
      .from('team_coaches')
      .select(`
        team_id,
        teams:team_id (
          id,
          name,
          division
        )
      `)
      .eq('user_id', adminId)

    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
    // Admins shouldn't have coach assignments
    expect(data.length).toBe(0)
  })

  it('should verify team_coaches RLS allows all authenticated users to view', async () => {
    // Query all team_coaches (RLS should allow viewing with anon key)
    const { data, error } = await integrationSupabase
      .from('team_coaches')
      .select('*')
      .limit(5)

    // Should not error (RLS allows SELECT for authenticated users)
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })

  it('should return unique divisions from coach assignments', async () => {
    if (!testCoachId || coachAssignments.length === 0) {
      console.log('⚠️  No coach assignments found - skipping test')
      return
    }

    const { data } = await integrationSupabase
      .from('team_coaches')
      .select(`
        team_id,
        teams:team_id (
          division
        )
      `)
      .eq('user_id', testCoachId)

    const divisions = [...new Set(
      data
        .map(tc => tc.teams?.division)
        .filter(Boolean)
    )]

    expect(Array.isArray(divisions)).toBe(true)
    divisions.forEach(div => {
      expect(['Training', 'Minor', 'Major']).toContain(div)
    })
  })

  it('should verify coach role assignment in user_profiles', async () => {
    if (!testCoachId) {
      console.log('⚠️  No test coach found - skipping test')
      return
    }

    const { data: profile, error } = await integrationSupabase
      .from('user_profiles')
      .select('*')
      .eq('id', testCoachId)
      .single()

    expect(error).toBeNull()
    expect(profile).toHaveProperty('id')
    expect(profile).toHaveProperty('role')
    expect(profile.role).toBe('coach')
    expect(profile).toHaveProperty('name')
    expect(profile).toHaveProperty('email')
    expect(profile).toHaveProperty('is_active')
  })

  it('should verify coach can view teams in their assigned divisions', async () => {
    if (!testCoachId || coachAssignments.length === 0) {
      console.log('⚠️  No coach assignments found - skipping test')
      return
    }

    // Get coach's divisions
    const { data: assignments } = await integrationSupabase
      .from('team_coaches')
      .select(`
        teams:team_id (
          division
        )
      `)
      .eq('user_id', testCoachId)

    const coachDivisions = [...new Set(
      assignments.map(a => a.teams?.division).filter(Boolean)
    )]

    if (coachDivisions.length === 0) {
      console.log('⚠️  No divisions found for coach')
      return
    }

    // Query teams in those divisions
    const { data: teams, error } = await integrationSupabase
      .from('teams')
      .select('*')
      .eq('season_id', TEST_DATA.SEASON_ID)
      .in('division', coachDivisions)

    expect(error).toBeNull()
    expect(Array.isArray(teams)).toBe(true)

    // All returned teams should be in coach's divisions
    teams.forEach(team => {
      expect(coachDivisions).toContain(team.division)
    })
  })
})
