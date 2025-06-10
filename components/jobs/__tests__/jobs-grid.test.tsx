import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { JobsGrid } from '@/components/jobs/jobs-grid';
import { Job } from '@/components/jobs/table/columns';

jest.mock('@/components/jobs/job-card', () => ({
  JobCard: ({ job, onEdit, onDelete, onSelect, onOpenTasksSidebar, isSelected, taskOwnerMap, taskCounts }: any) => (
    <div data-testid={`job-card-${job.id}`}>
      <span data-testid="job-title">{job.title}</span>
      <span data-testid="job-selected">{isSelected ? 'selected' : 'not-selected'}</span>
      <button onClick={() => onEdit(job)} data-testid="edit-button">Edit</button>
      <button onClick={() => onDelete(job.id)} data-testid="delete-button">Delete</button>
      <button onClick={() => onSelect(job.id, !isSelected)} data-testid="select-button">Select</button>
      <button onClick={() => onOpenTasksSidebar(job)} data-testid="tasks-button">Tasks</button>
      <span data-testid="task-counts">{JSON.stringify(taskCounts[job.id] || {})}</span>
      <span data-testid="task-owner">{taskOwnerMap?.[job.id] || 'no-owner'}</span>
    </div>
  )
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockJob1: Job = {
  id: '1',
  title: 'Test Job 1',
  dueDate: '2024-12-31',
  isDone: false
};

const mockJob2: Job = {
  id: '2',
  title: 'Test Job 2',
  dueDate: '2024-11-30',
  isDone: true
};

const mockJobs = [mockJob1, mockJob2];

const mockHandlers = {
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  onSelect: jest.fn(),
  onOpenTasksSidebar: jest.fn()
};

describe('JobsGrid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders without crashing', async () => {
      await act(async () => {
        render(
          <JobsGrid
            data={[]}
            selectedJobs={new Set()}
            {...mockHandlers}
          />
        );
      });
      
      expect(screen.getByText('No jobs found.')).toBeInTheDocument();
    });

    it('renders empty state when no jobs provided', async () => {
      await act(async () => {
        render(
          <JobsGrid
            data={[]}
            selectedJobs={new Set()}
            {...mockHandlers}
          />
        );
      });
      
      const emptyState = screen.getByText('No jobs found.');
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveClass('p-8', 'text-center', 'text-gray-500', 'border', 'rounded-md');
    });

    it('has correct grid layout classes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} })
      });

      let container: HTMLElement;
      await act(async () => {
        const result = render(
          <JobsGrid
            data={mockJobs}
            selectedJobs={new Set()}
            {...mockHandlers}
          />
        );
        container = result.container;
      });
      
      await waitFor(() => {
        const gridContainer = container!.querySelector('.w-full.grid.grid-cols-1.gap-6');
        expect(gridContainer).toBeInTheDocument();
      });
    });
  });

  describe('Job Rendering', () => {
    it('renders job cards for provided jobs', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            '1': { total: 5, completed: 2 },
            '2': { total: 3, completed: 1 }
          }
        })
      });

      await act(async () => {
        render(
          <JobsGrid
            data={mockJobs}
            selectedJobs={new Set()}
            {...mockHandlers}
          />
        );
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('job-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('job-card-2')).toBeInTheDocument();
      });
    });

    it('passes correct props to JobCard components', async () => {
      const selectedJobs = new Set(['1']);
      const taskOwnerMap = { '1': 'John Doe', '2': 'Jane Smith' };
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            '1': { total: 5, completed: 2 }
          }
        })
      });

      await act(async () => {
        render(
          <JobsGrid
            data={mockJobs}
            selectedJobs={selectedJobs}
            taskOwnerMap={taskOwnerMap}
            {...mockHandlers}
          />
        );
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('job-card-1')).toHaveTextContent('selected');
        expect(screen.getByTestId('job-card-2')).toHaveTextContent('not-selected');
        
        expect(screen.getByTestId('job-card-1')).toHaveTextContent('John Doe');
        expect(screen.getByTestId('job-card-2')).toHaveTextContent('Jane Smith');
      });
    });

    it('renders jobs with full width styling', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} })
      });

      await act(async () => {
        render(
          <JobsGrid
            data={mockJobs}
            selectedJobs={new Set()}
            {...mockHandlers}
          />
        );
      });
      
      await waitFor(() => {
        const jobContainers = screen.getAllByText('Test Job', { exact: false }).map(
          (element) => element.closest('div[style*="width: 100%"]')
        );
        
        expect(jobContainers).toHaveLength(2);
        jobContainers.forEach(container => {
          expect(container).toHaveStyle('width: 100%');
        });
      });
    });
  });

  describe('API Integration', () => {
    it('fetches task counts on component mount', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            '1': { total: 5, completed: 2 },
            '2': { total: 3, completed: 1 }
          }
        })
      });

      await act(async () => {
        render(
          <JobsGrid
            data={mockJobs}
            selectedJobs={new Set()}
            {...mockHandlers}
          />
        );
      });
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/jobs/progress?ids=1&ids=2');
      });
    });

    it('handles API response and updates task counts', async () => {
      const mockTaskCounts = {
        '1': { total: 5, completed: 2 },
        '2': { total: 3, completed: 1 }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockTaskCounts
        })
      });

      await act(async () => {
        render(
          <JobsGrid
            data={mockJobs}
            selectedJobs={new Set()}
            {...mockHandlers}
          />
        );
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('job-card-1')).toHaveTextContent(
          JSON.stringify(mockTaskCounts['1'])
        );
        expect(screen.getByTestId('job-card-2')).toHaveTextContent(
          JSON.stringify(mockTaskCounts['2'])
        );
      });
    });

    it('handles API errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));

      await act(async () => {
        render(
          <JobsGrid
            data={mockJobs}
            selectedJobs={new Set()}
            {...mockHandlers}
          />
        );
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('job-card-1')).toBeInTheDocument();
      });
    });

    it('handles unsuccessful API response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({})
      });

      await act(async () => {
        render(
          <JobsGrid
            data={mockJobs}
            selectedJobs={new Set()}
            {...mockHandlers}
          />
        );
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('job-card-1')).toBeInTheDocument();
      });
    });

    it('does not fetch when no jobs provided', async () => {
      await act(async () => {
        render(
          <JobsGrid
            data={[]}
            selectedJobs={new Set()}
            {...mockHandlers}
          />
        );
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('refetches task counts when data changes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} })
      });

      let rerender: any;
      await act(async () => {
        const result = render(
          <JobsGrid
            data={[mockJob1]}
            selectedJobs={new Set()}
            {...mockHandlers}
          />
        );
        rerender = result.rerender;
      });
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/jobs/progress?ids=1');
      });
      
      mockFetch.mockClear();
      
      await act(async () => {
        rerender(
          <JobsGrid
            data={mockJobs}
            selectedJobs={new Set()}
            {...mockHandlers}
          />
        );
      });
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/jobs/progress?ids=1&ids=2');
      });
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} })
      });
    });

    it('handles edit action', async () => {
      await act(async () => {
        render(
          <JobsGrid
            data={mockJobs}
            selectedJobs={new Set()}
            {...mockHandlers}
          />
        );
      });
      
      await waitFor(() => {
        fireEvent.click(screen.getAllByTestId('edit-button')[0]);
        expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockJob1);
      });
    });

    it('handles delete action', async () => {
      await act(async () => {
        render(
          <JobsGrid
            data={mockJobs}
            selectedJobs={new Set()}
            {...mockHandlers}
          />
        );
      });
      
      await waitFor(() => {
        fireEvent.click(screen.getAllByTestId('delete-button')[0]);
        expect(mockHandlers.onDelete).toHaveBeenCalledWith('1');
      });
    });

    it('handles select action', async () => {
      await act(async () => {
        render(
          <JobsGrid
            data={mockJobs}
            selectedJobs={new Set()}
            {...mockHandlers}
          />
        );
      });
      
      await waitFor(() => {
        fireEvent.click(screen.getAllByTestId('select-button')[0]);
        expect(mockHandlers.onSelect).toHaveBeenCalledWith('1', true);
      });
    });

    it('handles tasks sidebar action', async () => {
      await act(async () => {
        render(
          <JobsGrid
            data={mockJobs}
            selectedJobs={new Set()}
            {...mockHandlers}
          />
        );
      });
      
      await waitFor(() => {
        fireEvent.click(screen.getAllByTestId('tasks-button')[0]);
        expect(mockHandlers.onOpenTasksSidebar).toHaveBeenCalledWith(mockJob1);
      });
    });
  });

  describe('Loading State', () => {
    it('sets loading state during API call', async () => {
      let resolvePromise: (value: any) => void;
      const fetchPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      
      mockFetch.mockReturnValue(fetchPromise);
      
      await act(async () => {
        render(
          <JobsGrid
            data={mockJobs}
            selectedJobs={new Set()}
            {...mockHandlers}
          />
        );
      });
      
      expect(screen.getByTestId('job-card-1')).toBeInTheDocument();
      
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: () => Promise.resolve({ success: true, data: {} })
        });
      });
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles jobs with missing task counts', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            '1': { total: 5, completed: 2 }
          }
        })
      });

      await act(async () => {
        render(
          <JobsGrid
            data={mockJobs}
            selectedJobs={new Set()}
            {...mockHandlers}
          />
        );
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('job-card-1')).toHaveTextContent(
          JSON.stringify({ total: 5, completed: 2 })
        );
        expect(screen.getByTestId('job-card-2')).toHaveTextContent('{}');
      });
    });

    it('handles large number of jobs', async () => {
      const manyJobs = Array.from({ length: 100 }, (_, i) => ({
        ...mockJob1,
        id: `job-${i}`,
        title: `Job ${i}`
      }));

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} })
      });

      await act(async () => {
        render(
          <JobsGrid
            data={manyJobs}
            selectedJobs={new Set()}
            {...mockHandlers}
          />
        );
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('job-card-job-0')).toBeInTheDocument();
        expect(screen.getByTestId('job-card-job-99')).toBeInTheDocument();
      });
      
      const expectedQuery = manyJobs.map(job => `ids=${job.id}`).join('&');
      expect(mockFetch).toHaveBeenCalledWith(`/api/jobs/progress?${expectedQuery}`);
    });
  });
});

describe('JobsGrid Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders consistently across multiple renders', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: {} })
    });

    let container1: HTMLElement, container2: HTMLElement;
    
    await act(async () => {
      const result1 = render(<JobsGrid data={[]} selectedJobs={new Set()} {...mockHandlers} />);
      container1 = result1.container;
    });
    
    await act(async () => {
      const result2 = render(<JobsGrid data={[]} selectedJobs={new Set()} {...mockHandlers} />);
      container2 = result2.container;
    });
    
    expect(container1!.innerHTML).toBe(container2!.innerHTML);
  });

  it('works with React.Fragment wrapper', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: {} })
    });

    let container: HTMLElement;
    await act(async () => {
      const result = render(
        <>
          <JobsGrid data={[mockJob1]} selectedJobs={new Set()} {...mockHandlers} />
          <JobsGrid data={[mockJob2]} selectedJobs={new Set()} {...mockHandlers} />
        </>
      );
      container = result.container;
    });
    
    await waitFor(() => {
      const gridContainers = container!.querySelectorAll('.w-full.grid.grid-cols-1.gap-6');
      expect(gridContainers).toHaveLength(2);
    });
  });
});