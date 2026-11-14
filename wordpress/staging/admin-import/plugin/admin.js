/* One authenticated request per recoverable step; no public or background importer. */
(() => {
  const start = document.getElementById('as-start');
  if (!start) return;
  const consent = document.getElementById('as-consent');
  const progress = document.getElementById('as-progress');
  consent.addEventListener('change', () => { start.disabled = !consent.checked; });
  start.addEventListener('click', async () => {
    start.disabled = true; consent.disabled = true;
    async function step(command) {
      const body = new URLSearchParams({action: 'as_i16', command, nonce: asI16.nonce, plan: asI16.plan, consent: consent.checked ? 'yes' : ''});
      const response = await fetch(asI16.url, {method: 'POST', credentials: 'same-origin', body});
      const result = await response.json();
      if (!response.ok || !result.success) throw Error(result.data?.message || 'Anfrage abgebrochen. Seite neu laden und Import fortsetzen.');
      progress.textContent = result.data.message;
      return result.data;
    }
    try {
      let result = await step('start');
      while (!result.done) result = await step('next');
      window.location.reload();
    } catch (error) {
      progress.textContent = error.message + ' Nach einer Unterbrechung bitte diese Seite neu laden und die Vorprüfung erneut bestätigen.';
    }
  });
})();
