import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetworkStatus } from './useNetworkStatus';

interface QueuedAction {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

const OFFLINE_QUEUE_KEY = 'offline_action_queue';
const MAX_RETRY_COUNT = 3;

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { isConnected } = useNetworkStatus();

  useEffect(() => {
    loadQueue();
  }, []);

  useEffect(() => {
    if (isConnected && queue.length > 0 && !isProcessing) {
      processQueue();
    }
  }, [isConnected, queue.length]);

  const loadQueue = async () => {
    try {
      const storedQueue = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (storedQueue) {
        setQueue(JSON.parse(storedQueue));
      }
    } catch (error) {
      console.error('Error loading offline queue:', error);
    }
  };

  const saveQueue = async (newQueue: QueuedAction[]) => {
    try {
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(newQueue));
      setQueue(newQueue);
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  };

  const addToQueue = async (type: string, data: any) => {
    const action: QueuedAction = {
      id: Date.now().toString(),
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    const newQueue = [...queue, action];
    await saveQueue(newQueue);

    // If online, try to process immediately
    if (isConnected) {
      processQueue();
    }
  };

  const processQueue = async () => {
    if (isProcessing || queue.length === 0) return;

    setIsProcessing(true);
    const updatedQueue = [...queue];

    for (let i = updatedQueue.length - 1; i >= 0; i--) {
      const action = updatedQueue[i];
      
      try {
        await executeAction(action);
        // Remove successful action from queue
        updatedQueue.splice(i, 1);
      } catch (error) {
        console.error('Error processing queued action:', error);
        
        // Increment retry count
        action.retryCount++;
        
        // Remove action if max retries reached
        if (action.retryCount >= MAX_RETRY_COUNT) {
          updatedQueue.splice(i, 1);
        }
      }
    }

    await saveQueue(updatedQueue);
    setIsProcessing(false);
  };

  const executeAction = async (action: QueuedAction) => {
    // This would contain the actual API calls based on action type
    switch (action.type) {
      case 'CREATE_SERVICE':
        // await createService(action.data);
        break;
      case 'UPDATE_PROFILE':
        // await updateProfile(action.data);
        break;
      case 'SEND_MESSAGE':
        // await sendMessage(action.data);
        break;
      default:
        console.warn('Unknown action type:', action.type);
    }
  };

  const clearQueue = async () => {
    await saveQueue([]);
  };

  return {
    queue,
    addToQueue,
    clearQueue,
    isProcessing,
    queueLength: queue.length,
  };
}