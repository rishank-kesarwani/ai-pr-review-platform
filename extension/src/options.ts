document.addEventListener('DOMContentLoaded', () => {
  const backendInput = document.getElementById('backendUrl') as HTMLInputElement;
  const frontendInput = document.getElementById('frontendUrl') as HTMLInputElement;
  const authInput = document.getElementById('authToken') as HTMLInputElement;
  const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
  const statusMsg = document.getElementById('statusMsg')!;

  chrome.storage.sync.get(['backendUrl', 'frontendUrl', 'authToken'], (items) => {
    if (items.backendUrl) backendInput.value = items.backendUrl;
    if (items.frontendUrl) frontendInput.value = items.frontendUrl;
    if (items.authToken) authInput.value = items.authToken;
  });

  saveBtn.addEventListener('click', () => {
    const backendUrl = backendInput.value.trim();
    const frontendUrl = frontendInput.value.trim();
    const authToken = authInput.value.trim();

    chrome.storage.sync.set({ backendUrl, frontendUrl, authToken }, () => {
      statusMsg.textContent = 'Settings saved successfully!';
      setTimeout(() => {
        statusMsg.textContent = '';
      }, 3000);
    });
  });
});
