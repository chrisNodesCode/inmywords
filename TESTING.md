# Testing Guidelines

This project uses [Jest](https://jestjs.io/) and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) for unit tests.

## Running tests

```bash
npm test
```

This command runs ESLint with zero warnings allowed and then executes Jest tests.

## Best practices

- **Focus on user behavior.** Use `@testing-library/react` and [`user-event`](https://testing-library.com/docs/user-event/intro/) to simulate user interactions instead of testing implementation details.
- **Transitions and timers.** When testing animations or timers, use `jest.useFakeTimers()` and advance the clock with `jest.advanceTimersByTime` to make assertions after the transition completes.
- **Drag and drop.** Simulate pointer interactions with `userEvent.pointer()` or low level `fireEvent` calls. Libraries like `@dnd-kit` respond to standard pointer events, so tests should dispatch `pointerdown`, `pointermove`, and `pointerup` events.
- **Asynchronous UI updates.** Use `await waitFor(...)` when asserting results that occur after an async state change or animation.
- **Accessibility.** Query elements by accessible roles and names to mirror how users interact with the UI.

See `src/components/Tree/NotebookTree.test.jsx` for an example of testing a dynamic component.

## Manual QA checklist

Use the following smoke test after deploying UI changes that affect entry
statuses:

1. Create a new entry and confirm the status pill shows "None" in the tree.
2. Update the entry to `in_progress` and verify the pill text updates without
   highlight styling.
3. Update the entry to `complete` and confirm both the pill and card receive the
   highlighted styling.
4. Click the snippet area to ensure the entry editor still opens via `onEdit`.
5. Attempt to save an entry with an invalid status via the API and verify the
   response returns `400 Bad Request`.
