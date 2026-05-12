export const DEFAULT_CATEGORIES = [
  { name: '上衣',   color: '#f48fb1' },
  { name: '裙裝',   color: '#ce93d8' },
  { name: '褲裝',   color: '#90caf9' },
  { name: '洋裝',   color: '#f48fb1' },
  { name: '外套',   color: '#a5d6a7' },
  { name: '套裝',   color: '#80cbc4' },
  { name: '日常',   color: '#ffe082' },
  { name: '鞋類',   color: '#bcaaa4' },
  { name: '包包',   color: '#ef9a9a' },
  { name: '猶豫',   color: '#b0bec5' },
  { name: '留校',   color: '#c5cae9' },
  { name: '冷凍',   color: '#b3e5fc' },
  { name: '未分類', color: '#e0e0e0' },
] as const;

export const DEFAULT_ORIGINS = ['日貨', '韓貨', '品牌', '蝦皮', '其他'] as const;

export const DEFAULT_COLORS = [
  '黑色', '白色', '灰色', '紅色', '杏色',
  '卡其色', '咖啡色', '綠色', '粉色', '紫色',
  '黃色', '藍色', '格紋', '條紋', '點點',
] as const;

export const DEFAULT_TAB_ORDER = ['items', 'photos', 'category', 'ranking'] as const;
export const DEFAULT_ENABLED_TABS = ['items', 'photos', 'category', 'ranking'] as const;

export const CLOSET_TAB_LABELS: Record<string, string> = {
  items:    '單品',
  photos:   '照片',
  category: '分類',
  ranking:  '排行',
};

export const SEASONS = ['春季', '夏季', '秋季', '冬季'] as const;
export const GRADES = ['A', 'B', 'C', 'D', 'E'] as const;

export const RANKING_PERIOD_LABELS: Record<string, string> = {
  month:   '當月',
  quarter: '當季',
  year:    '當年',
  rolling: '年度',
  all:     '累積',
};

export const APP_VERSION = '2.0.0';
export const VIP_CODE = 'MIMILOVEYOU520';
export const PHOTO_MAX_FREE = 5;
export const PHOTO_MAX_PRO = 20;
