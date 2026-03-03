// Minimal mock aem.js that mimics the Edge Delivery decoration pipeline
window.hlx = window.hlx || {};
window.hlx.codeBasePath = '';
window.hlx.RUM_MANUAL_ENHANCE = true;

const scriptEl = document.querySelector('script[src$="/scripts/scripts.js"]');
if (scriptEl) {
  try {
    [window.hlx.codeBasePath] = new URL(scriptEl.src).pathname.split('/scripts/scripts.js');
  } catch { /* ignore */ }
}

function toClassName(name) {
  return typeof name === 'string'
    ? name.toLowerCase().replace(/[^0-9a-z]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    : '';
}

function decorateBlock(block) {
  const shortBlockName = block.classList[0];
  if (shortBlockName) {
    block.classList.add('block');
    block.dataset.blockName = shortBlockName;
    block.dataset.blockStatus = 'initialized';
  }
}

async function loadBlock(block) {
  const status = block.dataset.blockStatus;
  if (status !== 'loading' && status !== 'loaded') {
    block.dataset.blockStatus = 'loading';
    const { blockName } = block.dataset;
    try {
      const mod = await import(
        `${window.hlx.codeBasePath}/blocks/${blockName}/${blockName}.js`
      );
      if (mod.default) await mod.default(block);
    } catch { /* block JS may not exist */ }
    block.dataset.blockStatus = 'loaded';
  }
  return block;
}

function decorateSections(main) {
  main.querySelectorAll(':scope > div').forEach((section) => {
    section.classList.add('section');
    section.dataset.sectionStatus = 'initialized';
    section.style.display = 'none';
  });
}

function decorateBlocks(main) {
  main.querySelectorAll('div.section > div > div').forEach(decorateBlock);
}

async function loadSection(section) {
  const status = section.dataset.sectionStatus;
  if (!status || status === 'initialized') {
    section.dataset.sectionStatus = 'loading';
    const blocks = [...section.querySelectorAll('div.block')];
    for (const block of blocks) {
      await loadBlock(block);
    }
    section.dataset.sectionStatus = 'loaded';
    section.style.display = null;
  }
}

async function loadSections(element) {
  const sections = [...element.querySelectorAll('div.section')];
  for (const section of sections) {
    await loadSection(section);
  }
}

function buildBlock(blockName, content) {
  const blockEl = document.createElement('div');
  blockEl.classList.add(blockName);
  const rowEl = document.createElement('div');
  const colEl = document.createElement('div');
  if (typeof content === 'string') colEl.innerHTML = content;
  rowEl.appendChild(colEl);
  blockEl.appendChild(rowEl);
  return blockEl;
}

async function loadHeader(header) {
  const headerBlock = buildBlock('header', '');
  header.append(headerBlock);
  decorateBlock(headerBlock);
  return loadBlock(headerBlock);
}

async function loadFooter(footer) {
  const footerBlock = buildBlock('footer', '');
  footer.append(footerBlock);
  decorateBlock(footerBlock);
  return loadBlock(footerBlock);
}

export {
  decorateSections,
  decorateBlocks,
  loadSection,
  loadSections,
  loadHeader,
  loadFooter,
  buildBlock,
  decorateBlock,
  loadBlock,
};
