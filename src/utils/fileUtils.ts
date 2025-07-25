// File utility functions with memory safety
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB

export interface SafeFileResult {
  success: boolean;
  data?: ArrayBuffer;
  error?: string;
}

export async function safeFileRead(uri: string, maxSize: number = MAX_FILE_SIZE): Promise<SafeFileResult> {
  try {
    // Validate URI
    if (!uri || typeof uri !== 'string') {
      return { success: false, error: 'Invalid file URI' };
    }

    const response = await fetch(uri);
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    // Check content length before processing
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const size = parseInt(contentLength);
      if (size > maxSize) {
        return { success: false, error: `File too large: ${size} bytes (max: ${maxSize})` };
      }
    }

    const blob = await response.blob();
    
    // Additional size check after blob creation
    if (blob.size > maxSize) {
      return { success: false, error: `File too large: ${blob.size} bytes (max: ${maxSize})` };
    }

    const arrayBuffer = await blob.arrayBuffer();
    
    // Validate array buffer
    if (arrayBuffer.byteLength === 0) {
      return { success: false, error: 'File is empty' };
    }
    
    if (arrayBuffer.byteLength > maxSize) {
      return { success: false, error: `Processed file too large: ${arrayBuffer.byteLength} bytes` };
    }

    return { success: true, data: arrayBuffer };
  } catch (error) {
    console.error('Safe file read error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown file read error' 
    };
  }
}

export function validateImageType(uri: string): boolean {
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const extension = uri.toLowerCase().split('.').pop();
  return validExtensions.includes(`.${extension}`);
}

export function getFileExtension(uri: string): string {
  return uri.split('.').pop()?.toLowerCase() ?? 'jpeg';
}

export function generateFileName(userId: string, extension: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${userId}-${timestamp}-${random}.${extension}`;
}

// Memory cleanup utility
export function forceGarbageCollection(): void {
  if (typeof global !== 'undefined' && global.gc) {
    try {
      global.gc();
    } catch (error) {
      // Ignore errors in garbage collection
    }
  }
}