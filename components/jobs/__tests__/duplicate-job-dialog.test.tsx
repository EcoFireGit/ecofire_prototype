import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DuplicateJobDialog } from '../duplicate-job-dialog'
import { Job } from '../table/columns'

const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, type, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} type={type} {...props}>
      {children}
    </button>
  ),
}))

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, onClick }: any) => (
    <div data-testid="dialog-content" onClick={onClick}>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
}))

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, id, type, required, ...props }: any) => (
    <input
      value={value || ''}
      onChange={onChange}
      id={id}
      type={type || 'text'}
      required={required}
      {...props}
    />
  ),
}))

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: any) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}))

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, id, placeholder, ...props }: any) => (
    <textarea
      value={value || ''}
      onChange={onChange}
      id={id}
      placeholder={placeholder}
      {...props}
    />
  ),
}))

describe('DuplicateJobDialog', () => {
  const mockSourceJob: Job = {
    id: '1',
    title: 'Original Job',
    notes: 'Original notes',
    businessFunctionName: 'Engineering',
    dueDate: '2024-12-25',
    isDone: false,
    impact: 5,
  }

  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    onSubmit: jest.fn(),
    sourceJob: mockSourceJob,
  }

  const mockReload = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    })
  })

  afterEach(() => {
    mockReload.mockClear()
  })

  it('renders dialog when open is true', () => {
    render(<DuplicateJobDialog {...defaultProps} />)
    expect(screen.getByTestId('dialog')).toBeInTheDocument()
    expect(screen.getByText('Duplicate Job')).toBeInTheDocument()
  })

  it('does not render dialog when open is false', () => {
    render(<DuplicateJobDialog {...defaultProps} open={false} />)
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
  })

  it('initializes form with source job data and "(Copy)" suffix', () => {
    render(<DuplicateJobDialog {...defaultProps} />)
    
    expect(screen.getByDisplayValue('Original Job (Copy)')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Original notes')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2024-12-25')).toBeInTheDocument()
  })

  it('handles form input changes correctly', async () => {
    const user = userEvent.setup()
    render(<DuplicateJobDialog {...defaultProps} />)

    const titleInput = screen.getByDisplayValue('Original Job (Copy)')
    const notesTextarea = screen.getByDisplayValue('Original notes')
    const dueDateInput = screen.getByDisplayValue('2024-12-25')

    await user.clear(titleInput)
    await user.type(titleInput, 'Updated Title')
    expect(titleInput).toHaveValue('Updated Title')

    await user.clear(notesTextarea)
    await user.type(notesTextarea, 'Updated notes')
    expect(notesTextarea).toHaveValue('Updated notes')

    await user.clear(dueDateInput)
    await user.type(dueDateInput, '2024-12-31')
    expect(dueDateInput).toHaveValue('2024-12-31')
  })

  it('successfully duplicates job and shows success toast', async () => {
    const user = userEvent.setup()
    
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        success: true,
      }),
    })

    render(<DuplicateJobDialog {...defaultProps} />)

    const submitButton = screen.getByText('Create Duplicate')
    await user.click(submitButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/jobs/duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceJobId: '1',
          newJobData: {
            id: '1',
            title: 'Original Job (Copy)',
            notes: 'Original notes',
            businessFunctionName: 'Engineering',
            dueDate: '2024-12-25',
            isDone: false,
            impact: 5,
          },
        }),
      })
    })

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Job Duplicated',
      description: 'Successfully duplicated "Original Job" with all its tasks',
    })

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
    expect(mockReload).toHaveBeenCalled()
  })

  it('handles API error and shows error toast', async () => {
  const user = userEvent.setup()
  
  global.fetch = jest.fn().mockResolvedValue({
    json: jest.fn().mockResolvedValue({
      success: false,
      error: 'Database error',
    }),
  })

  // Suppress the console.error for this test since we're testing error handling
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

  render(<DuplicateJobDialog {...defaultProps} />)

  const submitButton = screen.getByText('Create Duplicate')
  await user.click(submitButton)

  await waitFor(() => {
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Duplication Failed',
      description: 'There was an error duplicating the job. Please try again.',
      variant: 'destructive',
    })
  })

  // Verify the error was logged (but silently)
  expect(consoleSpy).toHaveBeenCalledWith(
    'Error during job duplication:', 
    expect.any(Error)
  )

  // Clean up
  consoleSpy.mockRestore()

  // Dialog should not close on error
  expect(defaultProps.onOpenChange).not.toHaveBeenCalledWith(false)
  expect(mockReload).not.toHaveBeenCalled()
})

  it('handles network error and shows error toast', async () => {
    const user = userEvent.setup()
    
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(<DuplicateJobDialog {...defaultProps} />)

    const submitButton = screen.getByText('Create Duplicate')
    await user.click(submitButton)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error during job duplication:',
        expect.any(Error)
      )
    })

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Duplication Failed',
      description: 'There was an error duplicating the job. Please try again.',
      variant: 'destructive',
    })

    consoleSpy.mockRestore()
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    
    global.fetch = jest.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        json: () => Promise.resolve({ success: true })
      }), 100))
    )

    render(<DuplicateJobDialog {...defaultProps} />)

    const submitButton = screen.getByText('Create Duplicate')
    await user.click(submitButton)

    expect(screen.getByText('Duplicating job...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('handles source job without due date', () => {
    const jobWithoutDate = { ...mockSourceJob, dueDate: undefined }
    render(<DuplicateJobDialog {...defaultProps} sourceJob={jobWithoutDate} />)
    
    const dueDateInput = screen.getByLabelText('Due Date')
    expect(dueDateInput).toHaveValue('')
  })

  it('handles source job without notes', () => {
    const jobWithoutNotes = { ...mockSourceJob, notes: undefined }
    render(<DuplicateJobDialog {...defaultProps} sourceJob={jobWithoutNotes} />)
    
    const notesTextarea = screen.getByLabelText('Notes')
    expect(notesTextarea).toHaveValue('')
  })

  it('resets form when dialog reopens with different source job', () => {
    const { rerender } = render(<DuplicateJobDialog {...defaultProps} open={false} />)
    
    const newSourceJob: Job = {
      id: '2',
      title: 'Different Job',
      notes: 'Different notes',
      dueDate: '2024-11-15',
      isDone: false,
    }
    
    rerender(<DuplicateJobDialog {...defaultProps} sourceJob={newSourceJob} open={true} />)
    
    expect(screen.getByDisplayValue('Different Job (Copy)')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Different notes')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2024-11-15')).toBeInTheDocument()
  })

  it('dialog content has onClick handler for event handling', () => {
    render(<DuplicateJobDialog {...defaultProps} />)
    
    const dialogContent = screen.getByTestId('dialog-content')
    fireEvent.click(dialogContent)
    expect(screen.getByTestId('dialog')).toBeInTheDocument()
  })

  it('submits form when Enter is pressed in title field', async () => {
    const user = userEvent.setup()
    
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ success: true }),
    })

    render(<DuplicateJobDialog {...defaultProps} />)

    const titleInput = screen.getByDisplayValue('Original Job (Copy)')
    await user.type(titleInput, '{enter}')

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })
  })

  it('requires title field to be filled', () => {
    render(<DuplicateJobDialog {...defaultProps} />)
    
    const titleInput = screen.getByDisplayValue('Original Job (Copy)')
    expect(titleInput).toHaveAttribute('required')
  })

  it('formats date correctly from source job', () => {
    const jobWithDateTime = {
      ...mockSourceJob,
      dueDate: '2024-12-25T10:30:00.000Z'
    }
    
    render(<DuplicateJobDialog {...defaultProps} sourceJob={jobWithDateTime} />)
    expect(screen.getByDisplayValue('2024-12-25')).toBeInTheDocument()
  })
})