// 领域逻辑：条目题录、保存时的冲突计划、引用文本与查找。
// 纯函数：输入状态，输出新状态或判断结果，不读写本机存档。

import { claimFor, deriveKey, normKey, sameKey, suggestKey } from './keys.js';

let seq = 1;
export const uid = (prefix) => {
  const t = Date.now().toString(36);
  seq = (seq + 1) % 1e6;
  return `${prefix}_${t}${seq.toString(36).padStart(3, '0')}`;
};

// 由题录拼引用文本，尽量保留旧格式：“作者 (年份). 标题. 出版物.”
export function buildCite({ authors, year, title, venue }) {
  const who = authors || '佚名';
  const when = year ? ` (${year})` : '';
  const where = venue ? ` ${venue}.` : '';
  return `${who}${when}. ${title || '（无题）'}.${where}`;
}

// 保存前的冲突评估。
// draft: { id?, title, authors, year, ... }；existing 为该条目已保存版本（新条目为 null）。
// 返回：
//  status: 'clean'（可直接保存）| 'conflict'（必须先处理）
//  proposed: 题录推导出的键
//  suggested: 消歧建议键
//  claims: 争用方 { entry, heldBy }
export function planSave(draft, entries, manuscripts) {
  const existing = draft.id ? entries.find((e) => e.id === draft.id) || null : null;
  const ignoreId = existing ? existing.id : null;
  const proposed = draft.key?.trim() || deriveKey(draft.authors, draft.year);
  const claims = claimFor(proposed, entries, manuscripts, ignoreId);
  const conflict = Boolean(claims.entry || claims.heldBy.length);
  const used = [
    ...entries.filter((e) => e.id !== ignoreId).map((e) => e.key),
    ...manuscripts.flatMap((m) => (m.text.match(/@[\p{L}\p{N}][\p{L}\p{N}_-]*/gu) || []).map((k) => k.slice(1))),
  ];
  return {
    status: conflict ? 'conflict' : 'clean',
    proposed,
    suggested: conflict ? suggestKey(proposed, used) : proposed,
    claims,
  };
}

// 提交保存。resolution:
//   null      → 仅在无冲突时按推导键提交
//   'keep'    → 沿用原键（仅编辑已有条目时合法；不改名则直接通过）
//   { key }   → 换键：该键必须无争用且合法
// 换键时旧键自动收进历史别名，手稿旧写法仍能回到本条目。
export function commitEntry(draft, entries, manuscripts, resolution) {
  const existing = draft.id ? entries.find((e) => e.id === draft.id) : null;
  const plan = planSave(draft, entries, manuscripts);
  let finalKey = plan.proposed;

  if (resolution === 'keep') {
    if (!existing) return { error: '新文献没有“原键”可沿用，请改换新键' };
    finalKey = existing.key;
  } else if (resolution && typeof resolution === 'object' && resolution.key) {
    const chosen = resolution.key.trim();
    if (!/^[\p{L}\p{N}][\p{L}\p{N}_-]*$/u.test(chosen)) return { error: '键格式不合法：以字母或数字开头，只含字母、数字、连字符与下划线' };
    const claims = claimFor(chosen, entries, manuscripts, existing ? existing.id : null);
    if (claims.entry) return { error: `键 @${chosen} 已被《${claims.entry.title || '无题'}》占用` };
    if (claims.heldBy.length) return { error: `键 @${chosen} 已在手稿中占用，不能再次分配` };
    finalKey = chosen;
  } else if (plan.status === 'conflict') {
    return { error: '键冲突尚未解决，无法保存' };
  }

  const aliases = new Set(existing?.aliases || []);
  // 沿用原键：若推导键与原键不同（改了作者/年份），推导键也留作别名，留住这次变更。
  if (existing && !sameKey(finalKey, existing.key)) aliases.add(existing.key);
  if (resolution === 'keep' && !sameKey(plan.proposed, existing.key)) aliases.add(plan.proposed);

  const record = {
    id: existing ? existing.id : draft.id || uid('ref'),
    title: draft.title.trim(),
    authors: draft.authors.trim(),
    year: draft.year === '' || draft.year == null ? '' : Number(draft.year) || draft.year,
    venue: draft.venue.trim(),
    tags: draft.tags,
    abstract: draft.abstract,
    status: draft.status || existing?.status || '待读',
    notes: draft.notes ?? existing?.notes ?? '',
    favorite: draft.favorite ?? existing?.favorite ?? false,
    key: finalKey,
    aliases: [...aliases].filter((a) => !sameKey(a, finalKey)).sort((a, b) => a.localeCompare(b)),
    cite: buildCite(draft),
  };

  return existing
    ? { entries: entries.map((e) => (e.id === existing.id ? record : e)) }
    : { entries: [record, ...entries] };
}

// 别名提升为现键：旧现键自动收进别名。
export function promoteAlias(entryId, alias, entries, manuscripts) {
  const existing = entries.find((e) => e.id === entryId);
  if (!existing) return { error: '条目不存在' };
  const claims = claimFor(alias, entries, manuscripts, entryId);
  if (claims.entry) return { error: `该键属于《${claims.entry.title}》` };
  if (claims.heldBy.length) return { error: '该键已在手稿中占用，不能再次分配' };
  const aliases = new Set(existing.aliases.filter((a) => !sameKey(a, alias)));
  aliases.add(existing.key);
  return {
    entries: entries.map((e) =>
      e.id === entryId ? { ...e, key: alias.trim(), aliases: [...aliases].sort((a, b) => a.localeCompare(b)) } : e,
    ),
  };
}

export const deleteEntry = (id, entries) => entries.filter((e) => e.id !== id);

// 查找：标题/作者/摘要/出版物/现键/历史别名全部可命中。
export function searchEntries(items, query) {
  const q = normKey(query.replace(/[@\s]/g, ''));
  if (!q) return items;
  return items.filter((e) =>
    [e.title, e.authors, e.abstract, e.venue, e.key, ...(e.aliases || [])]
      .join(' ')
      .toLowerCase()
      .replace(/\s+/g, '')
      .includes(q),
  );
}

export const allTags = (entries) => [...new Set(entries.flatMap((e) => e.tags || []))].sort((a, b) => a.localeCompare(b, 'zh'));
