// 领域逻辑：组稿手稿的增删改与引用解析。
// 判断“@键 指到哪一条、是否悬空”，不依赖界面与存储。

import { resolveKey, uniqueCited } from './keys.js';
import { uid } from './library.js';

// 为手稿中每个引用键生成解析视图：{ raw, resolved: entryId|null }。
export function citationView(manuscript, entries) {
  return uniqueCited(manuscript).map((raw) => ({ raw, entryId: resolveKey(raw, entries) }));
}

// 整篇手稿的悬空引用（现键和别名都找不到条目）。
export function danglingCites(manuscript, entries) {
  return citationView(manuscript, entries).filter((c) => !c.entryId);
}

export function commitManuscript(draft, manuscripts) {
  const existing = draft.id ? manuscripts.find((m) => m.id === draft.id) : null;
  const record = {
    id: existing ? existing.id : draft.id || uid('ms'),
    title: draft.title.trim() || '未命名手稿',
    text: draft.text,
    updatedAt: new Date().toISOString().slice(0, 10),
  };
  return existing
    ? manuscripts.map((m) => (m.id === existing.id ? record : m))
    : [record, ...manuscripts];
}

export const deleteManuscript = (id, manuscripts) => manuscripts.filter((m) => m.id !== id);

// 跨手稿统计：某条目被哪些手稿以哪个写法引用。
export function entryUsage(entry, manuscripts) {
  const uses = [];
  for (const m of manuscripts) {
    for (const c of citationView(m, [entry])) {
      if (c.entryId === entry.id) uses.push({ manuscript: m, key: c.raw });
    }
  }
  return uses;
}
