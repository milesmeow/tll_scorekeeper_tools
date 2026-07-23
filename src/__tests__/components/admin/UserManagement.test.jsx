import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { supabase } from '../../../lib/supabase'
import UserManagement from '../../../components/admin/UserManagement'

const USERS = [
  { id: '1', name: 'Coach One', email: 'c1@x.com', role: 'coach', is_active: true },
  { id: '2', name: 'Admin One', email: 'a1@x.com', role: 'admin', is_active: true },
  { id: '3', name: 'Super One', email: 's1@x.com', role: 'super_admin', is_active: true },
]

beforeEach(() => {
  // fetchUsers(): supabase.from('user_profiles').select('*').order(...)
  supabase.from.mockReturnValue({
    select: vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: USERS, error: null }),
    }),
  })
})

describe('UserManagement — delete link visibility', () => {
  it('renders a Delete link for coach and admin rows but not super_admin', async () => {
    render(<UserManagement />)
    await waitFor(() => expect(screen.getByText('Coach One')).toBeInTheDocument())

    const deleteLinks = screen.getAllByRole('button', { name: 'Delete' })
    expect(deleteLinks).toHaveLength(2)
  })

  it('opens the confirmation modal when Delete is clicked', async () => {
    render(<UserManagement />)
    await waitFor(() => expect(screen.getByText('Coach One')).toBeInTheDocument())

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0])
    expect(
      screen.getByRole('button', { name: /delete user/i })
    ).toBeInTheDocument()
  })
})
