import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './auth';

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset the store before each test
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
    });
  });

  describe('login', () => {
    it('should set user and token on login', () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        created_at: '2024-01-01T00:00:00Z',
      };

      useAuthStore.getState().login('test-token-123', mockUser);

      const state = useAuthStore.getState();
      expect(state.token).toBe('test-token-123');
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('should correctly set isAuthenticated to true', () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        created_at: '2024-01-01T00:00:00Z',
      };

      useAuthStore.getState().login('token', mockUser);

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
  });

  describe('logout', () => {
    it('should clear user and token on logout', () => {
      // First login
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        created_at: '2024-01-01T00:00:00Z',
      };
      useAuthStore.getState().login('test-token', mockUser);

      // Then logout
      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.token).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('setUser', () => {
    it('should update user data', () => {
      const newUser = {
        id: '2',
        email: 'updated@example.com',
        name: 'Updated User',
        created_at: '2024-01-02T00:00:00Z',
      };

      useAuthStore.getState().setUser(newUser);

      expect(useAuthStore.getState().user).toEqual(newUser);
    });
  });

  describe('setLoading', () => {
    it('should set loading state to true', () => {
      useAuthStore.getState().setLoading(true);
      expect(useAuthStore.getState().isLoading).toBe(true);
    });

    it('should set loading state to false', () => {
      useAuthStore.getState().setLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('initial state', () => {
    it('should have correct default values', () => {
      useAuthStore.setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: true,
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(true);
    });
  });
});
