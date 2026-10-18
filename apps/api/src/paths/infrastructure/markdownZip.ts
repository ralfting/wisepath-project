import { StreamableFile } from '@nestjs/common';
import { strToU8, zipSync } from 'fflate';
import { fileName } from '@wisepath/domain/paths';
import type { ExportFile } from '@wisepath/domain/paths';

/** Markdown files as a zip the browser saves as `<name>.zip` */
export function markdownZip(files: ReadonlyArray<ExportFile>, name: string): StreamableFile {
  const zip = zipSync(Object.fromEntries(files.map((file) => [file.name, strToU8(file.content)])));
  const file = `${fileName(name, 'WisePath')}.zip`;
  // Old clients read the plain filename, so it keeps ASCII only; the encoded one carries accents and the rest
  const ascii = file.replace(/[^\x20-\x7e]|["\\]/g, '_');
  return new StreamableFile(zip, {
    type: 'application/zip',
    disposition: `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file)}`,
  });
}
