// 领域逻辑：引文键的生成、别名解析与冲突判断。
// 纯函数模块，不依赖 React、存储或界面；所有“键能不能用”的判断都在这里。

// 规范化：不区分大小写、去除空白，统一比较口径。
export const normKey = (k) => String(k || '').trim().toLowerCase();
export const sameKey = (a, b) => normKey(a) === normKey(b) && normKey(a) !== '';

// 合法键：字母/数字开头，只含字母、数字、连字符与下划线。
export const validKey = (k) => /^[\p{L}\p{N}][\p{L}\p{N}_-]*$/u.test(String(k || '').trim());

// 取第一作者姓氏：
// “Clark, A. & Chalmers, D.” → Clark（逗号前的姓）
// “John Smith; Jane Doe”      → Smith（空格后的最后一段）
export function firstSurname(authors) {
  const head = String(authors || '').split(/&|;|，/)[0].trim();
  if (!head) return 'anon';
  if (head.includes(',')) return head.split(',')[0].trim() || 'anon';
  const parts = head.split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
}

// 由题录推导默认键，如 Clark1998。
export function deriveKey(authors, year) {
  const y = year ? String(year).trim() : 'nd';
  return `${firstSurname(authors).replace(/[^\p{L}\p{N}]/gu, '') || 'anon'}${y}`;
}

// 冲突时推荐消歧键：直接在原键后追加 a/b…、2/3…（保留原大小写）。
export function suggestKey(proposed, used) {
  const taken = new Set(used.map(normKey));
  const base = String(proposed || 'key').trim();
  for (const suffix of ['a', 'b', 'c', 'd', 'e', 2, 3, 4, 5, 6, 7, 8, 9]) {
    const candidate = `${base}${suffix}`;
    if (!taken.has(normKey(candidate))) return candidate;
  }
  return `${base}x${Date.now()}`;
}

// 手稿中引用的键 -> 解析到条目 id（现键或历史别名都能找回原条目）。
export function resolveKey(key, entries) {
  const n = normKey(key);
  if (!n) return null;
  const hit = entries.find((e) => sameKey(e.key, key) || (e.aliases || []).some((a) => sameKey(a, key)));
  return hit ? hit.id : null;
}

// 手稿正文中提取的所有 @key（保留原始大小写）。
export const citedKeys = (manuscript) => {
  const ms = String(manuscript?.text || '');
  return (ms.match(/@[\p{L}\p{N}][\p{L}\p{N}_-]*/gu) || []).map((k) => k.slice(1));
};

// 去重后的引用键（按规范化判重，保留首次出现的写法）。
export function uniqueCited(manuscript) {
  const seen = new Map();
  for (const k of citedKeys(manuscript)) {
    const n = normKey(k);
    if (!seen.has(n)) seen.set(n, k);
  }
  return [...seen.values()];
};

// 手稿占用情况：每个规范化键对应哪些手稿（含首次出现的写法）。悬空键同样被占用。
export function occupancy(manuscripts) {
  const map = new Map();
  for (const m of manuscripts) {
    for (const raw of uniqueCited(m)) {
      const n = normKey(raw);
      if (!map.has(n)) map.set(n, []);
      map.get(n).push({ key: raw, manuscript: m });
    }
  }
  return map;
}

// 检查一个“拟用键”的争用方。
// ignoreId 为正在编辑的条目 id：手稿里解析到该条目自身的引用（现键或别名）不算争用，
// 因为键治理动作（换键/提升别名）的目的正是承接这些引用；解析到别的条目或悬空占用才算。
export function claimFor(proposed, entries, manuscripts, ignoreId = null) {
  const n = normKey(proposed);
  const entry = entries.find((e) => e.id !== ignoreId && (sameKey(e.key, proposed) || (e.aliases || []).some((a) => sameKey(a, proposed)))) || null;
  const heldBy = [];
  for (const m of manuscripts) {
    const raw = uniqueCited(m).find((k) => normKey(k) === n);
    if (!raw) continue;
    if (ignoreId && resolveKey(raw, entries) === ignoreId) continue;
    heldBy.push({ key: raw, manuscript: m });
  }
  return { entry, heldBy };
}
