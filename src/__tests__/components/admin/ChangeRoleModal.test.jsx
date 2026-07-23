import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ChangeRoleModal from '../../../components/admin/ChangeRoleModal'

const baseProps = {
  userName: 'Coach One',
  userEmail: 'c1@x.com',
  currentRole: 'coach',
  loading: false,
  onConfirm: vi.fn(),
  onClose: vi.fn(),
}

describe('ChangeRoleModal', () => {
  it('shows the current role and defaults the select to it', () => {
    render(<ChangeRoleModal {...baseProps} />)
    expect(screen.getByText(/current role:/i)).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveValue('coach')
  })

  it('offers only coach and admin (never super_admin)', () => {
    render(<ChangeRoleModal {...baseProps} />)
    const options = screen
      .getAllByRole('option')
      .map((o) => o.getAttribute('value'))
    expect(options).toEqual(['coach', 'admin'])
  })

  it('disables Change Role while the selection is unchanged', () => {
    render(<ChangeRoleModal {...baseProps} />)
    expect(screen.getByRole('button', { name: /change role/i })).toBeDisabled()
  })

  it('calls onConfirm with the newly selected role', () => {
    const onConfirm = vi.fn()
    render(<ChangeRoleModal {...baseProps} onConfirm={onConfirm} />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'admin' } })
    fireEvent.click(screen.getByRole('button', { name: /change role/i }))

    expect(onConfirm).toHaveBeenCalledWith('admin')
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    render(<ChangeRoleModal {...baseProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
