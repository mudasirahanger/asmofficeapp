import { useSyncStore } from '../../store/syncStore';
import { SyncAction } from '../../types';

describe('syncStore', () => {
  beforeEach(() => {
    useSyncStore.setState({ queue: [], isSyncing: false, lastSync: null });
  });

  it('adds item to queue with pending status', () => {
    const action: SyncAction = { type: 'CREATE_RECORD', payload: { data: 123 } };
    useSyncStore.getState().addToQueue(action);
    
    const { queue } = useSyncStore.getState();
    expect(queue.length).toBe(1);
    expect(queue[0].type).toBe('CREATE_RECORD');
    expect(queue[0].status).toBe('pending');
    expect(queue[0].retries).toBe(0);
    expect(queue[0].id).toBeDefined();
  });

  it('removes item from queue', () => {
    useSyncStore.setState({
      queue: [{ id: '1', type: 'TEST', payload: {}, status: 'pending', retries: 0, created_at: '' }]
    });
    
    useSyncStore.getState().removeFromQueue('1');
    expect(useSyncStore.getState().queue.length).toBe(0);
  });

  it('updates item in queue', () => {
    useSyncStore.setState({
      queue: [{ id: '1', type: 'TEST', payload: {}, status: 'pending', retries: 0, created_at: '' }]
    });
    
    useSyncStore.getState().updateItem('1', { status: 'completed', retries: 1 });
    
    const item = useSyncStore.getState().queue[0];
    expect(item.status).toBe('completed');
    expect(item.retries).toBe(1);
  });

  it('clearSynced removes completed items and failed items with retries >= 3', () => {
    useSyncStore.setState({
      queue: [
        { id: '1', type: 'TEST', payload: {}, status: 'pending', retries: 0, created_at: '' },
        { id: '2', type: 'TEST', payload: {}, status: 'completed', retries: 0, created_at: '' },
        { id: '3', type: 'TEST', payload: {}, status: 'failed', retries: 3, created_at: '' },
        { id: '4', type: 'TEST', payload: {}, status: 'failed', retries: 2, created_at: '' },
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
