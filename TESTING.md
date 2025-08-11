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
