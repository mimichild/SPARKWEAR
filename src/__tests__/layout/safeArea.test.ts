import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '../../../');

// 所有有 header 的主要畫面
const SCREENS_WITH_HEADER = [
  'app/closet/(tabs)/index.tsx',
  'app/closet/item/[id].tsx',
  'app/closet/item/form.tsx',
  'app/outfits/index.tsx',
  'app/outfits/[id].tsx',
  'app/outfits/form.tsx',
];

function readScreen(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf-8');
}

describe('Safe Area 合規性 — 防止 Dynamic Island 被遮住', () => {
  describe('SafeAreaView 必須來自 react-native-safe-area-context', () => {
    SCREENS_WITH_HEADER.forEach((screenPath) => {
      it(`${screenPath}`, () => {
        const content = readScreen(screenPath);

        // 不能從 react-native 引入 SafeAreaView
        const rnImport = content.match(/import\s+\{([^}]+)\}\s+from\s+'react-native'/);
        if (rnImport) {
          expect(rnImport[1]).not.toContain('SafeAreaView');
        }

        // 若有使用 SafeAreaView，必須從 react-native-safe-area-context 引入
        if (content.includes('SafeAreaView')) {
          expect(content).toContain("from 'react-native-safe-area-context'");
        }
      });
    });
  });

  describe('SafeAreaView 必須使用 edges 限制只處理底部', () => {
    SCREENS_WITH_HEADER.forEach((screenPath) => {
      it(`${screenPath}`, () => {
        const content = readScreen(screenPath);
        // 確保 SafeAreaView 有 edges prop，避免頂部白色區域
        expect(content).toMatch(/edges=\{\[/);
      });
    });
  });

  describe('Header 必須使用 useSafeAreaInsets 取得頂部高度', () => {
    SCREENS_WITH_HEADER.forEach((screenPath) => {
      it(`${screenPath}`, () => {
        const content = readScreen(screenPath);
        expect(content).toContain('useSafeAreaInsets');
        // 確保有把 insets.top 應用到 paddingTop
        expect(content).toMatch(/insets\.top/);
      });
    });
  });

  describe('Root layout 必須有 SafeAreaProvider', () => {
    it('app/_layout.tsx', () => {
      const content = readScreen('app/_layout.tsx');
      expect(content).toContain('SafeAreaProvider');
      expect(content).toContain("from 'react-native-safe-area-context'");
    });
  });
});
