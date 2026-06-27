import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/authService';

jest.mock('../../services/authService', () => ({
  authService: {
    getToken: jest.fn(),
    me: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    getCachedUser: jest.fn(),
  },
}));

describe('authStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false, isLoading: true });
  });

  it('checkAuth sets unauthenticated if no token', async () => {
    (authService.getToken as jest.Mock).mockResolvedValue(null);
    await useAuthStore.getState().checkAuth();
    
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });

  it('checkAuth sets authenticated if token and me() succeeds', async () => {
    const mockUser = { id: 1, name: 'Test User' };
    (authService.getToken as jest.Mock).mockResolvedValue('test-token');
    (authService.me as jest.Mock).mockResolvedValue(mockUser);
    
    await useAuthStore.getState().checkAuth();
    
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('test-token');
    expect(state.user).toEqual(mockUser);
    expect(state.isLoading).toBe(false);
  });

  it('checkAuth stays authenticated if me() fails but token is still valid (not 401)', async () => {
    const mockUser = { id: 1, name: 'Cached User' };
    (authService.getToken as jest.Mock).mockResolvedValue('test-token');
    (authService.me as jest.Mock).mockRejectedValue({ response: { status: 500 } });
    (authService.getCachedUser as jest.Mock).mockResolvedValue(mockUser);
    
    await useAuthStore.getState().checkAuth();
    
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('test-token');
    expect(state.user).toEqual(mockUser);
    expect(authService.logout).not.toHaveBeenCalled();
  });

  it('checkAuth logs out if me() fails with 401', async () => {
    (authService.getToken as jest.Mock).mockResolvedValue('test-token');
    (authService.me as jest.Mock).mockRejectedValue({ response: { status: 401 } });
    
    await useAuthStore.getState().checkAuth();
    
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(authService.logout).toHaveBeenCalled();
  });

  it('login sets user and token', async () => {
    const mockUser = { id: 1, name: 'Test User' };
    (authService.login as jest.Mock).mockResolvedValue({ token: 'new-token', user: mockUser });
    
    await useAuthStore.getState().login('user', 'pass');
    
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('new-token');
    expect(state.user).toEqual(mockUser);
  });

  it('logout clears user and token', async () => {
    useAuthStore.setState({ token: 'test', user: { id: 1 } as any, isAuthenticated: true });
    
    await useAuthStore.getState().logout();
    
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBe(null);
    expect(state.user).toBe(null);
    expect(authService.logout).toHaveBeenCalled();
  });
});
