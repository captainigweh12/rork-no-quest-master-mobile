export async function testSupabaseConnection(url: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log('[test-connection] Testing connection to:', url);
    
    const response = await fetch(`${url}/rest/v1/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('[test-connection] Response status:', response.status);
    console.log('[test-connection] Response headers:', JSON.stringify(Object.fromEntries(response.headers)));
    
    if (response.status === 200 || response.status === 401 || response.status === 403) {
      return {
        success: true,
        message: 'Connection successful! Server is reachable.',
      };
    }
    
    return {
      success: false,
      message: `Server responded with status ${response.status}`,
    };
  } catch (error: any) {
    console.error('[test-connection] Connection test failed:', error);
    
    if (error.message?.includes('fetch')) {
      return {
        success: false,
        message: 'Network error: Cannot reach the server. Check your internet connection.',
      };
    }
    
    return {
      success: false,
      message: `Connection failed: ${error.message || 'Unknown error'}`,
    };
  }
}
