import { decorateSections } from './aem.js';

const main = document.querySelector('main');
if (main) decorateSections(main);
// Never loads sections — they stay in 'loading' status forever
