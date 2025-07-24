import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

// Test component to access auth context
function TestComponent() {
  const { session, loading, profile } = useAuth();
  
  return (
    <>
      {loading && <div testID="loading">Loading</div>}
      {session && <div testID="authenticated">Authenticated</div>}
      {profile && <div testID="profile">{profile.username}</div>}
    </>
  );
}

describe('AuthContext', () => {
  it('provides authentication state', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Should show loading initially
    expect(getByTestId('loading')).toBeTruthy();
  });

  it('handles sign up flow', async () => {
    // This would test the actual sign up functionality
    // Implementation would depend on your testing strategy
  });

  it('handles sign in flow', async () => {
    // This would test the actual sign in functionality
    // Implementation would depend on your testing strategy
  });
});