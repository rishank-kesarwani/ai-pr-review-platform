// Chrome Extension Popup Script

interface ReviewData {
  _id: string;
  repoFullName: string;
  pullRequestNumber: number;
  prTitle: string;
  prUrl: string;
  status: string;
  progressPercent: number;
  currentStage?: string;
  severityCounts?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    total: number;
  };
}

let activePrUrl: string | null = null;
let currentReviewId: string | null = null;
let pollInterval: any = null;

document.addEventListener('DOMContentLoaded', async () => {
  const prInfo = document.getElementById('pr-info')!;
  const prRepo = document.getElementById('pr-repo')!;
  const triggerBtn = document.getElementById('trigger-review-btn') as HTMLButtonElement;
  const statusSection = document.getElementById('review-status-section')!;
  const statusBadge = document.getElementById('status-badge')!;
  const progressBar = document.getElementById('progress-bar')!;
  const stageText = document.getElementById('stage-text')!;
  const severityMetrics = document.getElementById('severity-metrics')!;
  const findingsList = document.getElementById('findings-preview-list')!;
  const findingsContainer = document.getElementById('findings-container')!;
  const dashboardLink = document.getElementById('dashboard-link') as HTMLAnchorElement;

  // 1. Get current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';

  const PR_REGEX = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/;
  const match = url.match(PR_REGEX);

  if (match) {
    const [, owner, repo, prNum] = match;
    activePrUrl = url;
    prInfo.textContent = `PR #${prNum} on ${owner}/${repo}`;
    prRepo.textContent = url;
    triggerBtn.disabled = false;
  } else {
    prInfo.textContent = 'No active GitHub Pull Request detected';
    prRepo.textContent = 'Navigate to any GitHub PR (e.g. github.com/owner/repo/pull/123)';
    triggerBtn.disabled = true;
    triggerBtn.style.opacity = '0.5';
  }

  // 2. Trigger review click listener
  triggerBtn.addEventListener('click', async () => {
    if (!activePrUrl) return;

    triggerBtn.disabled = true;
    triggerBtn.textContent = '⏳ Starting AI Review...';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'TRIGGER_REVIEW',
        prUrl: activePrUrl,
      });

      if (response && response.success && response.data) {
        currentReviewId = response.data._id;
        showReviewStatus(response.data);
        startPolling(currentReviewId!);
      } else {
        alert(response?.error || 'Failed to trigger review');
        triggerBtn.disabled = false;
        triggerBtn.textContent = '✨ Trigger AI PR Review';
      }
    } catch (err: any) {
      alert(`Error connecting to backend: ${err.message}`);
      triggerBtn.disabled = false;
      triggerBtn.textContent = '✨ Trigger AI PR Review';
    }
  });

  function showReviewStatus(review: ReviewData) {
    statusSection.classList.remove('hidden');
    triggerBtn.classList.add('hidden');

    statusBadge.textContent = review.status;
    statusBadge.className = `badge badge-${review.status}`;

    progressBar.style.width = `${review.progressPercent || 10}%`;
    stageText.textContent = review.currentStage || 'Processing...';

    const result = chrome.storage.sync.get(['frontendUrl'], (res) => {
      const frontend = res.frontendUrl || 'http://localhost:3001';
      dashboardLink.href = `${frontend.replace(/\/+$/, '')}/reviews/${review._id}`;
    });

    if (review.status === 'COMPLETED') {
      if (review.severityCounts) {
        severityMetrics.classList.remove('hidden');
        document.getElementById('count-critical')!.textContent = String(review.severityCounts.critical);
        document.getElementById('count-high')!.textContent = String(review.severityCounts.high);
        document.getElementById('count-medium')!.textContent = String(review.severityCounts.medium);
        document.getElementById('count-low')!.textContent = String(review.severityCounts.low);
      }
      loadFindings(review._id);
    }
  }

  async function loadFindings(reviewId: string) {
    try {
      const res = await chrome.runtime.sendMessage({
        action: 'GET_REVIEW_FINDINGS',
        reviewId,
      });

      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        findingsList.classList.remove('hidden');
        findingsContainer.innerHTML = '';

        for (const finding of res.data.slice(0, 3)) {
          const item = document.createElement('div');
          item.className = 'finding-item';
          item.innerHTML = `
            <div class="finding-item-header">
              <span>${escapeHtml(finding.title)}</span>
              <span class="finding-tag ${finding.severity}">${finding.severity}</span>
            </div>
            <div class="finding-loc">📄 ${escapeHtml(finding.file)}${finding.line ? `:${finding.line}` : ''}</div>
          `;
          findingsContainer.appendChild(item);
        }
      }
    } catch (e) {
      // ignore
    }
  }

  function startPolling(reviewId: string) {
    if (pollInterval) clearInterval(pollInterval);

    pollInterval = setInterval(async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'GET_REVIEW_STATUS',
          reviewId,
        });

        if (response && response.success && response.data) {
          const review = response.data;
          showReviewStatus(review);

          if (review.status === 'COMPLETED' || review.status === 'FAILED' || review.status === 'CANCELLED') {
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        clearInterval(pollInterval);
      }
    }, 2500);
  }

  function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
});
