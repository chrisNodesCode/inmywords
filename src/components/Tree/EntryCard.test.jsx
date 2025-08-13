import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndContext } from '@dnd-kit/core';
import EntryCard from './EntryCard';

describe('EntryCard snippet interactions', () => {
  it('calls onEdit when snippet is clicked', async () => {
    const user = userEvent.setup();
    const onEdit = jest.fn();
    const entry = { id: '1', title: 'Title', snippet: 'Snippet text' };

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

