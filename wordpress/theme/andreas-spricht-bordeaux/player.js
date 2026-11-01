/* Progressive enhancement of core/audio only; no author titles or MP3 URLs here. */
(() => {
  const labels = window.asPlayerLabels;
  const audios = [...document.querySelectorAll('.as-site .sample audio')];
  const time = n => Number.isFinite(n) ? `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}` : '0:00';
  const make = (tag, className, text) => {
    const e = document.createElement(tag); e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  audios.forEach(audio => {
    const player = audio.closest('.player'), row = audio.closest('.sample');
    if (!labels || !player || player.classList.contains('is-enhanced')) return;
    const title = row.querySelector('h3')?.textContent || '';
    const play = make('button', 'play', '▷'); play.type = 'button';
    const group = make('div', 'progress-group');
    const range = make('input', ''); range.type = 'range'; range.min = 0; range.max = 100; range.step = .1; range.value = 0; range.disabled = true;
    range.setAttribute('aria-label', `${labels.position} ${title}`);
    const times = make('div', 'time-row');
    const elapsed = make('span', '', '0:00 / –:––'), status = make('span', '', labels.load);
    times.append(elapsed, status); group.append(range, times); player.append(play, group);
    const reset = () => { play.textContent = '▷'; play.setAttribute('aria-label', `${title} ${labels.play}`); };
    const update = () => {
      range.disabled = !Number.isFinite(audio.duration);
      range.value = audio.duration ? audio.currentTime / audio.duration * 100 : 0;
      elapsed.textContent = `${time(audio.currentTime)} / ${time(audio.duration)}`;
    };
    reset();
    play.addEventListener('click', async () => {
      if (!audio.paused) { audio.pause(); return; }
      audios.forEach(other => { if (other !== audio) other.pause(); });
      try { await audio.play(); } catch { status.textContent = labels.error; }
    });
    audio.addEventListener('play', () => { play.textContent = 'Ⅱ'; play.setAttribute('aria-label', `${title} ${labels.pause}`); status.textContent = labels.playing; });
    audio.addEventListener('pause', () => { reset(); status.textContent = labels.paused; });
    audio.addEventListener('ended', () => { reset(); status.textContent = labels.ended; });
    audio.addEventListener('loadedmetadata', update); audio.addEventListener('timeupdate', update);
    audio.addEventListener('error', () => { reset(); play.disabled = true; range.disabled = true; status.textContent = labels.error; });
    range.addEventListener('input', () => { if (Number.isFinite(audio.duration)) audio.currentTime = Number(range.value) / 100 * audio.duration; });
    // Keep the native controls usable when JavaScript is absent or initialization fails.
    player.classList.add('is-enhanced');
  });
})();
