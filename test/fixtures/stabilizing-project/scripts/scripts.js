import { decorateSections, loadSection } from './aem.js';

const main = document.querySelector('main');
if (main) {
  decorateSections(main);

  const sections = main.querySelectorAll('.section');
  // Load only the first section, leave the rest stuck at 'initialized'
  // (simulates blocks like social-share that depend on external services)
  if (sections.length > 0) {
    await loadSection(sections[0]);
  }
}
