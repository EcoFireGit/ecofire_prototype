import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JobDialog } from '../job-dialog'
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
  DialogContent: ({ children }: any) => (
    <div data-testid="dialog-content">{children}</div>
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

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value, disabled }: any) => (
    <div data-testid="select" data-disabled={disabled}>
      <button
        onClick={() => {
          const mockValue = 'bf-1'
          onValueChange?.(mockValue)
        }}
        data-value={value}
      >
        {value === 'none' ? 'None' : `Selected: ${value}`}
      </button>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-testid="select-item" data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}))

jest.mock('@/components/business-functions/create-dialog', () => ({
  CreateDialog: ({ open, onSubmit, onOpenChange }: any) => 
    open ? (
      <div data-testid="create-dialog">
        <button
          onClick={() => onSubmit('New Business Function')}
          data-testid="create-submit"
        >
          Create Business Function
        </button>
        <button onClick={() => onOpenChange(false)}>Cancel</button>
      </div>
    ) : null
}))

const mockBusinessFunctions = [
  { _id: 'bf-1', name: 'Engineering' },
  { _id: 'bf-2', name: 'Marketing' },
]

const mockJob: Job = {
  id: '1',
  title: 'Test Job',
  notes: 'Test notes',
  businessFunctionId: 'bf-1',
  dueDate: '2024-12-25',
  isDone: false,
}

describe('JobDialog', () => {
  const defaultProps = {
    mode: 'create' as const,
    open: true,
    onOpenChange: jest.fn(),
    onSubmit: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        data: mockBusinessFunctions
      }),
    })
  })

  describe('Dialog Rendering', () => {
    it('renders create dialog when open', async () => {
      await act(async () => {
        render(<JobDialog {...defaultProps} />)
      })
      
      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByText('Create New Job')).toBeInTheDocument()
    })

    it('renders edit dialog with correct title', async () => {
      await act(async () => {
        render(<JobDialog {...defaultProps} mode="edit" initialData={mockJob} />)
      })
      
      expect(screen.getByText('Edit Job')).toBeInTheDocument()
    })

    it('does not render when open is false', () => {
      render(<JobDialog {...defaultProps} open={false} />)
      
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })
  })

  describe('Form Initialization', () => {
    it('initializes empty form in create mode', async () => {
      await act(async () => {
        render(<JobDialog {...defaultProps} />)
      })
      
      expect(screen.getByLabelText('Title')).toHaveValue('')
      expect(screen.getByLabelText('Notes')).toHaveValue('')
      expect(screen.getByLabelText('Due Date')).toHaveValue('')
    })

    it('initializes form with data in edit mode', async () => {
      await act(async () => {
        render(<JobDialog {...defaultProps} mode="edit" initialData={mockJob} />)
      })
      
      expect(screen.getByDisplayValue('Test Job')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test notes')).toBeInTheDocument()
      expect(screen.getByDisplayValue('2024-12-25')).toBeInTheDocument()
    })

    it('formats date correctly from ISO string in edit mode', async () => {
      const jobWithDateTime = {
        ...mockJob,
        dueDate: '2024-12-25T10:30:00.000Z'
      }
      
      await act(async () => {
        render(<JobDialog {...defaultProps} mode="edit" initialData={jobWithDateTime} />)
      })
      
      expect(screen.getByDisplayValue('2024-12-25')).toBeInTheDocument()
    })
  })

  describe('Business Functions Loading', () => {
    it('fetches business functions when dialog opens', async () => {
      await act(async () => {
        render(<JobDialog {...defaultProps} />)
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/business-functions')
      })
    })

    it('handles business function fetch error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      await act(async () => {
        render(<JobDialog {...defaultProps} />)
      })

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Fetch error:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })

    it('auto-selects single business function in create mode', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: [mockBusinessFunctions[0]]
        }),
      })

      await act(async () => {
        render(<JobDialog {...defaultProps} />)
      })

      await waitFor(() => {
        expect(screen.getByText('Engineering')).toBeInTheDocument()
      })
    })
  })

  describe('Form Interactions', () => {
    it('handles form input changes', async () => {
      const user = userEvent.setup()
      
      await act(async () => {
        render(<JobDialog {...defaultProps} />)
      })

      const titleInput = screen.getByLabelText('Title')
      const notesTextarea = screen.getByLabelText('Notes')
      const dueDateInput = screen.getByLabelText('Due Date')

      await act(async () => {
        await user.type(titleInput, 'New Job Title')
        await user.type(notesTextarea, 'New job notes')
        await user.type(dueDateInput, '2024-12-31')
      })

      expect(titleInput).toHaveValue('New Job Title')
      expect(notesTextarea).toHaveValue('New job notes')
      expect(dueDateInput).toHaveValue('2024-12-31')
    })

    it('handles business function selection', async () => {
      await act(async () => {
        render(<JobDialog {...defaultProps} />)
      })

      await waitFor(() => {
        expect(screen.getByText('Engineering')).toBeInTheDocument()
        expect(screen.getByText('Marketing')).toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('submits form with correct data in create mode', async () => {
      const user = userEvent.setup()
      
      await act(async () => {
        render(<JobDialog {...defaultProps} />)
      })

      await act(async () => {
        await user.type(screen.getByLabelText('Title'), 'New Job')
        await user.type(screen.getByLabelText('Notes'), 'Job notes')
        await user.type(screen.getByLabelText('Due Date'), '2024-12-31')
      })

      await act(async () => {
        await user.click(screen.getByText('Create'))
      })

      expect(defaultProps.onSubmit).toHaveBeenCalledWith({
        title: 'New Job',
        notes: 'Job notes',
        owner: '',
        businessFunctionId: undefined,
        dueDate: '2024-12-31T00:00:00.000Z',
        isDone: false,
      })
    })

    it('submits form with correct data in edit mode', async () => {
      const user = userEvent.setup()
      
      await act(async () => {
        render(<JobDialog {...defaultProps} mode="edit" initialData={mockJob} />)
      })

      const titleInput = screen.getByDisplayValue('Test Job')
      
      await act(async () => {
        await user.clear(titleInput)
        await user.type(titleInput, 'Updated Job')
      })

      await act(async () => {
        await user.click(screen.getByText('Save Changes'))
      })

      expect(defaultProps.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Updated Job',
          dueDate: '2024-12-25T00:00:00.000Z',
        })
      )
    })

    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      
      await act(async () => {
        render(<JobDialog {...defaultProps} />)
      })

      await act(async () => {
        await user.type(screen.getByLabelText('Title'), 'New Job')
        await user.click(screen.getByText('Create'))
      })

      expect(screen.getByText('Creating...')).toBeInTheDocument()
      expect(screen.getByText('Creating...')).toBeDisabled()
    })

    it('shows correct loading text in edit mode', async () => {
      const user = userEvent.setup()
      
      await act(async () => {
        render(<JobDialog {...defaultProps} mode="edit" initialData={mockJob} />)
      })

      await act(async () => {
        await user.click(screen.getByText('Save Changes'))
      })

      expect(screen.getByText('Saving...')).toBeInTheDocument()
    })
  })

  describe('Business Function Creation', () => {
    it('has create new business function option in select', async () => {
      await act(async () => {
        render(<JobDialog {...defaultProps} />)
      })

      await waitFor(() => {
        expect(screen.getByText('+ Create New Business Function')).toBeInTheDocument()
      })
    })

    it('handles business function API response correctly', async () => {
      await act(async () => {
        render(<JobDialog {...defaultProps} />)
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/business-functions')
      })
    })

    it('shows create new business function option', async () => {
      await act(async () => {
        render(<JobDialog {...defaultProps} />)
      })

      await waitFor(() => {
        expect(screen.getByText('+ Create New Business Function')).toBeInTheDocument()
      })
    })

    it('handles empty business function list', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: [] })
      })

      await act(async () => {
        render(<JobDialog {...defaultProps} />)
      })

      await waitFor(() => {
        expect(screen.getByText('+ Create New Business Function')).toBeInTheDocument()
      })
    })

    it('handles business function API response structure', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ 
          data: [{ _id: 'new-bf-id', name: 'New Business Function' }]
        })
      })

      await act(async () => {
        render(<JobDialog {...defaultProps} />)
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/business-functions')
        expect(screen.getByText('New Business Function')).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('shows loading placeholder in select when fetching', async () => {
      global.fetch = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockBusinessFunctions })
        }), 100))
      )

      await act(async () => {
        render(<JobDialog {...defaultProps} />)
      })

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('disables submit button when loading', async () => {
      global.fetch = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockBusinessFunctions })
        }), 100))
      )

      await act(async () => {
        render(<JobDialog {...defaultProps} />)
      })

      const submitButton = screen.getByText('Create')
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Dialog State Management', () => {
    it('resets submitting state when dialog closes', async () => {
      let rerender: any

      await act(async () => {
        const result = render(<JobDialog {...defaultProps} open={true} />)
        rerender = result.rerender
      })
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
      
      await act(async () => {
        rerender(<JobDialog {...defaultProps} open={false} />)
      })
      
      await act(async () => {
        rerender(<JobDialog {...defaultProps} open={true} />)
      })
      
      await waitFor(() => {
        const submitButton = screen.getByText('Create')
        expect(submitButton).not.toBeDisabled()
      })
    })

    it('resets form when switching from edit to create mode', async () => {
      let rerender: any

      await act(async () => {
        const result = render(
          <JobDialog {...defaultProps} mode="edit" initialData={mockJob} />
        )
        rerender = result.rerender
      })
      
      expect(screen.getByDisplayValue('Test Job')).toBeInTheDocument()
      
      await act(async () => {
        rerender(<JobDialog {...defaultProps} mode="create" />)
      })
      
      await waitFor(() => {
        const titleInput = screen.getByLabelText('Title')
        expect(titleInput).toHaveValue('')
      })
    })
  })

  describe('Error Handling', () => {
    it('handles business function creation error', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ data: mockBusinessFunctions }),
        })
        .mockRejectedValueOnce(new Error('Creation failed'))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      await act(async () => {
        render(<JobDialog {...defaultProps} />)
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      expect(screen.getByTestId('dialog')).toBeInTheDocument()

      consoleSpy.mockRestore()
    })
  })

  describe('Advanced Form Scenarios', () => {
    it('handles form submission with business function selected', async () => {
      const user = userEvent.setup()
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: [{ _id: 'bf-1', name: 'Engineering' }]
        }),
      })

      await act(async () => {
        render(<JobDialog {...defaultProps} />)
      })

      await waitFor(() => {
        expect(screen.getByText('Engineering')).toBeInTheDocument()
      })

      await act(async () => {
        await user.type(screen.getByLabelText('Title'), 'Job with BF')
        await user.click(screen.getByText('Create'))
      })

      expect(defaultProps.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Job with BF',
          businessFunctionId: 'bf-1'
        })
      )
    })

    it('preserves business function in edit mode', async () => {
      const jobWithBF = {
        ...mockJob,
        businessFunctionId: 'bf-2'
      }

      await act(async () => {
        render(<JobDialog {...defaultProps} mode="edit" initialData={jobWithBF} />)
      })

      await waitFor(() => {
        expect(screen.getByText('Marketing')).toBeInTheDocument()
      })
    })

    it('handles missing business function data gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({})
      })

      await act(async () => {
        render(<JobDialog {...defaultProps} />)
      })

      expect(screen.getByTestId('dialog')).toBeInTheDocument()
    })

    it('handles malformed business function response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      await act(async () => {
        render(<JobDialog {...defaultProps} />)
      })

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Fetch error:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })

    it('auto-selects business function when only one exists and no current selection', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: [{ _id: 'only-bf', name: 'Only Function' }]
        }),
      })

      await act(async () => {
        render(<JobDialog {...defaultProps} mode="create" />)
      })

      await waitFor(() => {
        expect(screen.getByText('Only Function')).toBeInTheDocument()
      })
    })

    it('does not auto-select when business function already exists', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: [{ _id: 'only-bf', name: 'Only Function' }]
        }),
      })

      const jobWithExistingBF = {
        ...mockJob,
        businessFunctionId: 'existing-bf'
      }

      await act(async () => {
        render(<JobDialog {...defaultProps} mode="edit" initialData={jobWithExistingBF} />)
      })

      expect(screen.getByTestId('dialog')).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('requires title field', async () => {
      await act(async () => {
        render(<JobDialog {...defaultProps} />)
      })
      
      const titleInput = screen.getByLabelText('Title')
      expect(titleInput).toHaveAttribute('required')
    })

    it('handles empty due date correctly', async () => {
      const user = userEvent.setup()
      
      await act(async () => {
        render(<JobDialog {...defaultProps} />)
      })

      await act(async () => {
        await user.type(screen.getByLabelText('Title'), 'New Job')
        await user.click(screen.getByText('Create'))
      })

      expect(defaultProps.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          dueDate: '',
        })
      )
    })

    it('handles job without due date in edit mode', async () => {
      const jobWithoutDate = {
        ...mockJob,
        dueDate: undefined
      }

      await act(async () => {
        render(<JobDialog {...defaultProps} mode="edit" initialData={jobWithoutDate} />)
      })

      expect(screen.getByLabelText('Due Date')).toHaveValue('')
    })

    it('handles job without notes in edit mode', async () => {
      const jobWithoutNotes = {
        ...mockJob,
        notes: undefined
      }

      await act(async () => {
        render(<JobDialog {...defaultProps} mode="edit" initialData={jobWithoutNotes} />)
      })

      expect(screen.getByLabelText('Notes')).toHaveValue('')
    })

    it('handles job without business function in edit mode', async () => {
      const jobWithoutBF = {
        ...mockJob,
        businessFunctionId: undefined
      }

      await act(async () => {
        render(<JobDialog {...defaultProps} mode="edit" initialData={jobWithoutBF} />)
      })

      expect(screen.getByTestId('dialog')).toBeInTheDocument()
    })

    it('submits form without due date', async () => {
      const user = userEvent.setup()

      await act(async () => {
        render(<JobDialog {...defaultProps} />)
      })

      await act(async () => {
        await user.type(screen.getByLabelText('Title'), 'Job without date')
        await user.click(screen.getByText('Create'))
      })

      expect(defaultProps.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Job without date',
          dueDate: ''
        })
      )
    })

    it('submits form without notes', async () => {
      const user = userEvent.setup()

      await act(async () => {
        render(<JobDialog {...defaultProps} />)
      })

      await act(async () => {
        await user.type(screen.getByLabelText('Title'), 'Job without notes')
        await user.click(screen.getByText('Create'))
      })

      expect(defaultProps.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Job without notes',
          notes: ''
        })
      )
    })
  })
})