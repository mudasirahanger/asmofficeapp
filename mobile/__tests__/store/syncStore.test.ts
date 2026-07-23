import { useSyncStore } from '../../store/syncStore';
import { SyncAction } from '../../types';

// NOTE: this test previously used a `type` field that does not exist on
// SyncAction/SyncQueueItem (the real interface uses `entity_type` + `action`
// — see types/index.ts). It happened to still run because TypeScript types
// are erased at runtime, but it was asserting against a fictional shape
// instead of the real one. Fixed as part of PRODUCTION_AUDIT.md cleanup.
describe('syncStore', () => {
  beforeEach(() => {
    useSyncStore.setState({ queue: [], isSyncing: false, lastSync: null });
  });

  it('adds item to queue with pending status', () => {
    const action: SyncAction = { entity_type: 'project', action: 'CREATE_RECORD', payload: { data: 123 } };
    useSyncStore.getState().addToQueue(action);

    const { queue } = useSyncStore.getState();
    expect(queue.length).toBe(1);
    expect(queue[0].entity_type).toBe('project');
    expect(queue[0].action).toBe('CREATE_RECORD');
    expect(queue[0].status).toBe('pending');
    expect(queue[0].retries).toBe(0);
    expect(queue[0].id).toBeDefined();
  });

  it('removes item from queue', () => {
    useSyncStore.setState({
      queue: [{ id: '1', entity_type: 'project', action: 'TEST', payload: {}, status: 'pending', retries: 0, created_at: '' }]
    });

    useSyncStore.getState().removeFromQueue('1');
    expect(useSyncStore.getState().queue.length).toBe(0);
  });

  it('updates item in queue', () => {
    useSyncStore.setState({
      queue: [{ id: '1', entity_type: 'project', action: 'TEST', payload: {}, status: 'pending', retries: 0, created_at: '' }]
    });

    useSyncStore.getState().updateItem('1', { status: 'completed', retries: 1 });

    const item = useSyncStore.getState().queue[0];
    expect(item.status).toBe('completed');
    expect(item.retries).toBe(1);
  });

  it('clearSynced removes completed items and failed items with retries >= 3', () => {
    useSyncStore.setState({
      queue: [
        { id: '1', entity_type: 'project', action: 'TEST', payload: {}, status: 'pending', retries: 0, created_at: '' },
        { id: '2', entity_type: 'project', action: 'TEST', payload: {}, status: 'completed', retries: 0, created_at: '' },
        { id: '3', entity_type: 'project', action: 'TEST', payload: {}, status: 'failed', retries: 3, created_at: '' },
        { id: '4', entity_type: 'project', action: 'TEST', payload: {}, status: 'failed', retries: 2, created_at: '' },
      ]
    });

    useSyncStore.getState().clearSynced();

    const { queue } = useSyncStore.getState();
    expect(queue.length).toBe(2);
    expect(queue.find(q => q.id === '1')).toBeDefined();
    expect(queue.find(q => q.id === '4')).toBeDefined();
    expect(queue.find(q => q.id === '2')).toBeUndefined();
    expect(queue.find(q => q.id === '3')).toBeUndefined();
  });
});
