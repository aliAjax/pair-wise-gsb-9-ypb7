// 引文键领域逻辑：生成、别名解析、争用判定。纯函数，不触碰界面与存档。

export const slug = (s) =>
  (s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '');

// 由题录生成候选键：第一作者姓 + 年份 + 标题首词
export function makeKey({ authors, year, title }) {
  const surname = slug((authors || '').split(/[,&]| and /i)[0]);
  const word = slug((title || '').trim().split(/\s+/)[0]);
  return `${surname || 'ref'}${year || 'nd'}${word}`;
}

export function formatCite({ authors, year, title, venue }) {
  return `${authors} (${year}). ${title}. ${venue}.`;
}

// 提取手稿中的引文键，支持 [@key] 与 [@key1; @key2]
export function extractKeys(text) {
  const found = new Set();
  for (const m of (text || '').matchAll(/\[@([^\]]+)\]/g)) {
    m[1]
      .split(';')
      .map((k) => k.trim().replace(/^@/, ''))
      .filter(Boolean)
      .forEach((k) => found.add(k));
  }
  return [...found];
}

// 现键或历史别名都能回到原条目
export function findByKey(items, key) {
  return items.find((x) => x.key === key || (x.aliases || []).includes(key)) || null;
}

// 判定把 key 分配给 selfId 是否争用：
// 1) 他人现键 2) 他人历史别名 3) 手稿已占用（且不归属本条目）
export function keyConflicts(items, manuscript, selfId, key) {
  const out = [];
  for (const it of items) {
    if (it.id === selfId) continue;
    if (it.key === key) out.push({ kind: 'key', item: it });
    else if ((it.aliases || []).includes(key)) out.push({ kind: 'alias', item: it });
  }
  if (extractKeys(manuscript).includes(key)) {
    const owner = findByKey(items, key);
    if (!owner || owner.id !== selfId) out.push({ kind: 'manuscript', item: owner });
  }
  return out;
}

// 在 base 后追加 a/b/c… 直到避开所有争用（含手稿占用键）
export function uniqueKey(base, items, manuscript, selfId) {
  const free = (k) => keyConflicts(items, manuscript, selfId, k).length === 0;
  if (free(base)) return base;
  for (let i = 0; i < 26; i += 1) {
    const k = base + String.fromCharCode(97 + i);
    if (free(k)) return k;
  }
  let n = 2;
  while (!free(base + n)) n += 1;
  return base + n;
}

// 换键：旧键收进历史别名，保持手稿旧引用仍可解析
export function rekey(item, newKey) {
  if (item.key === newKey) return item;
  const aliases = [...new Set([...(item.aliases || []), item.key])].filter(
    (a) => a !== newKey
  );
  return { ...item, key: newKey, aliases };
}

// 手稿引文解析：每个键回到条目（可能经由别名），或标记为悬空
export function resolveManuscript(manuscript, items) {
  return extractKeys(manuscript).map((key) => {
    const item = findByKey(items, key);
    return { key, item, viaAlias: !!item && item.key !== key, dangling: !item };
  });
}
