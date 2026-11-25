import { createAsyncResource } from './asyncResource.js';
import { rt } from './rt.js';

function bulk(startKey, abortKey) {
  return createAsyncResource({
    generation: () => rt.lazyDataGeneration,
    abortable: true,
    start: ({ controller }) => {
      rt[startKey] = true;
      rt[abortKey] = controller;
    },
    reset: () => {
      rt[startKey] = false;
      rt[abortKey] = null;
    },
    finish: () => {
      rt[abortKey] = null;
    },
  });
}
export const quranBulkResource = bulk('quranSearchBuildStarted', 'quranBulkAbort');
export const tafsirBulkResource = bulk('tafsirSearchBuildStarted', 'tafsirBulkAbort');
export function cancelBulkResources() {
  quranBulkResource.invalidate();
  tafsirBulkResource.invalidate();
}
