import { Effect } from 'effect';
import { PageFetcher } from './PageFetcher';
import { readPreview } from './readPreview';

/** A preview of the page a link points to */
export const previewLink = Effect.fn('links.preview')(function* (url: string) {
  const fetcher = yield* PageFetcher;

  const page = yield* fetcher.fetch(url);
  return readPreview(page.html, page.url);
});
