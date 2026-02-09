/**
 * Helper script to create test users
 * This should be run by an owner/admin through a protected admin panel
 * DO NOT expose this in production
 */

import { createUser } from '../services/authService';

export const createTestUsers = async () => {
  try {
    // Create Owner
    await createUser('owner@test.com', 'owner123', {
      name: 'Test Owner',
      role: 'owner'
    });
    console.log('✅ Owner created');

    // Create Employee
    await createUser('employee@test.com', 'employee123', {
      name: 'Test Employee',
      role: 'employee'
    });
    console.log('✅ Employee created');

    return { success: true };
  } catch (error) {
    console.error('❌ Error creating users:', error);
    return { success: false, error };
  }
};

// Example usage in a component:
// import { createTestUsers } from '../utils/createTestUser';
// <button onClick={createTestUsers}>Create Test Users</button>
