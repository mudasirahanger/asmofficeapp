import api from '../../services/api';
import { secureStorage } from '../../lib/secureStorage';

jest.mock('../../lib/secureStorage', () => ({
  secureStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    deleteItem: jest.fn(),
  },
}));

describe('API Interceptors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds authorization header if token exists', async () => {
    (secureStorage.getItem as jest.Mock).mockResolvedValue('test-token');
    
    // Simulate request interceptor
    const interceptor = (api.interceptors.request as any).handlers[0];
    const config = { headers: {} as any };
    
    const result = await interceptor.fulfilled(config);
    expect(result.headers.Authorization).toBe('Bearer test-token');
  });

  it('does not add authorization header if token does not exist', async () => {
    (secureStorage.getItem as jest.Mock).mockResolvedValue(null);
    
    const interceptor = (api.interceptors.request as any).handlers[0];
    const config = { headers: {} as any };
    
    const result = await interceptor.fulfilled(config);
    expect(result.headers.Authorization).toBeUndefined();
  });

  it('deletes token on 401 response', async () => {
    const interceptor = (api.interceptors.response as any).handlers[0];
    const error = { response: { status: 401 } };
    
    await expect(interceptor.rejected(error)).rejects.toEqual(error);
    expect(secureStorage.deleteItem).toHaveBeenCalledWith('auth_token');
  });

  it('does not delete token on non-401 response', async () => {
    const interceptor = (api.interceptors.response as any).handlers[0];
    const error = { response: { status: 500 } };
    
    await expect(interceptor.rejected(error)).rejects.toEqual(error);
    expect(secureStorage.deleteItem).not.toHaveBeenCalled();
  });
});
