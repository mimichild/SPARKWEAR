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

export const APP_FONT_OPTIONS = [
  { key: 'default',           label: '新細明體（預設）', css: '"PMingLiU", "MingLiU", "Noto Sans TC", sans-serif' },
  { key: 'noto_sans_tc',      label: 'Noto Sans TC',     css: '"Noto Sans TC", "PingFang TC", sans-serif' },
  { key: 'noto_serif_tc',     label: 'Noto Serif TC',    css: '"Noto Serif TC", "PMingLiU", serif' },
  { key: 'microsoft_jhenghei',label: '微軟正黑體',         css: '"Microsoft JhengHei", "PingFang TC", sans-serif' },
  { key: 'pingfang_tc',       label: 'PingFang TC',      css: '"PingFang TC", "Microsoft JhengHei", sans-serif' },
  { key: 'roboto',            label: 'Roboto',            css: 'Roboto, "Segoe UI", Arial, sans-serif' },
  { key: 'open_sans',         label: 'Open Sans',         css: '"Open Sans", "Segoe UI", sans-serif' },
  { key: 'lato',              label: 'Lato',              css: 'Lato, "Segoe UI", sans-serif' },
  { key: 'arial',             label: 'Arial',             css: 'Arial, Helvetica, sans-serif' },
  { key: 'helvetica',         label: 'Helvetica',         css: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  { key: 'georgia',           label: 'Georgia',           css: 'Georgia, serif' },
  { key: 'times_new_roman',   label: 'Times New Roman',   css: '"Times New Roman", Times, serif' },
  { key: 'trebuchet_ms',      label: 'Trebuchet MS',      css: '"Trebuchet MS", sans-serif' },
  { key: 'verdana',           label: 'Verdana',           css: 'Verdana, Geneva, sans-serif' },
  { key: 'tahoma',            label: 'Tahoma',            css: 'Tahoma, Geneva, sans-serif' },
  { key: 'segoe_ui',          label: 'Segoe UI',          css: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' },
  { key: 'calibri',           label: 'Calibri',           css: 'Calibri, "Segoe UI", sans-serif' },
  { key: 'courier_new',       label: 'Courier New',       css: '"Courier New", Courier, monospace' },
  { key: 'consolas',          label: 'Consolas',          css: 'Consolas, monospace' },
  { key: 'monaco',            label: 'Monaco',            css: 'Monaco, monospace' },
] as const;

export const DEFAULT_FONT_KEY = 'default';
