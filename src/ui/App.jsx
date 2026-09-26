import React, { useEffect, useMemo, useState } from 'react';
import {
  makeKey,
  formatCite,
  keyConflicts,
  uniqueKey,
  rekey,
  resolveManuscript,
} from '../core/citekeys';
import { loadState, saveState } from '../store/persist';

const KIND_LABEL = {
  key: '当前键相同',
  alias: '历史别名相同',
  manuscript: '手稿已占用该键',
};
const emptyForm = { title: '', authors: '', year: '2026', venue: '', abstract: '', tags: '' };

export default function App() {
  const [state, setState] = useState(loadState);
  const { items, manuscript } = state;
  const patch = (p) => setState((s) => ({ ...s, ...p }));
  const setItems = (fn) =>
    setState((s) => ({ ...s, items: typeof fn === 'function' ? fn(s.items) : fn }));

  const [view, setView] = useState('library');
  const [selected, setSelected] = useState(1);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('全部');
  const [status, setStatus] = useState('全部');
  const [modal, setModal] = useState(null);
  const [conflict, setConflict] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => saveState(state), [state]);
  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 2600);
    return () => clearTimeout(t);
  }, [notice]);

  const tags = ['全部', ...new Set(items.flatMap((x) => x.tags))];
  const resolved = useMemo(() => resolveManuscript(manuscript, items), [manuscript, items]);

  const filtered = useMemo(
    () =>
      items.filter((x) => {
        // 查找范围含现键与历史别名：用旧键也能回到原条目
        const hay =
          `${x.title}${x.authors}${x.abstract}${x.key}${(x.aliases || []).join(' ')}`.toLowerCase();
        return (
          (status === '全部' || x.status === status) &&
          (tag === '全部' || x.tags.includes(tag)) &&
          hay.includes(query.toLowerCase())
        );
      }),
    [items, status, tag, query]
  );

  const cur = items.find((x) => x.id === selected) || items[0];

  const commit = (entry, mode, msg) => {
    const full = { ...entry, cite: formatCite(entry) };
    setItems((xs) =>
      mode === 'edit' ? xs.map((x) => (x.id === full.id ? full : x)) : [...xs, full]
    );
    setModal(null);
    setConflict(null);
    setSelected(full.id);
    setView('library');
    setNotice(msg || (mode === 'edit' ? '题录已保存' : '文献已加入研究库'));
  };

  // 保存题录：先按题录重算引文键，有争用则挂起，等用户裁决，绝不静默写库
  const attemptSave = () => {
    const { mode, id, form } = modal;
    if (!form.title) return;
    const fields = {
      title: form.title.trim(),
      authors: form.authors.trim(),
      year: Number(form.year),
      venue: form.venue.trim(),
      abstract: form.abstract.trim(),
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };
    if (mode === 'edit') {
      const orig = items.find((x) => x.id === id);
      const entry = { ...orig, ...fields };
      const proposed = makeKey(entry);
      if (proposed === orig.key) return commit(entry, 'edit');
      const fights = keyConflicts(items, manuscript, id, proposed);
      if (!fights.length) {
        return commit(rekey(entry, proposed), 'edit', `引文键换为 ${proposed}，旧键已留存为别名`);
      }
      setConflict({
        mode,
        entry,
        proposed,
        keepKey: orig.key,
        next: uniqueKey(proposed, items, manuscript, id),
        fights,
      });
    } else {
      const entry = { ...fields, id: Date.now(), status: '待读', notes: '', aliases: [] };
      const proposed = makeKey(entry);
      const fights = keyConflicts(items, manuscript, entry.id, proposed);
      if (!fights.length) return commit({ ...entry, key: proposed }, 'add');
      // 新增条目没有“原键”可沿用，只能换键或返回修改
      setConflict({
        mode,
        entry,
        proposed,
        keepKey: null,
        next: uniqueKey(proposed, items, manuscript, entry.id),
        fights,
      });
    }
  };

  const resolveConflict = (choice) => {
    if (!conflict) return;
    if (choice === 'rekey') {
      const keyed =
        conflict.mode === 'edit'
          ? rekey(conflict.entry, conflict.next)
          : { ...conflict.entry, key: conflict.next };
      return commit(
        keyed,
        conflict.mode,
        `已换键为 ${conflict.next}${conflict.mode === 'edit' ? '，旧键已留存为别名' : ''}`
      );
    }
    if (choice === 'keep') {
      return commit(conflict.entry, 'edit', `沿用原键 ${conflict.keepKey}`);
    }
    setConflict(null);
  };

  const openAdd = () => setModal({ mode: 'add', form: emptyForm });
  const openEdit = () =>
    setModal({
      mode: 'edit',
      id: cur.id,
      form: {
        title: cur.title,
        authors: cur.authors,
        year: String(cur.year),
        venue: cur.venue,
        abstract: cur.abstract || '',
        tags: cur.tags.join(', '),
      },
    });
  const setForm = (k, v) => setModal({ ...modal, form: { ...modal.form, [k]: v } });

  const copy = (text, msg) => {
    navigator.clipboard?.writeText(text);
    setNotice(msg);
  };
  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([items.map((x) => x.cite).join('\n')], { type: 'text/plain' })
    );
    a.download = 'references.txt';
    a.click();
    setNotice('引用列表已导出');
  };

  return (
    <div className="app">
      <aside>
        <div className="logo"><span>∴</span> LITERATURE</div>
        <div className="library-head">
          <span>引文键治理台</span>
          <strong>{items.length}<small> 篇文献</small></strong>
        </div>
        <nav>
          <button className={view === 'library' && status === '全部' ? 'active' : ''}
            onClick={() => { setView('library'); setStatus('全部'); }}>
            ▤ <span>所有文献</span><b>{items.length}</b>
          </button>
          <button className={view === 'library' && status === '待读' ? 'active' : ''}
            onClick={() => { setView('library'); setStatus('待读'); }}>
            ▥ <span>待读</span><b>{items.filter((x) => x.status === '待读').length}</b>
          </button>
          <button className={view === 'library' && status === '已读' ? 'active' : ''}
            onClick={() => { setView('library'); setStatus('已读'); }}>
            ✓ <span>已读</span><b>{items.filter((x) => x.status === '已读').length}</b>
          </button>
          <button className={view === 'manuscript' ? 'active' : ''} onClick={() => setView('manuscript')}>
            ✎ <span>手稿引文</span><b>{resolved.length}</b>
          </button>
        </nav>
        <div className="side-tags">
          <small>标签</small>
          {tags.slice(1, 5).map((t) => (
            <button key={t} onClick={() => { setView('library'); setTag(t); }}># {t}</button>
          ))}
        </div>
        <div className="side-foot">
          <small>本地数据库 · 已同步</small>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <span className="crumb">RESEARCH / {view === 'manuscript' ? 'MANUSCRIPT' : 'LIBRARY'}</span>
            <h1>{view === 'manuscript' ? '手稿引文' : '所有文献'}</h1>
          </div>
          <div className="actions">
            <button className="outline" onClick={download}>↓ 导出引用</button>
            <button className="primary" onClick={openAdd}>＋ 添加文献</button>
          </div>
        </header>

        {view === 'manuscript' ? (
          <div className="body">
            <section className="manuscript">
              <div className="detail-section">
                <h4>手稿正文 <span>MANUSCRIPT</span></h4>
                <textarea
                  className="manu"
                  value={manuscript}
                  onChange={(e) => patch({ manuscript: e.target.value })}
                  placeholder="用 [@引文键] 引用文献，多个引用用分号：[@key1; @key2]"
                />
                <p className="hint">
                  手稿中出现的键会被占用，不能再分配给其他条目；历史别名同样解析到原条目。
                </p>
              </div>
              <div className="detail-section">
                <h4>引文解析 <span>RESOLVED · {resolved.length}</span></h4>
                {resolved.map((r) => (
                  <div className="ref-row" key={r.key}>
                    <span className="ref-key">@{r.key}</span>
                    {r.dangling ? (
                      <span className="ref-bad">未解析 · 该键已被手稿占用，不可再次分配</span>
                    ) : (
                      <span className="ref-title">
                        {r.item.title}
                        {r.viaAlias && <em>（经别名 → @{r.item.key}）</em>}
                      </span>
                    )}
                  </div>
                ))}
                {!resolved.length && <div className="no-result">手稿中还没有 [@引文键]</div>}
              </div>
            </section>
          </div>
        ) : (
          <>
            <div className="toolbar">
              <div className="search">
                ⌕
                <input
                  placeholder="搜索标题、作者、摘要或引文键（含历史别名）…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && <button onClick={() => setQuery('')}>×</button>}
              </div>
              <div className="tag-filter">
                {tags.map((t) => (
                  <button key={t} className={tag === t ? 'on' : ''} onClick={() => setTag(t)}>{t}</button>
                ))}
              </div>
            </div>
            <div className="body">
              <section className="paper-list">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    className={'paper ' + (selected === p.id ? 'selected' : '')}
                    onClick={() => setSelected(p.id)}
                  >
                    <div className="paper-year">{p.year}</div>
                    <div className="paper-copy">
                      <h3>{p.title}</h3>
                      <p>{p.authors}</p>
                      <div className="paper-keys">
                        <code>@{p.key}</code>
                        {p.aliases?.map((a) => (
                          <code className="old" key={a}>@{a}</code>
                        ))}
                      </div>
                      <div>{p.tags.map((t) => <span key={t}>#{t}</span>)}</div>
                    </div>
                    <small className={'status ' + p.status}>{p.status}</small>
                  </button>
                ))}
                {!filtered.length && <div className="no-result">没有找到匹配的文献</div>}
              </section>

              <section className="detail">
                {cur && (
                  <>
                    <div className="detail-top">
                      <span className="status reading">{cur.status}</span>
                      <button onClick={openEdit}>✎ 编辑题录</button>
                    </div>
                    <h2>{cur.title}</h2>
                    <p className="authors">{cur.authors}</p>
                    <div className="cite-actions">
                      <button onClick={() => copy(cur.cite, '引用文本已复制')}>▣ 复制引用</button>
                      <button
                        onClick={() =>
                          setItems((xs) =>
                            xs.map((x) =>
                              x.id === cur.id
                                ? { ...x, status: x.status === '已读' ? '待读' : '已读' }
                                : x
                            )
                          )
                        }
                      >
                        {cur.status === '已读' ? '标记为待读' : '标记为已读'}
                      </button>
                    </div>
                    <div className="detail-section">
                      <h4>引文键 <span>CITEKEY</span></h4>
                      <div className="key-row">
                        <code className="key-chip">@{cur.key}</code>
                        <button className="mini" onClick={() => copy(cur.key, '引文键已复制')}>
                          复制键
                        </button>
                      </div>
                      <div className="alias-row">
                        {cur.aliases?.length ? (
                          cur.aliases.map((a) => (
                            <code className="alias-chip" key={a}>@{a}<i>历史别名</i></code>
                          ))
                        ) : (
                          <small className="muted">无历史别名</small>
                        )}
                      </div>
                    </div>
                    <div className="detail-section">
                      <h4>摘要 <span>ABSTRACT</span></h4>
                      <p>{cur.abstract}</p>
                    </div>
                    <div className="detail-section">
                      <h4>出版信息 <span>PUBLICATION</span></h4>
                      <div className="pub-grid">
                        <div><small>出版物</small><strong>{cur.venue}</strong></div>
                        <div><small>年份</small><strong>{cur.year}</strong></div>
                      </div>
                    </div>
                    <div className="detail-section">
                      <h4>引用文本 <span>BIBTEX / TEXT</span></h4>
                      <div className="cite-box">
                        {cur.cite}
                        <button onClick={() => copy(cur.cite, '引用文本已复制')}>复制</button>
                      </div>
                    </div>
                    <div className="detail-section">
                      <h4>我的笔记 <span>PRIVATE</span></h4>
                      <textarea
                        className="notes"
                        placeholder="记录你的阅读想法…"
                        value={cur.notes || ''}
                        onChange={(e) =>
                          setItems((xs) =>
                            xs.map((x) => (x.id === cur.id ? { ...x, notes: e.target.value } : x))
                          )
                        }
                      />
                    </div>
                  </>
                )}
              </section>
            </div>
          </>
        )}
      </main>

      {modal && !conflict && (
        <div className="modal-bg">
          <div className="modal">
            <button className="close" onClick={() => setModal(null)}>×</button>
            <span className="crumb">{modal.mode === 'add' ? 'NEW REFERENCE' : 'EDIT REFERENCE'}</span>
            <h2>{modal.mode === 'add' ? '添加一篇文献' : '编辑题录'}</h2>
            {modal.mode === 'edit' && (
              <p className="key-hint">
                当前引文键 @{items.find((x) => x.id === modal.id)?.key}
                · 保存时按作者/年份/标题重算，遇争用需先裁决
              </p>
            )}
            <label>标题
              <input value={modal.form.title} onChange={(e) => setForm('title', e.target.value)}
                placeholder="论文或书籍标题" />
            </label>
            <label>作者
              <input value={modal.form.authors} onChange={(e) => setForm('authors', e.target.value)} />
            </label>
            <div className="two">
              <label>年份
                <input type="number" value={modal.form.year}
                  onChange={(e) => setForm('year', e.target.value)} />
              </label>
              <label>出版物
                <input value={modal.form.venue} onChange={(e) => setForm('venue', e.target.value)} />
              </label>
            </div>
            <label>关键词
              <input value={modal.form.tags} onChange={(e) => setForm('tags', e.target.value)}
                placeholder="用逗号分隔" />
            </label>
            <label>摘要
              <textarea rows="3" value={modal.form.abstract}
                onChange={(e) => setForm('abstract', e.target.value)} />
            </label>
            <button className="primary full" disabled={!modal.form.title.trim()} onClick={attemptSave}>
              保存文献
            </button>
          </div>
        </div>
      )}

      {conflict && (
        <div className="modal-bg">
          <div className="modal">
            <span className="crumb">KEY CONFLICT · 保存已挂起</span>
            <h2>引文键「{conflict.proposed}」被占用</h2>
            <p className="warn">题录改动后重算的键与以下篇名争用，请选择处理方式后再保存：</p>
            <ul className="conflict-list">
              {conflict.fights.map((c, i) => (
                <li key={i}>
                  <b>{c.item ? c.item.title : '（无归属条目）'}</b>
                  <small>@{c.kind === 'key' || c.kind === 'alias' ? c.item.key : conflict.proposed} · {KIND_LABEL[c.kind]}</small>
                </li>
              ))}
            </ul>
            <div className="choice-row">
              <button className="primary full" onClick={() => resolveConflict('rekey')}>
                换键：使用 @{conflict.next}
              </button>
              {conflict.mode === 'edit' && (
                <button className="outline full" onClick={() => resolveConflict('keep')}>
                  沿用原键：@{conflict.keepKey}
                </button>
              )}
              <button className="ghost full" onClick={() => resolveConflict('cancel')}>
                返回修改（冲突未解决，不保存）
              </button>
            </div>
          </div>
        </div>
      )}

      {notice && <div className="toast">{notice}</div>}
    </div>
  );
}
