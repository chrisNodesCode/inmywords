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
    render(<NotebookTree treeData={treeData} manageMode />);
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
    render(<NotebookTree treeData={[]} onAddGroup={onAddGroup} manageMode />);
    await user.click(screen.getByRole('button', { name: /add new group/i }));
    expect(onAddGroup).toHaveBeenCalled();
  });

  it('calls onAddSubgroup when button is clicked', async () => {
    const user = userEvent.setup();
    const onAddSubgroup = jest.fn();
    const treeData = [{ title: 'Group 1', key: 'g1', children: [] }];
    render(
      <NotebookTree
        treeData={treeData}
        onAddSubgroup={onAddSubgroup}
        manageMode
      />
    );
    await user.click(screen.getByText('Group 1'));
    await user.click(
      screen.getByRole('button', { name: /add new subgroup to group 1/i })
    );
    expect(onAddSubgroup).toHaveBeenCalledWith('g1');
  });

  it('calls onAddEntry when button is clicked', async () => {
    const user = userEvent.setup();
    const onAddEntry = jest.fn();
    const treeData = [
      { title: 'Group 1', key: 'g1', children: [{ title: 'Sub 1', key: 's1' }] },
    ];
    render(
      <NotebookTree treeData={treeData} onAddEntry={onAddEntry} manageMode />
    );
    await user.click(screen.getByText('Group 1'));
    await user.click(screen.getByText('Sub 1'));
    await user.click(
      screen.getByRole('button', { name: /add new entry to subgroup sub 1/i })
    );
    expect(onAddEntry).toHaveBeenCalledWith('g1', 's1');
  });

  it('shows drag handles only when reorder mode enabled and items and siblings are collapsed', async () => {
    const user = userEvent.setup();
    const treeData = [
      { title: 'Group 1', key: 'g1', children: [{ title: 'Sub 1', key: 's1' }] },
      { title: 'Group 2', key: 'g2', children: [] },
    ];
    const { rerender } = render(<NotebookTree treeData={treeData} />);
    expect(screen.queryAllByText('=').length).toBe(0);
    rerender(<NotebookTree treeData={treeData} reorderMode />);
    expect(screen.getAllByText('=').length).toBe(2);
    await user.click(screen.getByText('Group 1'));
    await screen.findByText('Sub 1');
    expect(screen.getAllByText('=').length).toBe(1);
  });
});

