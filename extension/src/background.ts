// Chrome Extension Background Service Worker (Manifest V3)

const DEFAULT_API_URL = 'http://localhost:3000';
const DEFAULT_FRONTEND_URL = 'http://localhost:3001';

async function getBackendApiUrl(): Promise<string> {
  const result = await chrome.storage.sync.get(['backendUrl']);
  let base = result.backendUrl || DEFAULT_API_URL;
  return base.replace(/\/+$/, '');
}

async function getAuthToken(): Promise<string | null> {
  const result = await chrome.storage.sync.get(['authToken']);
  return result.authToken || null;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'TRIGGER_REVIEW') {
    handleTriggerReview(message.prUrl)
      .then((res) => sendResponse({ success: true, data: res }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // async sendResponse
  }

  if (message.action === 'GET_REVIEW_STATUS') {
    handleGetReviewStatus(message.reviewId)
      .then((res) => sendResponse({ success: true, data: res }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === 'GET_REVIEW_FINDINGS') {
    handleGetReviewFindings(message.reviewId)
      .then((res) => sendResponse({ success: true, data: res }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function handleTriggerReview(prUrl: string) {
  const baseUrl = await getBackendApiUrl();
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const endpoint = baseUrl.endsWith('/api/v1') ? `${baseUrl}/reviews` : `${baseUrl}/api/v1/reviews`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prUrl }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Backend error: ${response.statusText}`);
  }

  return response.json();
}

async function handleGetReviewStatus(reviewId: string) {
  const baseUrl = await getBackendApiUrl();
  const endpoint = baseUrl.endsWith('/api/v1') ? `${baseUrl}/reviews/${reviewId}` : `${baseUrl}/api/v1/reviews/${reviewId}`;

  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`Failed to fetch review status: ${response.statusText}`);
  }
  return response.json();
}

async function handleGetReviewFindings(reviewId: string) {
  const baseUrl = await getBackendApiUrl();
  const endpoint = baseUrl.endsWith('/api/v1')
    ? `${baseUrl}/reviews/${reviewId}/findings`
    : `${baseUrl}/api/v1/reviews/${reviewId}/findings`;

  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`Failed to fetch findings: ${response.statusText}`);
  }
  return response.json();
}
