import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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

describe('UserManagement — handleDeleteUser', () => {
  const DELETE_USER_URL =
    'https://dnvitfjnlojorcqqccec.supabase.co/functions/v1/delete-user'

  beforeEach(() => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    })
    global.fetch = vi.fn()
  })

  afterEach(() => {
    delete global.fetch
  })

  const openModalAndConfirm = async () => {
    render(<UserManagement />)
    await waitFor(() => expect(screen.getByText('Coach One')).toBeInTheDocument())

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0])

    const input = screen.getByPlaceholderText('Type DELETE to confirm')
    fireEvent.change(input, { target: { value: 'DELETE' } })

    fireEvent.click(screen.getByRole('button', { name: /delete user/i }))
  }

  it('deletes the user and shows a success banner on the happy path', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })

    await openModalAndConfirm()

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))

    const [url, options] = global.fetch.mock.calls[0]
    expect(url).toBe(DELETE_USER_URL)
    expect(options.method).toBe('POST')
    expect(options.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-token',
    })
    expect(JSON.parse(options.body)).toEqual({ userId: '1' })

    expect(
      await screen.findByText(/deleted successfully/i)
    ).toBeInTheDocument()
  })

  it('shows an error banner when the delete request fails', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Boom' }),
    })

    await openModalAndConfirm()

    expect(await screen.findByText('Boom')).toBeInTheDocument()
  })
})
