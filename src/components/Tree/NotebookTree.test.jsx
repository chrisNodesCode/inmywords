import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotebookTree from './NotebookTree';

describe('NotebookTree custom cards', () => {
  beforeAll(() => {
    window.scrollTo = jest.fn();
  });
  it('auto expands all groups and subgroups in manage mode', async () => {
    const user = userEvent.setup();
    const treeData = [
      { title: 'Group 1', key: 'g1', children: [{ title: 'Sub 1', key: 's1' }] },
      { title: 'Group 2', key: 'g2', children: [{ title: 'Sub 2', key: 's2' }] },
    ];
    render(<NotebookTree treeData={treeData} manageMode />);
    expect(screen.getByText('Sub 1')).toBeInTheDocument();
    expect(screen.getByText('Sub 2')).toBeInTheDocument();
    await user.click(screen.getByText('Group 1'));
    expect(screen.getByText('Sub 1')).toBeInTheDocument();
  });

  it('does not render add buttons in manage mode', () => {
    const treeData = [
      { title: 'Group 1', key: 'g1', children: [{ title: 'Sub 1', key: 's1' }] },
    ];
    render(
      <NotebookTree
        treeData={treeData}
        onAddGroup={() => {}}
        onAddSubgroup={() => {}}
        onAddEntry={() => {}}
        manageMode
      />
    );
    expect(screen.queryByRole('button', { name: /add new group/i })).toBeNull();
    expect(
      screen.queryByRole('button', { name: /add new subgroup/i })
    ).toBeNull();
    expect(screen.queryByRole('button', { name: /add new entry/i })).toBeNull();
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

