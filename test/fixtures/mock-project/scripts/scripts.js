import {
  decorateSections,
  decorateBlocks,
  loadSection,
  loadSections,
  loadHeader,
  loadFooter,
} from './aem.js';

function decorateMain(main) {
  decorateSections(main);
  decorateBlocks(main);
}

async function loadEager(doc) {
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    const firstSection = main.querySelector('.section');
    if (firstSection) await loadSection(firstSection);
  }
}

async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadSections(main);
  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
}

loadPage();
