import React, { useEffect, useMemo, useState } from 'react';
import { claimFor, sameKey, validKey } from '../domain/keys.js';
import { commitEntry, planSave } from '../domain/library.js';

// 题录编辑弹窗：保存时做引文键治理。
// props:
//   entry        编辑现有条目时传入；新增时为 null
//   entries/manuscripts  当前全局数据（冲突判断用）
//   onClose      取消
//   onCommit(result, mode)  提交成功，result 为 { entries }，mode 为 'new'|'keep'|'change'
export default function EntryModal({ entry, entries, manuscripts, onClose, onCommit }) {
  const [form, setForm] = useState({
    title: entry?.title ?? '',
    authors: entry?.authors ?? '',
    year: entry?.year ?? 2024,
    venue: entry?.venue ?? '',
    abstract: entry?.abstract ?? '',
    tags: (entry?.tags ?? []).join(', '),
    status: entry?.status ?? '待读',
    notes: entry?.notes ?? '',
  });
  const [resolution, setResolution] = useState(null); // null | 'keep' | 'change'
  const [changeKey, setChangeKey] = useState('');
  const [error, setError] = useState('');

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setResolution(null); // 题录一动，旧的冲突处理决定作废，需重新确认
  };

  const draft = {
    id: entry?.id,
    ...form,
    year: form.year === '' ? '' : Number(form.year) || form.year,
    tags: form.tags.split(/[,，]/).map((x) => x.trim()).filter(Boolean),
  };

  const plan = useMemo(() => planSave(draft, entries, manuscripts), [JSON.stringify(form), entries, manuscripts]);
  const conflict = plan.status === 'conflict';
  const keyUnchanged = entry ? sameKey(plan.proposed, entry.key) : false;

  useEffect(() => {
    if (!conflict) setResolution(null);
  }, [conflict]);

  // “换键”候选的即时校验。
  const changeClaims = resolution === 'change' && changeKey.trim()
    ? claimFor(changeKey.trim(), entries, manuscripts, entry?.id ?? null)
    : null;
  const changeValid = resolution === 'change' && validKey(changeKey) && changeClaims && !changeClaims.entry && !changeClaims.heldBy.length;

  const blocked =
    !form.title.trim() ||
    (conflict &&
      resolution !== 'keep' &&
      !changeValid);

  const save = () => {
    let mode = null;
    let res = null;
    if (conflict) {
      if (resolution === 'keep') {
        res = 'keep';
        mode = 'keep';
      } else if (resolution === 'change') {
        res = { key: changeKey.trim() };
        mode = 'change';
      }
    } else {
      mode = keyUnchanged && entry ? 'unchanged' : 'change';
    }
    const result = commitEntry(draft, entries, manuscripts, res);
    if (result.error) {
      setError(result.error);
      return;
    }
    onCommit(result, mode);
  };

  return (
    <div className="modal-bg" onMouseDown={onClose}>
      <div className="modal entry-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>×</button>
        <span className="crumb">{entry ? 'EDIT REFERENCE' : 'NEW REFERENCE'}</span>
        <h2>{entry ? '编辑文献题录' : '添加一篇文献'}</h2>

        <label>标题<input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="论文或书籍标题" /></label>
        <label>作者<input value={form.authors} onChange={(e) => set('authors', e.target.value)} placeholder="如 Clark, A. & Chalmers, D." /></label>
        <div className="two">
          <label>年份<input type="number" value={form.year} onChange={(e) => set('year', e.target.value)} /></label>
          <label>出版物<input value={form.venue} onChange={(e) => set('venue', e.target.value)} /></label>
        </div>
        <div className="two">
          <label>关键词<input value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="用逗号分隔" /></label>
          <label>阅读状态
            <select value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option>待读</option><option>阅读中</option><option>已读</option>
            </select>
          </label>
        </div>
        <label>摘要<textarea rows="3" value={form.abstract} onChange={(e) => set('abstract', e.target.value)} /></label>

        <div className="key-panel">
          <div className="key-panel-head">
            <small>引文键 · CITE KEY</small>
            <code>@{plan.proposed}</code>
            {conflict
              ? <span className="key-flag clash">键冲突</span>
              : <span className="key-flag ok">可用</span>}
          </div>

          {entry && (
            <div className="key-meta">
              现键 <code>@{entry.key}</code>
              {entry.aliases.length > 0 && <>　历史别名 {entry.aliases.map((a) => <code key={a}>@{a}</code>)}</>}
            </div>
          )}

          {conflict && (
            <div className="conflict-box">
              <p className="conflict-title">保存被挡住：键 <code>@{plan.proposed}</code> 存在争用</p>
              <ul className="claim-list">
                {plan.claims.entry && (
                  <li><b>条目争用</b>：《{plan.claims.entry.title || '无题'}》已持有此键
                    （其现键 <code>@{plan.claims.entry.key}</code>
                    {plan.claims.entry.aliases.some((a) => sameKey(a, plan.proposed)) && '或历史别名'}）</li>
                )}
                {plan.claims.heldBy.map((h, i) => (
                  <li key={i}><b>手稿占用</b>：《{h.manuscript.title}》中已有 <code>@{h.key}</code> 引用，手稿占用的键不能再次分配</li>
                ))}
              </ul>

              <div className="resolve-opts">
                <label className={'resolve-opt ' + (resolution === 'change' ? 'on' : '')}>
                  <input type="radio" checked={resolution === 'change'} onChange={() => { setResolution('change'); if (!changeKey) setChangeKey(plan.suggested); }} />
                  <span>
                    <b>换键</b>
                    <small>改用无争用的新键；旧键自动收进历史别名，手稿旧写法仍回到本条目</small>
                  </span>
                </label>
                {resolution === 'change' && (
                  <div className="change-row">
                    <span>@</span>
                    <input value={changeKey} onChange={(e) => setChangeKey(e.target.value)} placeholder="新引文键" />
                    {changeKey.trim() && !validKey(changeKey) && <em className="bad">格式不合法</em>}
                    {changeClaims?.entry && <em className="bad">已被《{changeClaims.entry.title || '无题'}》占用</em>}
                    {changeClaims?.heldBy.length > 0 && <em className="bad">已被手稿《{changeClaims.heldBy[0].manuscript.title}》占用</em>}
                    {changeValid && <em className="good">此键可用</em>}
                    <button type="button" onClick={() => setChangeKey(plan.suggested)}>建议：@{plan.suggested}</button>
                  </div>
                )}

                {entry && (
                  <label className={'resolve-opt ' + (resolution === 'keep' ? 'on' : '')}>
                    <input type="radio" checked={resolution === 'keep'} onChange={() => setResolution('keep')} />
                    <span>
                      <b>沿用原键 @{entry.key}</b>
                      <small>不改键；题录推导出的 @{plan.proposed} 也会留作别名</small>
                    </span>
                  </label>
                )}
              </div>
              <p className="block-hint">冲突未解决前无法保存。</p>
            </div>
          )}
        </div>

        {error && <p className="form-error">{error}</p>}
        <button className="primary full" disabled={blocked} onClick={save}>
          {conflict ? '解决冲突后保存' : '保存文献'}
        </button>
      </div>
    </div>
  );
}
