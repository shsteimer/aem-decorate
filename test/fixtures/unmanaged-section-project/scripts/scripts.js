import { decorateSections, loadSection } from './aem.js';

const main = document.querySelector('main');
if (main) {
  decorateSections(main);

  // Load all managed sections
  for (const section of main.querySelectorAll('.section')) {
    await loadSection(section);
  }

  // Simulate a dynamic block (like tabs) injecting a section with no sectionStatus
  const unmanaged = document.createElement('div');
  unmanaged.className = 'section tabs';
  main.appendChild(unmanaged);
}
