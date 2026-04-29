document.getElementById('ping').addEventListener('click', async () => {
  const response = await window.api.getUser();
  document.getElementById('response').textContent =
    `Electron handle tester: ${JSON.stringify(response)}`;
});
