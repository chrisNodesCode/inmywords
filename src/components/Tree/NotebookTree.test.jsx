import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotebookTree from './NotebookTree';

describe('NotebookTree custom cards', () => {
  beforeAll(() => {
    window.scrollTo = jest.fn();
  });
  it('opens one group at a time', async () => {
    const user = userEvent.setup();
    const treeData = [
      { title: 'Group 1', key: 'g1', children: [{ title: 'Sub 1', key: 's1' }] },
      { title: 'Group 2', key: 'g2', children: [{ title: 'Sub 2', key: 's2' }] },
    ];
    render(<NotebookTree treeData={treeData} />);
    expect(screen.queryByText('Sub 1')).not.toBeInTheDocument();
    await user.click(screen.getByText('Group 1'));
    await screen.findByText('Sub 1');
    await user.click(screen.getByText('Group 2'));
    await screen.findByText('Sub 2');
    await waitFor(() =>
      expect(screen.queryByText('Sub 1')).not.toBeInTheDocument()
    );
  });

  it('calls onAddGroup when add group button is clicked', async () => {
    const user = userEvent.setup();
    const onAddGroup = jest.fn();
    render(<NotebookTree treeData={[]} onAddGroup={onAddGroup} />);
    await user.click(screen.getByRole('button', { name: /add group/i }));
    expect(onAddGroup).toHaveBeenCalled();
  });
});

