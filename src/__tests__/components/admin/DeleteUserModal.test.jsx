import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DeleteUserModal from '../../../components/admin/DeleteUserModal'

const baseProps = {
  userName: 'Jane Coach',
  userEmail: 'jane@example.com',
  userRole: 'coach',
  loading: false,
  onConfirm: vi.fn(),
  onClose: vi.fn(),
}

describe('DeleteUserModal', () => {
  it('shows the target user details', () => {
    render(<DeleteUserModal {...baseProps} />)
    expect(screen.getByText('Jane Coach')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
  })

  it('disables confirm until DELETE is typed, then calls onConfirm', () => {
    const onConfirm = vi.fn()
    render(<DeleteUserModal {...baseProps} onConfirm={onConfirm} />)

    const confirmBtn = screen.getByRole('button', { name: /delete user/i })
    expect(confirmBtn).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText('Type DELETE to confirm'), {
      target: { value: 'DELETE' },
    })
    expect(confirmBtn).not.toBeDisabled()

    fireEvent.click(confirmBtn)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('does not call onConfirm when confirmation text is wrong', () => {
    const onConfirm = vi.fn()
    render(<DeleteUserModal {...baseProps} onConfirm={onConfirm} />)
    fireEvent.change(screen.getByPlaceholderText('Type DELETE to confirm'), {
      target: { value: 'delete' },
    })
    fireEvent.click(screen.getByRole('button', { name: /delete user/i }))
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
