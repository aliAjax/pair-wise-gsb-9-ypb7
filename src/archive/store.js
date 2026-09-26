// 本机存档层：只负责读写本机 JSON、旧版数据迁移与备份文件的导入导出。
// 领域数据和判断逻辑不经过这里也能运行与测试。

import { seedEntries, seedManuscripts } from '../domain/seed.js';
import { deriveKey } from '../domain/keys.js';
import { buildCite } from '../domain/library.js';

const STORE_KEY = 'cite-key-governance-v1';
const LEGACY_KEY = 'research-library';

const freshState = () => ({ version: 1, entries: seedEntries, manuscripts: seedManuscripts });

// 迁移旧版文献库：当时没有键与别名，按题录推导一个。
function migrateLegacy(raw) {
  try {
    const old = JSON.parse(raw);
    if (!Array.isArray(old)) return null;
    const entries = old.map((e, i) => {
      const key = deriveKey(e.authors, e.year) + (i ? '' : '');
      return {
        id: e.id ? `ref_${e.id}` : `ref_legacy_${i}`,
        title: e.title || '',
        authors: e.authors || '',
        year: e.year ?? '',
        venue: e.venue || '',
        tags: Array.isArray(e.tags) ? e.tags : [],
        abstract: e.abstract || '',
        status: e.status || '待读',
        favorite: false,
        notes: e.notes || '',
        key,
        aliases: [],
        cite: e.cite || buildCite(e),
      };
    });
    return { version: 1, entries, manuscripts: [] };
  } catch {
    return null;
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.entries)) {
        return {
          version: 1,
          entries: parsed.entries,
          manuscripts: Array.isArray(parsed.manuscripts) ? parsed.manuscripts : [],
        };
      }
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) return migrateLegacy(legacy) || freshState();
  } catch {
    // 存档损坏时退回初始数据，不阻断使用。
  }
  return freshState();
}

export function saveState(state) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ version: 1, entries: state.entries, manuscripts: state.manuscripts }));
    return true;
  } catch {
    return false;
  }
}

export function exportArchive(state) {
  return JSON.stringify({ app: 'cite-key-governance', version: 1, ...state, exportedAt: new Date().toISOString() }, null, 2);
}

// 导入整份存档；结构不合法时返回错误说明。
export function importArchive(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: '文件不是合法 JSON' };
  }
  if (!parsed || !Array.isArray(parsed.entries)) return { error: '存档中缺少 entries 列表' };
  return {
    state: {
      version: 1,
      entries: parsed.entries.map((e) => ({ aliases: [], ...e })),
      manuscripts: Array.isArray(parsed.manuscripts) ? parsed.manuscripts : [],
    },
  };
}

export function downloadArchive(state) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([exportArchive(state)], { type: 'application/json' }));
  a.download = `cite-key-archive-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
