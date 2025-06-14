import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JobCard } from '../job-card'
import { Job } from '../table/columns'

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

jest.mock('lucide-react', () => ({
  Trash2: () => <div data-testid="trash-icon">Trash2</div>,
  PawPrint: () => <div data-testid="paw-icon">PawPrint</div>,
  Copy: () => <div data-testid="copy-icon">Copy</div>,
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}))

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  ),
}))

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: any) => <div>{children}</div>,
  AlertDialogTrigger: ({ children }: any) => <div>{children}</div>,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: any) => <button>{children}</button>,
  AlertDialogAction: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}))

jest.mock('../duplicate-job-dialog', () => ({
  DuplicateJobDialog: ({ open, sourceJob }: any) => 
    open ? <div data-testid="duplicate-dialog">Duplicate Dialog for {sourceJob.title}</div> : null
}))

describe('JobCard', () => {
  const mockJob: Job = {
    id: '1',
    title: 'Test Job Title',
    businessFunctionName: 'Engineering',
    dueDate: '2024-12-25',
    isDone: false,
    nextTaskId: 'task-1',
    tasks: ['task-1', 'task-2'],
    impact: 5,
  }

  const defaultProps = {
    job: mockJob,
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onSelect: jest.fn(),
    onOpenTasksSidebar: jest.fn(),
    isSelected: false,
    taskOwnerMap: { 'task-1': 'John Doe' },
    taskCounts: { '1': { total: 2, completed: 1 } }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('renders job title correctly', () => {
    render(<JobCard {...defaultProps} />)
    expect(screen.getByText('Test Job Title')).toBeInTheDocument()
  })

  it('displays business function name', () => {
    render(<JobCard {...defaultProps} />)
    expect(screen.getByText('Engineering')).toBeInTheDocument()
  })

  it('shows task owner name', () => {
    render(<JobCard {...defaultProps} />)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('displays task count correctly', () => {
    render(<JobCard {...defaultProps} />)
    expect(screen.getByText('1 of 2 tasks done')).toBeInTheDocument()
  })

  it('formats and displays due date', () => {
    render(<JobCard {...defaultProps} />)
    expect(screen.getByText(/Due date: Dec 25, 2024/)).toBeInTheDocument()
  })

  it('shows "Not assigned" when no task owner', () => {
    const propsWithoutOwner = {
      ...defaultProps,
      taskOwnerMap: {}
    }
    render(<JobCard {...propsWithoutOwner} />)
    expect(screen.getByText('Not assigned')).toBeInTheDocument()
  })

  it('shows "No tasks added" when no tasks', () => {
    const propsWithoutTasks = {
      ...defaultProps,
      taskCounts: { '1': { total: 0, completed: 0 } }
    }
    render(<JobCard {...propsWithoutTasks} />)
    expect(screen.getByText('No tasks added')).toBeInTheDocument()
  })

  it('calls onSelect when checkbox is clicked', async () => {
    const user = userEvent.setup()
    render(<JobCard {...defaultProps} />)
    
    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)
    
    expect(defaultProps.onSelect).toHaveBeenCalledWith('1', true)
  })

  it('hides checkbox when hideCheckbox is true', () => {
    render(<JobCard {...defaultProps} hideCheckbox={true} />)
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('calls onOpenTasksSidebar when card is clicked', async () => {
    const user = userEvent.setup()
    render(<JobCard {...defaultProps} />)
    
    const cardTitle = screen.getByText('Test Job Title')
    await user.click(cardTitle)
    
    expect(defaultProps.onOpenTasksSidebar).toHaveBeenCalledWith(mockJob)
  })

  it('opens duplicate dialog when copy button is clicked', async () => {
    const user = userEvent.setup()
    render(<JobCard {...defaultProps} />)
    
    const copyButton = screen.getByTestId('copy-icon').closest('button')
    await user.click(copyButton!)
    
    expect(screen.getByTestId('duplicate-dialog')).toBeInTheDocument()
  })

  it('shows delete confirmation dialog', async () => {
    const user = userEvent.setup()
    render(<JobCard {...defaultProps} />)
    
    const deleteButton = screen.getByTestId('trash-icon').closest('button')
    await user.click(deleteButton!)
    
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
    expect(screen.getByText(/This will permanently delete the job "Test Job Title"/)).toBeInTheDocument()
  })

  it('calls onDelete when delete is confirmed', async () => {
    const user = userEvent.setup()
    render(<JobCard {...defaultProps} />)
    
    const deleteButton = screen.getByTestId('trash-icon').closest('button')
    await user.click(deleteButton!)
    const confirmButton = screen.getByRole('button', { name: 'Delete' })
    await user.click(confirmButton)
    
    expect(defaultProps.onDelete).toHaveBeenCalledWith('1')
  })

  it('applies selected styling when isSelected is true', () => {
    const { container } = render(<JobCard {...defaultProps} isSelected={true} />)
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('ring-2', 'ring-primary')
  })

  it('handles undefined due date', () => {
    const jobWithoutDate = { ...mockJob, dueDate: undefined }
    render(<JobCard {...defaultProps} job={jobWithoutDate} />)
    expect(screen.getByText('Due date: No due date')).toBeInTheDocument()
  })

  it('handles job without business function', () => {
    const jobWithoutFunction = { ...mockJob, businessFunctionName: undefined }
    render(<JobCard {...defaultProps} job={jobWithoutFunction} />)
    expect(screen.getByText('No function')).toBeInTheDocument()
  })

  it('handles empty due date string', () => {
    const jobWithEmptyDate = { ...mockJob, dueDate: '' }
    render(<JobCard {...defaultProps} job={jobWithEmptyDate} />)
    expect(screen.getByText('Due date: No due date')).toBeInTheDocument()
  })

  it('displays task count when no taskCounts provided but job has tasks', () => {
    const propsWithoutTaskCounts = {
      ...defaultProps,
      taskCounts: undefined
    }
    render(<JobCard {...propsWithoutTaskCounts} />)
    expect(screen.getByText('0 of 2 tasks done')).toBeInTheDocument()
  })

  it('shows "No function" when businessFunctionName is empty string', () => {
    const jobWithEmptyFunction = { ...mockJob, businessFunctionName: '' }
    render(<JobCard {...defaultProps} job={jobWithEmptyFunction} />)
    expect(screen.getByText('No function')).toBeInTheDocument()
  })

  it('updates job data when fetchJobData is successful', async () => {
    const updatedJobData = {
      ...mockJob,
      title: 'Updated Job Title',
      businessFunctionName: 'Updated Engineering'
    }

    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        success: true,
        data: updatedJobData
      })
    })

    render(<JobCard {...defaultProps} />)

    const event = new CustomEvent('job-owner-update', { 
      detail: { jobId: '1' } 
    })
    window.dispatchEvent(event)
    await screen.findByText('Updated Job Title')
    expect(screen.getByText('Updated Engineering')).toBeInTheDocument()
  })

  it('handles fetch error gracefully', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('API Error'))
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    render(<JobCard {...defaultProps} />)
    
    const event = new CustomEvent('job-owner-update', { 
      detail: { jobId: '1' } 
    })
    window.dispatchEvent(event)

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(consoleSpy).toHaveBeenCalledWith('Error fetching job data:', expect.any(Error))
    expect(screen.getByText('Test Job Title')).toBeInTheDocument()
    
    consoleSpy.mockRestore()
  })

  it('handles unsuccessful API response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        success: false,
        data: null
      })
    })

    render(<JobCard {...defaultProps} />)

    const event = new CustomEvent('job-owner-update', { 
      detail: { jobId: '1' } 
    })
    window.dispatchEvent(event)

    await new Promise(resolve => setTimeout(resolve, 100))
    expect(screen.getByText('Test Job Title')).toBeInTheDocument()
  })

  it('ignores job owner update events for different job IDs', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        success: true,
        data: { ...mockJob, title: 'Should not update' }
      })
    })

    render(<JobCard {...defaultProps} />)

    const event = new CustomEvent('job-owner-update', { 
      detail: { jobId: 'different-job-id' } 
    })
    window.dispatchEvent(event)

    await new Promise(resolve => setTimeout(resolve, 100))
    expect(global.fetch).not.toHaveBeenCalled()
    expect(screen.getByText('Test Job Title')).toBeInTheDocument()
  })

  it('removes event listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')
    
    const { unmount } = render(<JobCard {...defaultProps} />)
    
    unmount()
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'job-owner-update',
      expect.any(Function)
    )
    
    removeEventListenerSpy.mockRestore()
  })

  it('generates consistent colors for business functions', () => {
    const { container } = render(<JobCard {...defaultProps} />)
    
    const functionSpan = screen.getByText('Engineering')
    expect(functionSpan).toHaveStyle('background-color: hsl(237,85%,88%)')
    expect(functionSpan).toHaveStyle('color: hsl(237,85%,30%)')
  })

  it('generates different color for different business function', () => {
    const jobWithDifferentFunction = { 
      ...mockJob, 
      businessFunctionName: 'Marketing' 
    }
    render(<JobCard {...defaultProps} job={jobWithDifferentFunction} />)
    
    const functionSpan = screen.getByText('Marketing')
    expect(functionSpan).toHaveAttribute('style')
    expect(functionSpan.style.backgroundColor).toBeTruthy()
  })
})