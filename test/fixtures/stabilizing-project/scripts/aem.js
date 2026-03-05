// Mock aem.js that loads sections but leaves one stuck at 'initialized'
window.hlx = window.hlx || {};
window.hlx.codeBasePath = '';
window.hlx.RUM_MANUAL_ENHANCE = true;

const scriptEl = document.querySelector('script[src$="/scripts/scripts.js"]');
if (scriptEl) {
  try {
    [window.hlx.codeBasePath] = new URL(scriptEl.src).pathname.split('/scripts/scripts.js');
  } catch { /* ignore */ }
}

export function decorateSections(main) {
  main.querySelectorAll(':scope > div').forEach((section) => {
    section.classList.add('section');
    section.dataset.sectionStatus = 'initialized';
  });
}

export async function loadSection(section) {
  section.dataset.sectionStatus = 'loaded';
}
