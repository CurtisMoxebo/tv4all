import fs from 'fs';
import path from 'path';
import os from 'os';
import { authService } from '../src/services/authService';

export const SAMPLE_M3U_CONTENT = `#EXTM3U
#EXTINF:-1 tvg-id="France2.fr" tvg-name="France 2" tvg-logo="https://example.com/france2.png" group-title="General",France 2
http://stream.example.com/france2.m3u8
#EXTINF:-1 tvg-id="France3.fr" tvg-name="France 3" tvg-logo="https://example.com/france3.png" group-title="General",France 3
http://stream.example.com/france3.m3u8
#EXTINF:-1 tvg-id="France24.fr" tvg-name="France 24" tvg-logo="https://example.com/france24.png" group-title="News",France 24
http://stream.example.com/france24.m3u8
`;

export interface TestContext {
  tempDir: string;
  playlistPath: string;
  cleanup: () => void;
  adminToken: string;
  userToken: string;
}

export function createTestContext(initialContent: string = SAMPLE_M3U_CONTENT): TestContext {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tv4all-test-'));
  const playlistPath = path.join(tempDir, 'test-index.m3u8');

  fs.writeFileSync(playlistPath, initialContent, 'utf-8');

  // Point channel service to this isolated test playlist
  process.env.CHANNELS_FILE_PATH = playlistPath;
  process.env.NODE_ENV = 'test';

  const adminToken = authService.generateToken('tv4alladmin', 'admin');
  const userToken = authService.generateToken('tv4all', 'user');

  const cleanup = () => {
    try {
      if (fs.existsSync(playlistPath)) {
        fs.unlinkSync(playlistPath);
      }
      if (fs.existsSync(tempDir)) {
        fs.rmdirSync(tempDir);
      }
    } catch {
      // Ignore cleanup error on windows if temporarily locked
    }
  };

  return {
    tempDir,
    playlistPath,
    cleanup,
    adminToken,
    userToken
  };
}

