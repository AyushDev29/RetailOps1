import { useContext } from 'react';
import { UserContext } from '../contexts/UserContext';

export function useRole() {
  const { userRole } = useContext(UserContext);
  return userRole;
}
