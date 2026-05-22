export const THEME_PRESETS = [
  { label: '櫻花粉', color: '#f1aba7' },
  { label: '珊瑚粉', color: '#ef9a9a' },
  { label: '奶茶棕', color: '#d9b8a7' },
  { label: '燕麥棕', color: '#cbb7a0' },
  { label: '鵝黃色', color: '#f3e8a4' },
  { label: '霧感薰衣', color: '#d7c4e8' },
  { label: '雲霧藍', color: '#bcd7f1' },
  { label: '酒紅色', color: '#7c2d40' },
  { label: '霧藍',   color: '#a7c7e7' },
  { label: '薄荷綠', color: '#b6e2d3' },
  { label: '嫩粉',   color: '#ffd1dc' },
  { label: '杏桃色', color: '#f6d7b0' },
] as const;

export const DEFAULT_THEME_COLOR = '#f1aba7';

// ios / android: 字型名稱（undefined = 系統預設，null = 此平台不支援，不顯示）
export const APP_FONT_OPTIONS = [
  // ── 兩個平台都支援 ────────────────────────────────────────────
  { key: 'default',     label: '系統預設',          css: 'system-ui',            ios: undefined,        android: undefined              },
  { key: 'serif',       label: 'Serif 明體',         css: 'serif',                ios: 'Georgia',        android: 'serif'                },
  { key: 'monospace',   label: 'Monospace 等寬',     css: 'monospace',            ios: 'Courier New',    android: 'monospace'            },
  // ── iOS 限定 ─────────────────────────────────────────────────
  { key: 'pingfang_tc', label: 'PingFang TC',       css: '"PingFang TC"',        ios: 'PingFang TC',    android: null                   },
  { key: 'helvetica',   label: 'Helvetica Neue',    css: '"Helvetica Neue"',     ios: 'Helvetica Neue', android: null                   },
  { key: 'arial',       label: 'Arial',             css: 'Arial',                ios: 'Arial',          android: null                   },
  { key: 'times_new_roman', label: 'Times New Roman', css: '"Times New Roman"', ios: 'Times New Roman', android: null                   },
  { key: 'trebuchet_ms', label: 'Trebuchet MS',     css: '"Trebuchet MS"',       ios: 'Trebuchet MS',   android: null                   },
  { key: 'verdana',     label: 'Verdana',           css: 'Verdana',              ios: 'Verdana',        android: null                   },
  { key: 'baskerville', label: 'Baskerville',       css: 'Baskerville',          ios: 'Baskerville',    android: null                   },
  { key: 'palatino',    label: 'Palatino',          css: 'Palatino',             ios: 'Palatino',       android: null                   },
  { key: 'futura',      label: 'Futura',            css: 'Futura',               ios: 'Futura',         android: null                   },
  { key: 'gill_sans',   label: 'Gill Sans',         css: '"Gill Sans"',          ios: 'Gill Sans',      android: null                   },
  { key: 'optima',      label: 'Optima',            css: 'Optima',               ios: 'Optima',         android: null                   },
  { key: 'monaco',      label: 'Monaco',            css: 'Monaco',               ios: 'Monaco',         android: null                   },
  // ── Android 限定 ─────────────────────────────────────────────
  { key: 'light',       label: '細體 Light',         css: 'sans-serif-light',     ios: null,             android: 'sans-serif-light'     },
  { key: 'thin',        label: '超細 Thin',           css: 'sans-serif-thin',      ios: null,             android: 'sans-serif-thin'      },
  { key: 'medium',      label: '中粗 Medium',         css: 'sans-serif-medium',    ios: null,             android: 'sans-serif-medium'    },
  { key: 'condensed',   label: '窄體 Condensed',      css: 'sans-serif-condensed', ios: null,             android: 'sans-serif-condensed' },
] as const;

export const DEFAULT_FONT_KEY = 'default';
