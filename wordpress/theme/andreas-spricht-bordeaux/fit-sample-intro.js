// Nur den mobilen Hörproben-Einleitungssatz auf seine verfügbare Breite einpassen.
(() => {
  const note = document.querySelector('#hoerproben .placeholder-note');
  if (!note) return;
  const mobile = window.matchMedia('(max-width: 600px)');
  const range = document.createRange();
  range.selectNodeContents(note);
  let lastWidth = -1;
  let frame = 0;

  function fit() {
    frame = 0;
    if (!mobile.matches) {
      note.style.removeProperty('font-size');
      lastWidth = -1;
      return;
    }
    const style = getComputedStyle(note);
    const width = note.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    if (width <= 0 || width === lastWidth) return;
    lastWidth = width;
    // Die tatsächliche Textbreite messen, damit auch die iPhone-Schrift berücksichtigt wird.
    // Ein Pixel Reserve verhindert Überlauf durch Subpixel-Rundung.
    let low = 0;
    let high = width;
    while (high - low > 0.02) {
      const size = (low + high) / 2;
      note.style.fontSize = `${size}px`;
      if (range.getBoundingClientRect().width <= width - 1) low = size;
      else high = size;
    }
    note.style.fontSize = `${Math.floor(low * 100) / 100}px`;
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(fit);
  }
  const observer = new ResizeObserver(schedule);
  observer.observe(note.parentElement);
  window.addEventListener('resize', schedule, { passive: true });
  mobile.addEventListener('change', () => { lastWidth = -1; schedule(); });
  document.fonts.ready.then(() => { lastWidth = -1; schedule(); });
  fit();
})();
