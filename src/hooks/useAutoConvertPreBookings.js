/**
 * AUTO-CONVERT PRE-BOOKINGS HOOK
 * ================================
 * Automatically converts overdue pre-bookings to sales
 * Runs periodically in the background
 */

import { useEffect, useRef } from 'react';
import { autoConvertOverduePreBookings } from '../services/orderService';

/**
 * Hook to automatically convert overdue pre-bookings
 * @param {string} userId - User ID
 * @param {boolean} isOwner - Whether user is owner
 * @param {boolean} enabled - Whether auto-conversion is enabled
 * @param {Function} onConversion - Callback when conversions happen
 * @param {number} intervalMs - Check interval in milliseconds (default: 60000 = 1 minute)
 */
export const useAutoConvertPreBookings = (
  userId, 
  isOwner = false, 
  enabled = true,
  onConversion = null,
  intervalMs = 60000 // Check every 1 minute
) => {
  const intervalRef = useRef(null);
  const isRunningRef = useRef(false);

  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    const runAutoConvert = async () => {
      // Prevent concurrent runs
      if (isRunningRef.current) {
        console.log('[Auto-Convert] Already running, skipping...');
        return;
      }

      try {
        isRunningRef.current = true;
        console.log('[Auto-Convert] Checking for overdue pre-bookings...');
        
        const results = await autoConvertOverduePreBookings(userId, isOwner);
        
        if (results.converted > 0) {
          console.log(`[Auto-Convert] ✅ Converted ${results.converted} pre-booking(s)`);
          
          // Call callback if provided
          if (onConversion) {
            onConversion(results);
          }
        }
        
        if (results.failed > 0) {
          console.warn(`[Auto-Convert] ❌ Failed to convert ${results.failed} pre-booking(s)`, results.errors);
        }
      } catch (error) {
        console.error('[Auto-Convert] Error:', error);
      } finally {
        isRunningRef.current = false;
      }
    };

    // Run immediately on mount
    runAutoConvert();

    // Set up periodic check
    intervalRef.current = setInterval(runAutoConvert, intervalMs);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [userId, isOwner, enabled, intervalMs, onConversion]);

  return null;
};
