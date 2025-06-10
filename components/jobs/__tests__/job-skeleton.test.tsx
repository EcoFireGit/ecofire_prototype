import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { JobSkeleton, JobSkeletonGroup } from '@/components/jobs/job-skeleton';

describe('JobSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<JobSkeleton />);
    
    const mainContainer = container.querySelector('.bg-gray-50.rounded-md.border.border-gray-200.p-4.mb-4.animate-pulse');
    expect(mainContainer).toBeInTheDocument();
  });

  it('has the correct CSS classes for styling', () => {
    const { container } = render(<JobSkeleton />);
    const mainDiv = container.firstChild as HTMLElement;
    
    expect(mainDiv).toHaveClass('bg-gray-50');
    expect(mainDiv).toHaveClass('rounded-md');
    expect(mainDiv).toHaveClass('border');
    expect(mainDiv).toHaveClass('border-gray-200');
    expect(mainDiv).toHaveClass('p-4');
    expect(mainDiv).toHaveClass('mb-4');
    expect(mainDiv).toHaveClass('animate-pulse');
  });

  it('renders all skeleton elements', () => {
    const { container } = render(<JobSkeleton />);
    
    const checkboxSkeleton = container.querySelector('.w-5.h-5');
    expect(checkboxSkeleton).toBeInTheDocument();
    expect(checkboxSkeleton).toHaveClass('rounded', 'bg-gray-200');
    
    const labelSkeletons = container.querySelectorAll('.h-4.w-24.bg-gray-200.rounded');
    expect(labelSkeletons).toHaveLength(2);
    
    const titleSkeleton = container.querySelector('.h-6.w-48.bg-gray-300.rounded');
    expect(titleSkeleton).toBeInTheDocument();
    
    const taskSkeleton = container.querySelector('.h-4.w-32.bg-gray-200.rounded');
    const dateSkeleton = container.querySelector('.h-4.w-40.bg-gray-200.rounded');
    expect(taskSkeleton).toBeInTheDocument();
    expect(dateSkeleton).toBeInTheDocument();
    
    const actionButtons = container.querySelectorAll('.w-8.h-8.rounded.bg-gray-200');
    expect(actionButtons).toHaveLength(3);
  });

  it('has proper layout structure', () => {
    const { container } = render(<JobSkeleton />);
    const flexContainer = container.querySelector('.flex.items-start.gap-4');
    expect(flexContainer).toBeInTheDocument();
    
    const contentArea = container.querySelector('.flex-1');
    expect(contentArea).toBeInTheDocument();
    
    const actionsContainer = container.querySelector('.flex.gap-2');
    expect(actionsContainer).toBeInTheDocument();
  });

  it('applies correct spacing classes', () => {
    const { container } = render(<JobSkeleton />);
    
    expect(container.querySelector('.mb-2')).toBeInTheDocument();
    expect(container.querySelector('.mb-4')).toBeInTheDocument();
    expect(container.querySelector('.mb-1')).toBeInTheDocument();
    expect(container.querySelector('.gap-1')).toBeInTheDocument();
    expect(container.querySelector('.gap-2')).toBeInTheDocument();
    expect(container.querySelector('.gap-4')).toBeInTheDocument();
  });
});

describe('JobSkeletonGroup', () => {
  it('renders default number of skeletons (3)', () => {
    const { container } = render(<JobSkeletonGroup />);
    
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons).toHaveLength(3);
  });

  it('renders custom number of skeletons', () => {
    const { container } = render(<JobSkeletonGroup count={5} />);
    
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons).toHaveLength(5);
  });

  it('renders single skeleton when count is 1', () => {
    const { container } = render(<JobSkeletonGroup count={1} />);
    
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons).toHaveLength(1);
  });

  it('renders no skeletons when count is 0', () => {
    const { container } = render(<JobSkeletonGroup count={0} />);
    
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons).toHaveLength(0);
  });

  it('each skeleton in group has unique key', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<JobSkeletonGroup count={3} />);
    
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Warning: Each child in a list should have a unique "key" prop')
    );
    
    consoleSpy.mockRestore();
  });

  it('handles large count numbers', () => {
    const { container } = render(<JobSkeletonGroup count={10} />);
    
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons).toHaveLength(10);
  });

  it('maintains skeleton structure in group', () => {
    const { container } = render(<JobSkeletonGroup count={2} />);
    
    const skeletons = container.querySelectorAll('.animate-pulse');
    
    skeletons.forEach(skeleton => {
      expect(skeleton.querySelector('.flex.items-start.gap-4')).toBeInTheDocument();
      expect(skeleton.querySelector('.w-5.h-5')).toBeInTheDocument();
      expect(skeleton.querySelector('.flex-1')).toBeInTheDocument();
      expect(skeleton.querySelectorAll('.w-8.h-8')).toHaveLength(3);
    });
  });
});

describe('JobSkeleton Integration', () => {
  it('renders consistently across multiple renders', () => {
    const { container: container1 } = render(<JobSkeleton />);
    const { container: container2 } = render(<JobSkeleton />);
    
    expect(container1.innerHTML).toBe(container2.innerHTML);
  });

  it('works with React.Fragment wrapper', () => {
    const { container } = render(
      <>
        <JobSkeleton />
        <JobSkeleton />
      </>
    );
    
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons).toHaveLength(2);
  });
});