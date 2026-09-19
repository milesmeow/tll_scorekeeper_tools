import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DeleteSeasonModal from '../../../components/tools/DeleteSeasonModal'

const baseProps = {
  seasonName: '2025 Season',
  deleting: false,
  error: null,
  onConfirm: vi.fn(),
  onClose: vi.fn(),
}

describe('DeleteSeasonModal', () => {
  it('shows the target season name and what will be deleted', () => {
    render(<DeleteSeasonModal {...baseProps} />)
    expect(screen.getAllByText('2025 Season').length).toBeGreaterThan(0)
    expect(screen.getByText(/team rosters and coach assignments/i)).toBeInTheDocument()
    expect(screen.getByText(/pitching and catching data/i)).toBeInTheDocument()
    expect(screen.getByText(/player absence records/i)).toBeInTheDocument()
  })

  it('disables confirm until the exact season name is typed, then calls onConfirm', () => {
    const onConfirm = vi.fn()
    render(<DeleteSeasonModal {...baseProps} onConfirm={onConfirm} />)

    const confirmBtn = screen.getByRole('button', { name: /^delete season$/i })
    expect(confirmBtn).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText('Type "2025 Season" to confirm'), {
      target: { value: '2025 Season' },
    })
    expect(confirmBtn).not.toBeDisabled()

    fireEvent.click(confirmBtn)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('does not call onConfirm when a partial or wrong name is typed', () => {
    const onConfirm = vi.fn()
    render(<DeleteSeasonModal {...baseProps} onConfirm={onConfirm} />)
    fireEvent.change(screen.getByPlaceholderText('Type "2025 Season" to confirm'), {
      target: { value: '2025 Seaso' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^delete season$/i }))
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('shows a server error when the delete fails', () => {
    render(<DeleteSeasonModal {...baseProps} error="Only super_admins can delete a season" />)
    expect(screen.getByText('Only super_admins can delete a season')).toBeInTheDocument()
  })

  it('disables inputs and shows a deleting state while in flight', () => {
    render(<DeleteSeasonModal {...baseProps} deleting={true} />)
    expect(screen.getByPlaceholderText('Type "2025 Season" to confirm')).toBeDisabled()
    expect(screen.getByRole('button', { name: /deleting/i })).toBeDisabled()
  })
})
