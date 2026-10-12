import { linkPreviewHandler } from '@/infrastructure/links/linkPreviewHandler';

/** GET /api/link-preview?url=<https url>: see infrastructure/links/linkPreviewHandler */
export const runtime = 'nodejs';

export const GET = (request: Request) => linkPreviewHandler(request);
