'use strict';
const content = window.siteContent;
const element = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
const formatTime = value => Number.isFinite(value) ? `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}` : '0:00';
const audios = [];
content.samples.forEach((sample, index) => {
  const row = element('article', 'sample');
  row.append(element('span', 'sample-number', String(index + 1).padStart(2, '0')));
  const copy = element('div'); copy.append(element('h3', '', sample.title), element('p', '', sample.description)); row.append(copy);
  const player = element('div', 'player');
  const play = element('button', 'play', '▷'); play.type = 'button'; play.setAttribute('aria-label', `${sample.title} abspielen`); play.disabled = !sample.src;
  const group = element('div', 'progress-group');
  const progress = element('input'); progress.type = 'range'; progress.min = 0; progress.max = 100; progress.value = 0; progress.step = 0.1; progress.disabled = true; progress.setAttribute('aria-label', `Wiedergabeposition ${sample.title}`);
  const times = element('div', 'time-row'); const time = element('span', '', '0:00 / –:––'); const status = element('span', '', sample.src ? 'Hörprobe laden' : 'PLATZHALTER · KEIN AUDIO'); times.append(time, status); group.append(progress, times); player.append(play, group); row.append(player);
  if (sample.src) {
    const audio = new Audio(); audio.preload = 'none'; audio.src = sample.src; audios.push(audio);
    const reset = () => { play.textContent = '▷'; play.setAttribute('aria-label', `${sample.title} abspielen`); };
    play.addEventListener('click', async () => { if (audio.paused) { audios.forEach(other => { if (other !== audio) other.pause(); }); try { await audio.play(); } catch { status.textContent = 'Audio nicht verfügbar'; } } else audio.pause(); });
    audio.addEventListener('play', () => { play.textContent = 'Ⅱ'; play.setAttribute('aria-label', `${sample.title} pausieren`); status.textContent = 'Wiedergabe'; });
    audio.addEventListener('pause', () => { reset(); status.textContent = 'Pausiert'; }); audio.addEventListener('ended', () => { reset(); status.textContent = 'Beendet'; });
    audio.addEventListener('loadedmetadata', () => { progress.disabled = !Number.isFinite(audio.duration); time.textContent = `0:00 / ${formatTime(audio.duration)}`; });
    audio.addEventListener('timeupdate', () => { progress.value = audio.duration ? audio.currentTime / audio.duration * 100 : 0; time.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`; });
    audio.addEventListener('error', () => { status.textContent = 'Audio nicht verfügbar'; reset(); play.disabled = true; progress.disabled = true; });
    progress.addEventListener('input', () => { if (Number.isFinite(audio.duration)) audio.currentTime = Number(progress.value) / 100 * audio.duration; });
  }
  document.querySelector('#sample-list').append(row);
});
function renderBooks(items, target) {
  items.forEach(book => {
    const article = element('article', 'book'); const cover = element('div', 'book-cover');
    if (book.cover) { const img = element('img'); img.src = book.cover; img.alt = `Buchcover: ${book.title}`; img.loading = 'lazy'; cover.append(img); }
    else { const label = element('div', '', 'Buchcover'); label.append(element('small', '', 'PLATZHALTER')); cover.append(label); }
    const copy = element('div'); copy.append(element('span', 'tag', book.status), element('h4', '', book.title), element('p', '', book.author), element('p', '', book.description));
    if (book.url && /^https?:\/\//.test(book.url)) { const link = element('a', 'book-link', 'Zum Hörbuch ↗'); link.href = book.url; copy.append(link); }
    article.append(cover, copy); document.querySelector(target).append(article);
  });
}
renderBooks(content.studio, '#studio-books'); renderBooks(content.released, '#released-books');
if (content.email) { const link = element('a', 'contact-email', `${content.email} ↗`); link.href = `mailto:${content.email}`; document.querySelector('#contact-action').replaceChildren(link); }
document.querySelector('#year').textContent = new Date().getFullYear();
const dialog = document.querySelector('#legal-dialog');
document.querySelectorAll('[data-dialog]').forEach(button => button.addEventListener('click', () => { const privacy = button.dataset.dialog === 'datenschutz'; document.querySelector('#legal-title').textContent = privacy ? 'Datenschutz' : 'Impressum'; document.querySelector('#legal-copy').textContent = privacy ? 'Die Datenschutzerklärung wird vor einer Veröffentlichung anhand der tatsächlich eingesetzten Dienste ergänzt.' : 'Die erforderlichen Anbieterangaben werden vor einer Veröffentlichung ergänzt.'; dialog.showModal(); }));
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
