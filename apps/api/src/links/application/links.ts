import { Effect, Schema } from 'effect';
import { youTubeId } from '@wisepath/domain/inbox';
import type { LinkPreview } from '@wisepath/domain/paths';
import { PageFetcher } from './PageFetcher';
import { readPreview } from './readPreview';

/** The part of YouTube's oEmbed answer a preview shows */
const YouTubeOEmbed = Schema.Struct({ title: Schema.String });

const youTubeWithoutTitle: LinkPreview = {
  title: null,
  description: null,
  siteName: 'YouTube',
  favicon: 'https://www.youtube.com/favicon.ico',
};

/** A YouTube video's preview from its oEmbed answer: its watch page puts the title past what we read of the HTML */
const previewVideo = Effect.fn('links.previewVideo')(function* (videoId: string) {
  const fetcher = yield* PageFetcher;

  const watch = encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`);
  const answer = yield* fetcher.fetchJson(`https://www.youtube.com/oembed?url=${watch}&format=json`);
  const video = yield* Schema.decodeUnknownEffect(YouTubeOEmbed)(answer);
  return { ...youTubeWithoutTitle, title: video.title };
});

/** A preview of the page a link points to */
export const previewLink = Effect.fn('links.preview')(function* (url: string) {
  const fetcher = yield* PageFetcher;

  const videoId = youTubeId(url);
  // A private or removed video still has a preview, just without its title
  if (videoId) return yield* previewVideo(videoId).pipe(Effect.orElseSucceed(() => youTubeWithoutTitle));

  const page = yield* fetcher.fetch(url);
  return readPreview(page.html, page.url);
});
