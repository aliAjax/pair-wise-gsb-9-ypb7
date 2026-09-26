// 本机存档：localStorage 读写与旧版数据迁移
import { seedItems, seedManuscript } from '../data/seed';
import { makeKey, uniqueKey } from '../core/citekeys';

const STORE = 'research-library-v2';
const LEGACY = 'research-library';

export function loadState() {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) return JSON.parse(raw);
    const legacy = localStorage.getItem(LEGACY);
    if (legacy) return migrate(JSON.parse(legacy));
  } catch {
    /* 存档损坏时回落到种子数据 */
  }
  return { items: seedItems, manuscript: seedManuscript };
}

// 旧版条目没有引文键：逐一补键并保证互不冲突
function migrate(items) {
  const out = [];
  for (const it of items) {
    const key = uniqueKey(makeKey(it), out, '', it.id);
    out.push({ aliases: [], notes: '', ...it, key });
  }
  return { items: out, manuscript: seedManuscript };
}

export function saveState(state) {
  localStorage.setItem(STORE, JSON.stringify(state));
}
