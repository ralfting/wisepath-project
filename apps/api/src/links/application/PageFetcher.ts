import { Context } from 'effect';
import type { Effect } from 'effect';
import type { LinkNotPreviewable } from '@wisepath/domain/paths';

/** A web page's HTML, as far as its <head>, and the address it ended at after redirects */
export interface FetchedPage {
  readonly html: string;
  readonly url: URL;
}

/** Fetches pages someone linked to, refusing anything that isn't a public http(s) page */
export class PageFetcher extends Context.Service<
  PageFetcher,
  { readonly fetch: (url: string) => Effect.Effect<FetchedPage, LinkNotPreviewable> }
>()('@wisepath/api/links/application/PageFetcher') {}
