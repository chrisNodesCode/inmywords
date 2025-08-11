import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotebookTree from './NotebookTree';

describe('NotebookTree', () => {
  it('opens one group at a time', async () => {
    const user = userEvent.setup();
    const treeData = [
      { title: 'Group 1', key: 'g1', children: [{ title: 'Sub 1', key: 's1' }] },
      { title: 'Group 2', key: 'g2', children: [{ title: 'Sub 2', key: 's2' }] },
    ];
    render(<NotebookTree treeData={treeData} />);

    await user.click(screen.getByText('Group 1'));
    expect(screen.getByText('Sub 1')).toBeInTheDocument();

    await user.click(screen.getByText('Group 2'));
    await screen.findByText('Sub 2');
    await waitFor(() => {
      expect(screen.queryByText('Sub 1')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Sub 2')).toBeInTheDocument();
  });
});
