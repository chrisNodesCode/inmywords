import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndContext } from '@dnd-kit/core';
import { DEFAULT_ENTRY_STATUS } from '@/constants/entryStatus';
import styles from './EntryCard.module.css';
import EntryCard from './EntryCard';

const renderEntryCard = (entryOverrides = {}, props = {}) => {
  const entry = {
    id: '1',
    title: 'Title',
    snippet: 'Snippet text',
    status: DEFAULT_ENTRY_STATUS,
    ...entryOverrides,
  };

  return render(
    <DndContext>
      <EntryCard id={entry.id} entry={entry} isOpen onEdit={jest.fn()} {...props} />
    </DndContext>
  );
};

describe('EntryCard status pill', () => {
  it('renders the status label with capitalization', () => {
    renderEntryCard({ status: 'complete' });

    expect(screen.getByLabelText('Status: Complete')).toHaveTextContent('Complete');
  });

  it.each`
    status          | highlighted
    ${'complete'}   | ${true}
    ${'COMPLETE'}   | ${true}
    ${'in_progress'}| ${false}
    ${'none'}       | ${false}
  `('applies highlight styling for status "$status" -> $highlighted', ({ status, highlighted }) => {
    renderEntryCard({ status });

    const card = screen.getByRole('button', { name: /title/i });
    const statusPill = screen.getByLabelText(/status:/i);

    if (highlighted) {
      expect(card).toHaveClass(styles.highlighted);
      expect(statusPill).toHaveClass(styles.statusHighlighted);
    } else {
      expect(card).not.toHaveClass(styles.highlighted);
      expect(statusPill).not.toHaveClass(styles.statusHighlighted);
    }
  });
});

describe('EntryCard snippet interactions', () => {
  it('calls onEdit when snippet is clicked', async () => {
    const user = userEvent.setup();
    const onEdit = jest.fn();
    const entry = { id: '1', title: 'Title', snippet: 'Snippet text', status: 'complete' };

    render(
      <DndContext>
        <EntryCard id="1" entry={entry} isOpen onEdit={onEdit} />
      </DndContext>
    );

    const snippet = screen.getByText('Snippet text');
    await user.click(snippet);

    expect(onEdit).toHaveBeenCalledWith(entry);
  });
});

