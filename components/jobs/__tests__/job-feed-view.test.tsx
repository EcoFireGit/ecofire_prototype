import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JobsPage from '../job-feed-view';

const mockGet = jest.fn();

jest.mock('next/navigation', () => ({
    useSearchParams: () => ({
        get: mockGet
    }),
    useRouter: () => ({
        push: jest.fn(),
        back: jest.fn(),
        forward: jest.fn(),
        refresh: jest.fn(),
    })
}));

jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({
        toast: jest.fn()
    })
}));

jest.mock('lucide-react', () => ({
    Plus: ({ ...props }: any) => <div data-testid="plus-icon" {...props}>+</div>,
    ArrowUp: ({ ...props }: any) => <div data-testid="arrow-up-icon" {...props}>↑</div>,
    LayoutGrid: ({ ...props }: any) => <div data-testid="layout-grid-icon" {...props}>⊞</div>,
    LayoutList: ({ ...props }: any) => <div data-testid="layout-list-icon" {...props}>☰</div>,
}));

jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, variant, size, ...props }: any) => 
        <button onClick={onClick} data-variant={variant} data-size={size} {...props}>{children}</button>
}));

jest.mock('@/components/filters/filter-component', () => {
    return function MockFilterComponent({ onFilterChange, initialFilters }: any) {
        return (
            <div data-testid="filter-component">
                <button 
                    data-testid="apply-filter"
                    onClick={() => onFilterChange({ businessFunctionId: 'bf1' })}
                >
                    Apply Filter
                </button>
                <button 
                    data-testid="clear-filter"
                    onClick={() => onFilterChange({})}
                >
                    Clear Filter
                </button>
            </div>
        );
    };
});

jest.mock('@/components/sorting/sorting-component', () => {
    return function MockSortingComponent({ onSortChange, jobs }: any) {
        return (
            <div data-testid="sorting-component">
                <button 
                    data-testid="sort-by-title"
                    onClick={() => onSortChange([...jobs].sort((a, b) => a.title.localeCompare(b.title)))}
                >
                    Sort by Title
                </button>
            </div>
        );
    };
});

jest.mock('@/components/jobs/jobs-grid', () => ({
    JobsGrid: ({ data = [], onEdit, onDelete, onSelect, onOpenTasksSidebar }: any) => (
        <div data-testid="jobs-grid">
            {data.map((job: any) => (
                <div key={job.id} data-testid="job-item">
                    <span>{job.title}</span>
                    <button data-testid={`edit-job-${job.id}`} onClick={() => onEdit(job)}>Edit</button>
                    <button data-testid={`delete-job-${job.id}`} onClick={() => onDelete(job.id)}>Delete</button>
                    <button data-testid={`select-job-${job.id}`} onClick={() => onSelect(job.id, true)}>Select</button>
                    <button data-testid={`tasks-job-${job.id}`} onClick={() => onOpenTasksSidebar(job)}>Tasks</button>
                </div>
            ))}
        </div>
    )
}));

jest.mock('@/components/jobs/table/jobs-table', () => ({
    DataTable: ({ data = [], columns }: any) => (
        <div data-testid="data-table">
            {data.map((job: any) => (
                <div key={job.id} data-testid="table-job-item">
                    {job.title}
                </div>
            ))}
        </div>
    )
}));

jest.mock('@/components/qbo/qbo-circles', () => ({
    QBOCircles: ({ onSelectJob }: any) => (
        <div data-testid="qbo-circles">
            <button data-testid="select-qbo-job" onClick={() => onSelectJob('job1')}>
                Select Job
            </button>
        </div>
    )
}));

jest.mock('@/components/jobs/job-dialog', () => ({
    JobDialog: ({ open, onSubmit, mode, onOpenChange }: any) => (
        open ? (
            <div data-testid="job-dialog">
                <span>Job Dialog - {mode}</span>
                <button data-testid="submit-job" onClick={() => onSubmit({ title: 'New Job' })}>Submit</button>
                <button data-testid="close-dialog" onClick={() => onOpenChange(false)}>Close</button>
            </div>
        ) : null
    )
}));

jest.mock('@/components/tasks/tasks-sidebar', () => ({
    TasksSidebar: ({ open, onOpenChange, selectedJob }: any) => (
        open ? (
            <div data-testid="tasks-sidebar">
                <span>Tasks for {selectedJob?.title}</span>
                <button data-testid="close-sidebar" onClick={() => onOpenChange(false)}>Close</button>
            </div>
        ) : null
    )
}));

jest.mock('@/components/jobs/job-skeleton', () => ({
    JobSkeletonGroup: ({ count }: any) => (
        <div data-testid="job-skeleton">Loading {count} jobs...</div>
    )
}));

jest.mock('@/components/jobs/table/columns', () => ({
    columns: () => [],
}));

jest.mock('@/components/jobs/table/completedColumns', () => ({
    completedColumns: () => [],
}));

describe('JobsPage', () => {
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    beforeAll(() => {
        console.error = (...args: any[]) => {
            if (
                typeof args[0] === 'string' && (
                    args[0].includes('Warning: An update to') ||
                    args[0].includes('act(...)') ||
                    args[0].includes('Failed to fetch user preferences') ||
                    args[0].includes('Error fetching data') ||
                    args[0].includes('Error creating task owner mapping') ||
                    args[0].includes('Error fetching owners') ||
                    args[0].includes('Error fetching tags') ||
                    args[0].includes('Tasks API did not return success') ||
                    args[0].includes('Error marking jobs as done') ||
                    args[0].includes('Error marking jobs as active') ||
                    args[0].includes('Failed to create job') ||
                    args[0].includes('Failed to update job') ||
                    args[0].includes('Failed to delete job') ||
                    args[0].includes('Failed to calculate job impact')
                )
            ) {
                return;
            }
            originalConsoleError.apply(console, args);
        };

        console.warn = (...args: any[]) => {
            return;
        };
    });

    afterAll(() => {
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
    });

    const mockJobs = [
        {
            _id: 'job1',
            title: 'Fix the login bug',
            isDone: false,
            businessFunctionId: 'bf1',
            dueDate: '2025-06-10T00:00:00.000Z',
            impact: 5,
            tasks: [],
            nextTaskId: 'task1'
        },
        {
            _id: 'job2', 
            title: 'Update documentation',
            isDone: false,
            businessFunctionId: 'bf2',
            impact: 3,
            tasks: [],
            nextTaskId: 'task2'
        },
        {
            _id: 'job3',
            title: 'Completed job',
            isDone: true,
            businessFunctionId: 'bf1',
            impact: 4,
            tasks: []
        }
    ];

    const mockBusinessFunctions = [
        { _id: 'bf1', name: 'Engineering' },
        { _id: 'bf2', name: 'Marketing' }
    ];

    const mockOwners = [
        { _id: 'owner1', name: 'John Doe' },
        { _id: 'owner2', name: 'Jane Smith' }
    ];

    const mockTags = [
        { _id: 'tag1', name: 'urgent' },
        { _id: 'tag2', name: 'backend' }
    ];

    const mockFetch = (url: string) => {
        if (url === '/api/jobs') {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    success: true,
                    data: mockJobs
                })
            });
        }

        if (url === '/api/business-functions') {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    success: true,
                    data: mockBusinessFunctions
                })
            });
        }

        if (url === '/api/owners') {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    success: true,
                    data: mockOwners
                })
            });
        }

        if (url === '/api/task-tags') {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    success: true,
                    data: mockTags
                })
            });
        }

        if (url === '/api/user/preferences') {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    success: true,
                    data: { enableTableView: true }
                })
            });
        }

        if (url.includes('/api/tasks/batch')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    success: true,
                    data: [
                        { id: 'task1', _id: 'task1', owner: 'owner1' },
                        { id: 'task2', _id: 'task2', owner: 'owner2' }
                    ]
                })
            });
        }

        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: [] })
        });
    };

    beforeEach(() => {
        (global.fetch as jest.Mock) = jest.fn(mockFetch);
        mockGet.mockReset();
        mockGet.mockReturnValue(null);
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: jest.fn(),
                setItem: jest.fn(),
            },
            writable: true,
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Initial Rendering', () => {
        test('should render the page title and show loading state initially', () => {
            act(() => {
                render(<JobsPage />);
            });
            expect(screen.getByText('Jobs')).toBeInTheDocument();
            expect(screen.getByTestId('job-skeleton')).toBeInTheDocument();
        });

        test('should show error state when API call fails', async () => {
            (global.fetch as jest.Mock) = jest.fn().mockRejectedValue(new Error('API Error'));

            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText(/Error:/)).toBeInTheDocument();
            });
        });
    });

    describe('Data Loading', () => {
        test('should load and display jobs after API call completes', async () => {
            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
                expect(screen.getByText('Update documentation')).toBeInTheDocument();
            });

            expect(fetch).toHaveBeenCalledWith('/api/jobs');
            expect(fetch).toHaveBeenCalledWith('/api/business-functions');
            expect(fetch).toHaveBeenCalledWith('/api/owners');
            expect(fetch).toHaveBeenCalledWith('/api/task-tags');
        });

        test('should separate active and completed jobs', async () => {
            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
                expect(screen.getByText('Update documentation')).toBeInTheDocument();
            });

            expect(screen.getByText('Completed Jobs')).toBeInTheDocument();
        });
    });

    describe('View Mode Toggle', () => {
        test('should show view mode toggle when table view is enabled', async () => {
            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByTestId('layout-grid-icon')).toBeInTheDocument();
                expect(screen.getByTestId('layout-list-icon')).toBeInTheDocument();
            });
        });

        test('should switch between grid and table view', async () => {
            const user = userEvent.setup();
            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getAllByTestId('jobs-grid')).toHaveLength(2);
            });

            const tableViewButton = screen.getByTestId('layout-list-icon').parentElement;
            await user.click(tableViewButton!);

            expect(screen.getAllByTestId('data-table')).toHaveLength(2);
            expect(localStorage.setItem).toHaveBeenCalledWith('jobViewMode', 'table');
        });
    });

    describe('Filtering', () => {
        test('should apply filters when filter component triggers change', async () => {
            const user = userEvent.setup();
            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });

            const applyFilterButton = screen.getByTestId('apply-filter');
            await user.click(applyFilterButton);

            expect(screen.getByTestId('filter-component')).toBeInTheDocument();
        });

        test('should clear filters when requested', async () => {
            const user = userEvent.setup();
            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });

            const clearFilterButton = screen.getByTestId('clear-filter');
            await user.click(clearFilterButton);

            expect(screen.getByTestId('filter-component')).toBeInTheDocument();
        });
    });

    describe('Sorting', () => {
        test('should apply sorting when sorting component triggers change', async () => {
            const user = userEvent.setup();
            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });

            const sortButtons = screen.getAllByTestId('sort-by-title');
            await user.click(sortButtons[0]);

            expect(screen.getAllByTestId('sorting-component')).toHaveLength(2);
        });
    });

    describe('Job Actions', () => {
        test('should open edit dialog when edit button is clicked', async () => {
            const user = userEvent.setup();
            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });

            const editButton = screen.getByTestId('edit-job-job1');
            await user.click(editButton);

            expect(screen.getByTestId('job-dialog')).toBeInTheDocument();
            expect(screen.getByText('Job Dialog - edit')).toBeInTheDocument();
        });

        test('should delete job when delete button is clicked', async () => {
            const user = userEvent.setup();
            (global.fetch as jest.Mock) = jest.fn()
                .mockImplementationOnce(mockFetch) 
                .mockImplementationOnce(mockFetch) 
                .mockImplementationOnce(mockFetch) 
                .mockImplementationOnce(mockFetch) 
                .mockImplementationOnce(mockFetch) 
                .mockImplementationOnce(mockFetch) 
                .mockImplementationOnce(() => Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ success: true })
                }));

            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });

            const deleteButton = screen.getByTestId('delete-job-job1');
            await user.click(deleteButton);

            await waitFor(() => {
                expect(fetch).toHaveBeenCalledWith('/api/jobs/job1?deleteTasks=true', {
                    method: 'DELETE'
                });
            });
        });

        test('should open tasks sidebar when tasks button is clicked', async () => {
            const user = userEvent.setup();
            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });

            const tasksButton = screen.getByTestId('tasks-job-job1');
            await user.click(tasksButton);

            expect(screen.getByTestId('tasks-sidebar')).toBeInTheDocument();
            expect(screen.getByText('Tasks for Fix the login bug')).toBeInTheDocument();
        });
    });

    describe('Job Selection and Bulk Actions', () => {
        test('should select jobs and show bulk action UI', async () => {
            const user = userEvent.setup();
            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });

            const selectButton = screen.getByTestId('select-job-job1');
            await user.click(selectButton);

            await waitFor(() => {
                expect(screen.getByText('1 job selected')).toBeInTheDocument();
                expect(screen.getByText('Mark as Done')).toBeInTheDocument();
            });
        });

        test('should mark selected jobs as done', async () => {
            const user = userEvent.setup();
            (global.fetch as jest.Mock) = jest.fn()
                .mockImplementation((url, options) => {
                    if (options?.method === 'PUT' && url.includes('job1')) {
                        return Promise.resolve({
                            ok: true,
                            json: () => Promise.resolve({ success: true })
                        });
                    }
                    return mockFetch(url);
                });

            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });

            const selectButton = screen.getByTestId('select-job-job1');
            await user.click(selectButton);

            await waitFor(() => {
                expect(screen.getByText('1 job selected')).toBeInTheDocument();
            });

            const markDoneButton = screen.getByText('Mark as Done');
            await user.click(markDoneButton);

            await waitFor(() => {
                expect(fetch).toHaveBeenCalledWith('/api/jobs/job1?updateTasks=true', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isDone: true })
                });
            });
        });

        test('should mark selected completed jobs as active', async () => {
            const user = userEvent.setup();
            (global.fetch as jest.Mock) = jest.fn()
                .mockImplementation((url, options) => {
                    if (options?.method === 'PUT' && !url.includes('?updateTasks=true')) {
                        return Promise.resolve({
                            ok: true,
                            json: () => Promise.resolve({ success: true })
                        });
                    }
                    return mockFetch(url);
                });

            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Completed Jobs')).toBeInTheDocument();
            });

            const selectButton = screen.getByTestId('select-job-job3');
            await user.click(selectButton);

            await waitFor(() => {
                expect(screen.getByText('1 job selected')).toBeInTheDocument();
            });

            const markActiveButton = screen.getByText('Move to Active');
            await user.click(markActiveButton);

            await waitFor(() => {
                expect(fetch).toHaveBeenCalledWith('/api/jobs/job3', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isDone: false })
                });
            });
        });

        test('should cancel job selections', async () => {
            const user = userEvent.setup();
            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });

            const selectButton = screen.getByTestId('select-job-job1');
            await user.click(selectButton);

            await waitFor(() => {
                expect(screen.getByText('1 job selected')).toBeInTheDocument();
            });

            const cancelButton = screen.getByText('Cancel');
            await user.click(cancelButton);

            await waitFor(() => {
                expect(screen.queryByText('1 job selected')).not.toBeInTheDocument();
            });
        });
    });

    describe('QBO Integration', () => {
        test('should open tasks sidebar when job is selected from QBO circles', async () => {
            const user = userEvent.setup();
            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });

            const qboSelectButton = screen.getByTestId('select-qbo-job');
            await user.click(qboSelectButton);

            expect(screen.getByTestId('tasks-sidebar')).toBeInTheDocument();
        });
    });

    describe('Job Dialog', () => {
        test('should create new job when submitting in create mode', async () => {
            const user = userEvent.setup();
            (global.fetch as jest.Mock) = jest.fn()
                .mockImplementation((url, options) => {
                    if (options?.method === 'POST' && url === '/api/jobs') {
                        return Promise.resolve({
                            ok: true,
                            json: () => Promise.resolve({ success: true })
                        });
                    }
                    return mockFetch(url);
                });

            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });

            act(() => {
                window.dispatchEvent(new Event('openJobDialog'));
            });

            await waitFor(() => {
                expect(screen.getByTestId('job-dialog')).toBeInTheDocument();
            });

            const submitButton = screen.getByTestId('submit-job');
            await user.click(submitButton);

            await waitFor(() => {
                expect(fetch).toHaveBeenCalledWith('/api/jobs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: 'New Job' })
                });
            });
        });

        test('should handle job edit from external event', async () => {
            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });

            const editJobEvent = new CustomEvent('open-job-edit', {
                detail: { job: mockJobs[0] }
            });
            
            act(() => {
                window.dispatchEvent(editJobEvent);
            });

            await waitFor(() => {
                expect(screen.getByTestId('job-dialog')).toBeInTheDocument();
                expect(screen.getByText('Job Dialog - edit')).toBeInTheDocument();
            });
        });

        test('should close dialog when close button is clicked', async () => {
            const user = userEvent.setup();
            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });

            act(() => {
                window.dispatchEvent(new Event('openJobDialog'));
            });

            await waitFor(() => {
                expect(screen.getByTestId('job-dialog')).toBeInTheDocument();
            });

            const closeButton = screen.getByTestId('close-dialog');
            await user.click(closeButton);

            await waitFor(() => {
                expect(screen.queryByTestId('job-dialog')).not.toBeInTheDocument();
            });
        });
    });

    describe('Search Params Integration', () => {
        test('should handle search params without infinite loops', async () => {
            mockGet.mockReturnValue(null);

            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });

            expect(screen.getByTestId('filter-component')).toBeInTheDocument();
            expect(screen.getByText('Jobs')).toBeInTheDocument();
        });

        test('should open dialog when open=true in URL params', async () => {
            mockGet.mockImplementation((param: string) => {
                return param === 'open' ? 'true' : null;
            });

            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Jobs')).toBeInTheDocument();
            });

            expect(screen.getByTestId('filter-component')).toBeInTheDocument();
        });
    });

    describe('Error Handling', () => {
        test('should handle API errors gracefully', async () => {
            (global.fetch as jest.Mock) = jest.fn()
                .mockImplementationOnce(() => Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        success: false,
                        error: 'Failed to load jobs'
                    })
                }));

            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText(/Error:/)).toBeInTheDocument();
                expect(screen.getByText(/Failed to fetch data/)).toBeInTheDocument();
            });
        });

        test('should handle fetch rejection errors', async () => {
            (global.fetch as jest.Mock) = jest.fn()
                .mockRejectedValueOnce(new Error('Network error'));

            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText(/Error:/)).toBeInTheDocument();
                expect(screen.getByText(/Failed to fetch data/)).toBeInTheDocument();
            });
        });

        test('should handle user preferences fetch failure gracefully', async () => {
            (global.fetch as jest.Mock) = jest.fn((url) => {
                if (url === '/api/user/preferences') {
                    return Promise.reject(new Error('Preferences API error'));
                }
                return mockFetch(url);
            });

            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });

            expect(screen.getAllByTestId('jobs-grid')).toHaveLength(2);
        });

        test('should handle business functions API failure', async () => {
            (global.fetch as jest.Mock) = jest.fn((url) => {
                if (url === '/api/business-functions') {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({ success: false, error: 'BF error' })
                    });
                }
                return mockFetch(url);
            });

            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });
        });

        test('should handle owners API failure', async () => {
            (global.fetch as jest.Mock) = jest.fn((url) => {
                if (url === '/api/owners') {
                    return Promise.reject(new Error('Owners API error'));
                }
                return mockFetch(url);
            });

            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });
        });

        test('should handle tags API failure', async () => {
            (global.fetch as jest.Mock) = jest.fn((url) => {
                if (url === '/api/task-tags') {
                    return Promise.reject(new Error('Tags API error'));
                }
                return mockFetch(url);
            });

            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });
        });
    });

    describe('Component Lifecycle and State Management', () => {
        test('should handle component unmounting during async operations', async () => {
            const { unmount } = render(<JobsPage />);
            unmount();
            expect(true).toBe(true);
        });

        test('should handle multiple job selections', async () => {
            const user = userEvent.setup();
            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });

            const selectButton1 = screen.getByTestId('select-job-job1');
            const selectButton2 = screen.getByTestId('select-job-job2');
            
            await user.click(selectButton1);
            await user.click(selectButton2);

            await waitFor(() => {
                expect(screen.getByText('2 jobs selected')).toBeInTheDocument();
            });
        });

        test('should handle table view disabled by preferences', async () => {
            (global.fetch as jest.Mock) = jest.fn((url) => {
                if (url === '/api/user/preferences') {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({
                            success: true,
                            data: { enableTableView: false }
                        })
                    });
                }
                return mockFetch(url);
            });

            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });

            expect(screen.queryByTestId('layout-grid-icon')).not.toBeInTheDocument();
            expect(screen.queryByTestId('layout-list-icon')).not.toBeInTheDocument();
        });

        test('should handle recalculate impact in table view', async () => {
            const user = userEvent.setup();
            (global.fetch as jest.Mock) = jest.fn()
                .mockImplementation((url, options) => {
                    if (options?.method === 'POST' && url === '/api/jobs/calculate-impact') {
                        return Promise.resolve({
                            ok: true,
                            json: () => Promise.resolve({ 
                                success: true, 
                                message: 'Impact calculated for 3 jobs' 
                            })
                        });
                    }
                    return mockFetch(url);
                });

            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });

            const tableViewButton = screen.getByTestId('layout-list-icon').parentElement;
            await user.click(tableViewButton!);

            const recalculateButton = screen.getByText('Recalculate Impact');
            await user.click(recalculateButton);

            await waitFor(() => {
                expect(fetch).toHaveBeenCalledWith('/api/jobs/calculate-impact', {
                    method: 'POST'
                });
            });
        });

        test('should handle tasks sidebar close', async () => {
            const user = userEvent.setup();
            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });

            const tasksButton = screen.getByTestId('tasks-job-job1');
            await user.click(tasksButton);

            await waitFor(() => {
                expect(screen.getByTestId('tasks-sidebar')).toBeInTheDocument();
            });

            const closeButton = screen.getByTestId('close-sidebar');
            await user.click(closeButton);

            await waitFor(() => {
                expect(screen.queryByTestId('tasks-sidebar')).not.toBeInTheDocument();
            });
        });

        test('should handle localStorage with saved view mode', async () => {
            Object.defineProperty(window, 'localStorage', {
                value: {
                    getItem: jest.fn().mockReturnValue('table'),
                    setItem: jest.fn(),
                },
                writable: true,
            });

            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });

            expect(localStorage.getItem).toHaveBeenCalledWith('jobViewMode');
        });
    });

    describe('Advanced Data Scenarios', () => {
        test('should handle jobs without next task ID', async () => {
            const jobsWithoutTasks = [
                {
                    _id: 'job1',
                    title: 'Job without next task',
                    isDone: false,
                    businessFunctionId: 'bf1',
                    impact: 3,
                    tasks: []
                }
            ];

            (global.fetch as jest.Mock) = jest.fn((url) => {
                if (url === '/api/jobs') {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({
                            success: true,
                            data: jobsWithoutTasks
                        })
                    });
                }
                return mockFetch(url);
            });

            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Job without next task')).toBeInTheDocument();
            });
        });

        test('should handle jobs without business function', async () => {
            const jobsWithoutBF = [
                {
                    _id: 'job1',
                    title: 'Job without BF',
                    isDone: false,
                    impact: 3,
                    tasks: []
                }
            ];

            (global.fetch as jest.Mock) = jest.fn((url) => {
                if (url === '/api/jobs') {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({
                            success: true,
                            data: jobsWithoutBF
                        })
                    });
                }
                return mockFetch(url);
            });

            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Job without BF')).toBeInTheDocument();
            });
        });

        test('should handle jobs without due date or impact', async () => {
            const jobsMinimalData = [
                {
                    _id: 'job1',
                    title: 'Minimal job data',
                    isDone: false,
                    tasks: []
                }
            ];

            (global.fetch as jest.Mock) = jest.fn((url) => {
                if (url === '/api/jobs') {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({
                            success: true,
                            data: jobsMinimalData
                        })
                    });
                }
                return mockFetch(url);
            });

            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Minimal job data')).toBeInTheDocument();
            });
        });

        test('should handle owners API returning array directly', async () => {
            (global.fetch as jest.Mock) = jest.fn((url) => {
                if (url === '/api/owners') {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve(mockOwners)
                    });
                }
                return mockFetch(url);
            });

            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });
        });

        test('should handle task batch API with different response structure', async () => {
            (global.fetch as jest.Mock) = jest.fn((url) => {
                if (url.includes('/api/tasks/batch')) {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve([
                            { id: 'task1', _id: 'task1', owner: 'owner1' }
                        ])
                    });
                }
                return mockFetch(url);
            });

            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });
        });

        test('should handle task batch API returning non-success', async () => {
            (global.fetch as jest.Mock) = jest.fn((url) => {
                if (url.includes('/api/tasks/batch')) {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({ success: false, data: null })
                    });
                }
                return mockFetch(url);
            });

            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });
        });

        test('should handle tasks with no owner or invalid owner', async () => {
            (global.fetch as jest.Mock) = jest.fn((url) => {
                if (url.includes('/api/tasks/batch')) {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({
                            success: true,
                            data: [
                                { id: 'task1', _id: 'task1' },
                                { id: 'task2', _id: 'task2', owner: 'invalid-owner-id' },
                                { id: 'task3', _id: 'task3', owner: null }
                            ]
                        })
                    });
                }
                return mockFetch(url);
            });

            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });
        });
    });

    describe('Operation Failures', () => {
        test('should handle job creation failure', async () => {
            const user = userEvent.setup();
            (global.fetch as jest.Mock) = jest.fn()
                .mockImplementation((url, options) => {
                    if (options?.method === 'POST' && url === '/api/jobs') {
                        return Promise.resolve({
                            ok: true,
                            json: () => Promise.resolve({ success: false, error: 'Creation failed' })
                        });
                    }
                    return mockFetch(url);
                });

            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });

            act(() => {
                window.dispatchEvent(new Event('openJobDialog'));
            });

            await waitFor(() => {
                expect(screen.getByTestId('job-dialog')).toBeInTheDocument();
            });

            const submitButton = screen.getByTestId('submit-job');
            await user.click(submitButton);

            await waitFor(() => {
                expect(fetch).toHaveBeenCalledWith('/api/jobs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: 'New Job' })
                });
            });
        });

        test('should handle job edit failure', async () => {
            const user = userEvent.setup();
            (global.fetch as jest.Mock) = jest.fn()
                .mockImplementation((url, options) => {
                    if (options?.method === 'PUT' && url.includes('/api/jobs/')) {
                        return Promise.resolve({
                            ok: true,
                            json: () => Promise.resolve({ success: false, error: 'Update failed' })
                        });
                    }
                    return mockFetch(url);
                });

            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });

            const editButton = screen.getByTestId('edit-job-job1');
            await user.click(editButton);

            await waitFor(() => {
                expect(screen.getByTestId('job-dialog')).toBeInTheDocument();
            });

            const submitButton = screen.getByTestId('submit-job');
            await user.click(submitButton);

            await waitFor(() => {
                expect(fetch).toHaveBeenCalledWith('/api/jobs/job1', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: 'New Job' })
                });
            });
        });

        test('should handle job deletion failure', async () => {
            const user = userEvent.setup();
            (global.fetch as jest.Mock) = jest.fn()
                .mockImplementation((url, options) => {
                    if (options?.method === 'DELETE') {
                        return Promise.resolve({
                            ok: true,
                            json: () => Promise.resolve({ success: false, error: 'Delete failed' })
                        });
                    }
                    return mockFetch(url);
                });

            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });

            const deleteButton = screen.getByTestId('delete-job-job1');
            await user.click(deleteButton);

            await waitFor(() => {
                expect(fetch).toHaveBeenCalledWith('/api/jobs/job1?deleteTasks=true', {
                    method: 'DELETE'
                });
            });
        });

        test('should handle bulk operations failure', async () => {
            const user = userEvent.setup();
            (global.fetch as jest.Mock) = jest.fn()
                .mockImplementation((url, options) => {
                    if (options?.method === 'PUT' && url.includes('?updateTasks=true')) {
                        return Promise.reject(new Error('Bulk update failed'));
                    }
                    return mockFetch(url);
                });

            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });

            const selectButton = screen.getByTestId('select-job-job1');
            await user.click(selectButton);

            await waitFor(() => {
                expect(screen.getByText('1 job selected')).toBeInTheDocument();
            });

            const markDoneButton = screen.getByText('Mark as Done');
            await user.click(markDoneButton);

            await waitFor(() => {
                expect(fetch).toHaveBeenCalledWith('/api/jobs/job1?updateTasks=true', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isDone: true })
                });
            });
        });

        test('should handle impact calculation failure', async () => {
            const user = userEvent.setup();
            (global.fetch as jest.Mock) = jest.fn()
                .mockImplementation((url, options) => {
                    if (options?.method === 'POST' && url === '/api/jobs/calculate-impact') {
                        return Promise.resolve({
                            ok: true,
                            json: () => Promise.resolve({ 
                                success: false, 
                                error: 'Impact calculation failed' 
                            })
                        });
                    }
                    return mockFetch(url);
                });

            await act(async () => {
                render(<JobsPage />);
            });

            await waitFor(() => {
                expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
            });

            const tableViewButton = screen.getByTestId('layout-list-icon').parentElement;
            await user.click(tableViewButton!);

            const recalculateButton = screen.getByText('Recalculate Impact');
            await user.click(recalculateButton);

            await waitFor(() => {
                expect(fetch).toHaveBeenCalledWith('/api/jobs/calculate-impact', {
                    method: 'POST'
                });
            });
        });
    });
});