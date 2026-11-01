// Dasselbe Porträt auf Smartphones in den Textfluss verschieben, niemals duplizieren.
(() => {
  const section = document.querySelector('#ueber-mich');
  const portrait = section?.querySelector('.about-portrait');
  const lead = section?.querySelector('.about-lead');
  if (!portrait || !lead) return;
  const originalPosition = document.createComment('Ursprüngliche Porträtposition für Desktop und iPad');
  portrait.before(originalPosition);
  const mobile = window.matchMedia('(max-width: 600px)');
  function positionPortrait() {
    if (mobile.matches) lead.after(portrait);
    else originalPosition.after(portrait);
  }
  mobile.addEventListener('change', positionPortrait);
  positionPortrait();
})();
