// Content Script: Detects GitHub Pull Requests & Injects AI Review Trigger

(function () {
  const PR_REGEX = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/;

  function isPullRequestPage(): boolean {
    return PR_REGEX.test(window.location.href);
  }

  function injectReviewButton() {
    if (!isPullRequestPage()) return;
    if (document.getElementById('ai-pr-review-btn-container')) return;

    const targetContainer =
      document.querySelector('.gh-header-actions') ||
      document.querySelector('.gh-header-title') ||
      document.querySelector('#partial-discussion-header');

    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'ai-pr-review-btn-container';
    buttonContainer.style.display = 'inline-flex';
    buttonContainer.style.alignItems = 'center';
    buttonContainer.style.marginLeft = '12px';
    buttonContainer.style.verticalAlign = 'middle';

    const button = document.createElement('button');
    button.id = 'ai-pr-review-trigger-btn';
    button.innerHTML = `
      <span style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600; font-size: 13px;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
        Review PR with AI
      </span>
    `;

    button.style.background = 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)';
    button.style.color = '#ffffff';
    button.style.border = 'none';
    button.style.borderRadius = '6px';
    button.style.padding = '5px 12px';
    button.style.cursor = 'pointer';
    button.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.35)';
    button.style.transition = 'all 0.2s ease-in-out';

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-1px)';
      button.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.5)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.35)';
    });

    button.addEventListener('click', async () => {
      button.disabled = true;
      button.innerHTML = '<span>⏳ Starting AI Review...</span>';

      try {
        const response = await chrome.runtime.sendMessage({
          action: 'TRIGGER_REVIEW',
          prUrl: window.location.href,
        });

        if (response && response.success) {
          button.innerHTML = '<span>✅ Review Queued! View Extension Popup</span>';
          button.style.background = '#10b981';
        } else {
          button.innerHTML = `<span>⚠️ ${response?.error || 'Review failed to start'}</span>`;
          button.style.background = '#ef4444';
        }
      } catch (err: any) {
        button.innerHTML = '<span>⚠️ Check Backend Connection</span>';
        button.style.background = '#ef4444';
      }

      setTimeout(() => {
        button.disabled = false;
        button.innerHTML = `
          <span style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600; font-size: 13px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            Review PR with AI
          </span>
        `;
        button.style.background = 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)';
      }, 4000);
    });

    buttonContainer.appendChild(button);

    if (targetContainer) {
      targetContainer.appendChild(buttonContainer);
    } else {
      document.body.appendChild(buttonContainer);
    }
  }

  // Initial check & observer for GitHub SPA navigation
  injectReviewButton();

  const observer = new MutationObserver(() => {
    if (isPullRequestPage() && !document.getElementById('ai-pr-review-btn-container')) {
      injectReviewButton();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
