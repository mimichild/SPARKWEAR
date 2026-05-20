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

// css 保留供相容性；native 是 React Native 在 iOS/Android 上可直接使用的字型名稱
export const APP_FONT_OPTIONS = [
  { key: 'default',           label: '系統預設',          css: 'system-ui, sans-serif',                                  native: undefined            },
  { key: 'pingfang_tc',       label: 'PingFang TC',       css: '"PingFang TC", sans-serif',                              native: 'PingFang TC'        },
  { key: 'helvetica',         label: 'Helvetica Neue',    css: '"Helvetica Neue", sans-serif',                           native: 'Helvetica Neue'     },
  { key: 'arial',             label: 'Arial',             css: 'Arial, sans-serif',                                      native: 'Arial'              },
  { key: 'georgia',           label: 'Georgia',           css: 'Georgia, serif',                                         native: 'Georgia'            },
  { key: 'times_new_roman',   label: 'Times New Roman',   css: '"Times New Roman", serif',                               native: 'Times New Roman'    },
  { key: 'trebuchet_ms',      label: 'Trebuchet MS',      css: '"Trebuchet MS", sans-serif',                             native: 'Trebuchet MS'       },
  { key: 'verdana',           label: 'Verdana',           css: 'Verdana, sans-serif',                                    native: 'Verdana'            },
  { key: 'baskerville',       label: 'Baskerville',       css: 'Baskerville, serif',                                     native: 'Baskerville'        },
  { key: 'palatino',          label: 'Palatino',          css: '"Palatino Linotype", Palatino, serif',                   native: 'Palatino'           },
  { key: 'futura',            label: 'Futura',            css: 'Futura, "Century Gothic", sans-serif',                   native: 'Futura'             },
  { key: 'gill_sans',         label: 'Gill Sans',         css: '"Gill Sans", "Gill Sans MT", sans-serif',                native: 'Gill Sans'          },
  { key: 'optima',            label: 'Optima',            css: 'Optima, "Segoe UI", sans-serif',                         native: 'Optima'             },
  { key: 'courier_new',       label: 'Courier New',       css: '"Courier New", monospace',                               native: 'Courier New'        },
  { key: 'monaco',            label: 'Monaco',            css: 'Monaco, monospace',                                      native: 'Monaco'             },
  // 以下需手動安裝字型，未安裝時自動降級為系統字型
  { key: 'noto_sans_tc',      label: 'Noto Sans TC',      css: '"Noto Sans TC", "PingFang TC", sans-serif',              native: 'NotoSansTC-Regular' },
  { key: 'noto_serif_tc',     label: 'Noto Serif TC',     css: '"Noto Serif TC", serif',                                 native: 'NotoSerifTC-Regular'},
] as const;

export const DEFAULT_FONT_KEY = 'default';
