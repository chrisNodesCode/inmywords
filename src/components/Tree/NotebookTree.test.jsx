import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotebookTree from './NotebookTree';
import DrawerManager from '../Drawer/DrawerManager';

const renderWithDrawer = (ui) => render(<DrawerManager>{ui}</DrawerManager>);

describe('NotebookTree custom cards', () => {
  beforeAll(() => {
    window.scrollTo = jest.fn();
    window.getComputedStyle = () => ({ width: 0, height: 0, getPropertyValue: () => '' });
  });
  it('auto expands all groups and subgroups in manage mode', async () => {
    const user = userEvent.setup();
    const treeData = [
      { title: 'Group 1', key: 'g1', children: [{ title: 'Sub 1', key: 's1' }] },
      { title: 'Group 2', key: 'g2', children: [{ title: 'Sub 2', key: 's2' }] },
    ];
    renderWithDrawer(<NotebookTree treeData={treeData} manageMode />);
    expect(screen.getByText('Sub 1 (0)')).toBeInTheDocument();
    expect(screen.getByText('Sub 2 (0)')).toBeInTheDocument();
    await user.click(screen.getByText('Group 1'));
    expect(screen.getByText('Sub 1 (0)')).toBeInTheDocument();
  });

  it('does not render add buttons in manage mode', () => {
    const treeData = [
      { title: 'Group 1', key: 'g1', children: [{ title: 'Sub 1', key: 's1' }] },
    ];
    renderWithDrawer(
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
    const { rerender } = renderWithDrawer(<NotebookTree treeData={treeData} />);
    expect(screen.queryAllByRole('img', { name: 'holder' }).length).toBe(0);
    rerender(
      <DrawerManager>
        <NotebookTree treeData={treeData} reorderMode />
      </DrawerManager>
    );
    expect(screen.getAllByRole('img', { name: 'holder' }).length).toBe(2);
    await user.click(screen.getByText('Group 1'));
    await screen.findByText('Sub 1 (0)');
    expect(screen.getAllByRole('img', { name: 'holder' }).length).toBe(1);
  });

  it('collapses and restores open state when toggling reorder mode', async () => {
    const user = userEvent.setup();
    const treeData = [
      {
        title: 'Group 1',
        key: 'g1',
        children: [
          {
            title: 'Sub 1',
            key: 's1',
            children: [{ title: 'Entry 1', key: 'e1', id: 'e1' }],
          },
        ],
      },
    ];
    const { rerender } = renderWithDrawer(<NotebookTree treeData={treeData} />);

    await user.click(screen.getByText('Group 1'));
    await screen.findByText('Sub 1 (1)');
    await user.click(screen.getByText('Sub 1 (1)'));
    await screen.findByText('Entry 1');

    rerender(
      <DrawerManager>
        <NotebookTree treeData={treeData} reorderMode />
      </DrawerManager>
    );

    await waitFor(() => expect(screen.queryByText('Sub 1 (1)')).toBeNull());
    await waitFor(() => expect(screen.queryByText('Entry 1')).toBeNull());

    rerender(
      <DrawerManager>
        <NotebookTree treeData={treeData} />
      </DrawerManager>
    );

    await screen.findByText('Sub 1 (1)');
    await screen.findByText('Entry 1');
  });

  it('loads existing values into entity edit drawer', async () => {
    const user = userEvent.setup();
    const treeData = [{ title: 'Group 1', key: 'g1', children: [] }];
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ name: 'Group 1', description: 'desc' }),
    });

    renderWithDrawer(<NotebookTree treeData={treeData} manageMode />);
    await user.click(screen.getByText('Group 1'));

    const input = await screen.findByPlaceholderText('Title');
    await waitFor(() => expect(input).toHaveValue('Group 1'));
    expect(global.fetch).toHaveBeenCalledWith('/api/groups/g1');

    await user.clear(input);
    await user.type(input, 'Updated');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(global.fetch).toHaveBeenLastCalledWith(
      '/api/groups/g1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated', description: 'desc' }),
      })
    );

    global.fetch = originalFetch;
  });

  it('removes entry card after successful delete', async () => {
    const user = userEvent.setup();
    const initialData = [
      {
        title: 'Group 1',
        key: 'g1',
        children: [
          {
            title: 'Sub 1',
            key: 's1',
            children: [{ title: 'Entry 1', key: 'e1', id: 'e1' }],
          },
        ],
      },
    ];
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    const Wrapper = () => {
      const [data, setData] = React.useState(initialData);
      return <NotebookTree treeData={data} setTreeData={setData} />;
    };
    renderWithDrawer(<Wrapper />);

    await user.click(screen.getByText('Group 1'));
    await screen.findByText('Sub 1 (1)');
    await user.click(screen.getByText('Sub 1 (1)'));
    await screen.findByText('Entry 1');
    await user.click(screen.getByText('Entry 1'));
    await screen.findByRole('button', { name: /delete/i });
    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => expect(screen.queryByText('Entry 1')).toBeNull());

    global.fetch = originalFetch;
  });
});

