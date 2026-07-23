import { useUIStore } from '../../store/uiStore';

/**
 * Regression test for PRODUCTION_AUDIT.md finding: ProjectCard's
 * handleComplete previously called a non-existent
 * `addToast({ type, message })` method, which crashed with a TypeError on
 * every "mark project complete" attempt (success and failure paths alike).
 * The real store API is `showToast(message, type)`. This test pins that
 * contract so a future rename/refactor of ProjectCard can't silently drift
 * from the store's actual shape again.
 */
describe('uiStore', () => {
  beforeEach(() => {
    // showToast() schedules a 3.5s setTimeout to auto-dismiss; use fake
    // timers so it doesn't leak past the test and force Jest to hang on
    // worker teardown.
    jest.useFakeTimers();
    useUIStore.setState({ toasts: [] });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('does not expose an addToast method', () => {
    expect((useUIStore.getState() as any).addToast).toBeUndefined();
  });

  it('exposes showToast(message, type) and queues a toast', () => {
    useUIStore.getState().showToast('Marked "Project" as completed!', 'success');

    const { toasts } = useUIStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({
      message: 'Marked "Project" as completed!',
      type: 'success',
    });
  });

  it('removeToast removes a queued toast by id', () => {
    useUIStore.getState().showToast('Failed to update project', 'error');
    const id = useUIStore.getState().toasts[0].id;

    useUIStore.getState().removeToast(id);

    expect(useUIStore.getState().toasts).toHaveLength(0);
  });
});
