import { Channel } from '../types/channel';

/**
 * Extracts an attribute value from an #EXTINF line.
 * Handles both key="value" and key='value' as well as unquoted key=value.
 */
export function extractAttribute(line: string, attributeName: string): string | null {
  const regex = new RegExp(`${attributeName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s,]+))`, 'i');
  const match = line.match(regex);
  if (match) {
    return match[1] ?? match[2] ?? match[3] ?? null;
  }
  return null;
}

/**
 * Parses raw M3U / M3U8 content into a list of Channel objects.
 */
export function parseM3U(content: string): Channel[] {
  const lines = content.split(/\r?\n/);
  const channels: Channel[] = [];
  const idCounts = new Map<string, number>();

  let currentExtinf: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    if (line.startsWith('#EXTINF:')) {
      currentExtinf = line;
      continue;
    }

    if (line.startsWith('#')) {
      // Other directive/comment (#EXTM3U, #EXTVLCOPT, etc.)
      continue;
    }

    // If we have an active #EXTINF and this line is a URL:
    if (currentExtinf) {
      const url = line;

      // Extract comma-separated display title
      const commaIndex = currentExtinf.indexOf(',');
      const rawTitle = commaIndex !== -1 ? currentExtinf.slice(commaIndex + 1).trim() : '';

      // Extract metadata attributes
      const tvgName = extractAttribute(currentExtinf, 'tvg-name');
      const tvgId = extractAttribute(currentExtinf, 'tvg-id');
      const tvgLogo = extractAttribute(currentExtinf, 'tvg-logo');
      const groupTitle = extractAttribute(currentExtinf, 'group-title');

      const name = tvgName || rawTitle || 'Unknown Channel';
      const logo = tvgLogo || '';
      const group = groupTitle || 'General';

      // Determine channel ID
      let baseId = tvgId || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `channel-${channels.length + 1}`;

      // Ensure uniqueness if multiple channels share the same tvg-id
      const count = idCounts.get(baseId) || 0;
      idCounts.set(baseId, count + 1);
      const uniqueId = count === 0 ? baseId : `${baseId}-${count + 1}`;

      channels.push({
        id: uniqueId,
        name,
        logo,
        group,
        url
      });

      currentExtinf = null;
    }
  }

  return channels;
}

