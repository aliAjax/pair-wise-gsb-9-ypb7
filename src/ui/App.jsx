import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { allTags, commitEntry, deleteEntry, promoteAlias, searchEntries } from '../domain/library.js';
import { deleteManuscript } from '../domain/manuscripts.js';
import { downloadArchive, importArchive, loadState, saveState } from '../archive/store.js';
import EntryModal from './EntryModal.jsx';
import ManuscriptsView from './ManuscriptsView.jsx';
import PaperDetail from './PaperDetail.jsx';

function reducer(state, action) {
  switch (action.type) {
    case 'commit-entry': {
      // action.result: { entries }
      return { ...state, entries: action.result.entries };
    }
    case 'delete-entry':
      return { ...state, entries: deleteEntry(action.id, state.entries) };
    case 'promote-alias':
      return action.result.error ? state : { ...state, entries: action.result.entries };
    case 'update-notes':
      return { ...state, entries: state.entries.map((e) => (e.id === action.id ? { ...e, notes: action.notes } : e)) };
    case 'toggle-favorite':
      return { ...state, entries: state.entries.map((e) => (e.id === action.id ? { ...e, favorite: !e.favorite } : e)) };
    case 'set-manuscripts':
      return { ...state, manuscripts: action.manuscripts };
    case 'delete-manuscript':
      return { ...state, manuscripts: deleteManuscript(action.id, state.manuscripts) };
    case 'replace':
      return action.state;
    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [view, setView] = useState('library'); // library | manuscripts
  const [selected, setSelected] = useState(state.entries[0]?.id);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('全部');
  const [statusNav, setStatusNav] = useState('all'); // all | 待读 | 阅读中 | 已读 | 收藏
  const [modal, setModal] = useState(null); // null | 'new' | entry object
  const [notice, setNotice] = useState('');
  const fileRef = useRef(null);
  const toastTimer = useRef(null);

  useEffect(() => saveState(state), [state]);

  const notify = (msg) => {
    setNotice(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setNotice(''), 2600);
  };

  const tags = ['全部', ...allTags(state.entries)];

  const filtered = useMemo(() => {
    let list = searchEntries(state.entries, query);
    if (tag !== '全部') list = list.filter((e) => e.tags.includes(tag));
    if (statusNav === '收藏') list = list.filter((e) => e.favorite);
    else if (statusNav !== 'all') list = list.filter((e) => e.status === statusNav);
    return list;
  }, [state.entries, query, tag, statusNav]);

  const cur = state.entries.find((e) => e.id === selected) || filtered[0] || state.entries[0] || null;

  const openEntry = (id) => {
    setSelected(id);
    setView('library');
  };

  const handleCommit = (result, mode) => {
    dispatch({ type: 'commit-entry', result });
    const rec = result.entries[0];
    const saved = modal?.id ? result.entries.find((e) => e.id === modal.id) : rec;
    if (saved) setSelected(saved.id);
    setModal(null);
    notify(
      mode === 'new' ? `新文献已保存，现键 @${saved.key}`
        : mode === 'keep' ? `已保存并沿用原键 @${saved.key}，推导键已留作别名`
          : mode === 'change' ? `已保存，现键 @${saved.key}；旧键已留存为历史别名`
            : '题录已保存',
    );
  };

  const handlePromote = (id, alias) => {
    const result = promoteAlias(id, alias, state.entries, state.manuscripts);
    if (result.error) { notify(result.error); return; }
    dispatch({ type: 'promote-alias', result });
    notify(`@${alias} 已提升为现键，旧现键转为别名`);
  };

  const handleDelete = () => {
    if (!cur) return;
    if (!window.confirm(`删除《${cur.title}》？手稿中的 @${cur.key} 将成为悬空键（历史别名同样失效）。`)) return;
    dispatch({ type: 'delete-entry', id: cur.id });
    notify('文献已删除');
  };

  const doExport = () => {
    downloadArchive(state);
    notify('本机存档（条目 + 手稿）已导出为 JSON');
  };

  const doImport = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = importArchive(String(reader.result));
      if (result.error) { notify('导入失败：' + result.error); return; }
      dispatch({ type: 'replace', state: result.state });
      setSelected(result.state.entries[0]?.id);
      notify('存档已导入');
    };
    reader.readAsText(file);
  };

  const exportReferences = () => {
    const text = state.entries.map((e) => e.cite).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = 'references.txt';
    a.click();
    URL.revokeObjectURL(a.href);
    notify('引用列表已导出');
  };

  const counts = {
    all: state.entries.length,
    待读: state.entries.filter((e) => e.status === '待读').length,
    阅读中: state.entries.filter((e) => e.status === '阅读中').length,
    已读: state.entries.filter((e) => e.status === '已读').length,
    收藏: state.entries.filter((e) => e.favorite).length,
  };

  return (
    <div className="app">
      <aside>
        <div className="logo"><span>∴</span> CITE KEY DESK</div>
        <div className="library-head">
          <span>引文键治理台</span>
          <strong>{state.entries.length}<small> 篇文献</small></strong>
        </div>
        <nav>
          <button className={view === 'library' ? 'active' : ''} onClick={() => setView('library')}>▤ <span>文献库</span><b>{state.entries.length}</b></button>
          <button className={view === 'manuscripts' ? 'active' : ''} onClick={() => setView('manuscripts')}>✎ <span>组稿手稿</span><b>{state.manuscripts.length}</b></button>
        </nav>

        {view === 'library' && (
          <>
            <div className="side-nav-sub">
              {[['all', '全部'], ['待读', '待读'], ['阅读中', '阅读中'], ['已读', '已读'], ['收藏', '收藏']].map(([k, label]) => (
                <button key={k} className={statusNav === k ? 'on' : ''} onClick={() => setStatusNav(k)}>
                  {label}<b>{counts[k]}</b>
                </button>
              ))}
            </div>
            <div className="side-tags">
              <small>标签筛选</small>
              {tags.slice(1).map((t) => (
                <button key={t} className={tag === t ? 'on' : ''} onClick={() => setTag(tag === t ? '全部' : t)}># {t}</button>
              ))}
            </div>
          </>
        )}

        <div className="side-foot">
          <button onClick={() => fileRef.current?.click()}>⤒ 导入存档</button>
          <button onClick={doExport}>⤓ 导出本机存档</button>
          <small>本地 JSON · localStorage</small>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ''; }} />
        </div>
      </aside>

      <main>
        {view === 'library' ? (
          <>
            <header>
              <div>
                <span className="crumb">RESEARCH / CITE-KEY DESK</span>
                <h1>文献库与引文键</h1>
              </div>
              <div className="actions">
                <button className="outline" onClick={exportReferences}>↓ 导出引用</button>
                <button className="primary" onClick={() => setModal('new')}>＋ 添加文献</button>
              </div>
            </header>
            <div className="toolbar">
              <div className="search">⌕
                <input placeholder="搜标题、作者、摘要，或直接搜 @现键 / @历史别名…" value={query} onChange={(e) => setQuery(e.target.value)} />
                {query && <button onClick={() => setQuery('')}>×</button>}
              </div>
              <div className="tag-filter">
                {tags.map((t) => <button key={t} className={tag === t ? 'on' : ''} onClick={() => setTag(t)}>{t}</button>)}
              </div>
            </div>
            <div className="body">
              <section className="paper-list">
                {filtered.map((p) => (
                  <button className={'paper ' + (cur?.id === p.id ? 'selected' : '')} onClick={() => setSelected(p.id)} key={p.id}>
                    <div className="paper-year">{p.year}</div>
                    <div className="paper-copy">
                      <h3>{p.title}</h3>
                      <p>{p.authors}</p>
                      <div className="paper-keyline">
                        <code>@{p.key}</code>
                        {p.aliases.length > 0 && <span className="paper-alias" title={`历史别名：${p.aliases.map((a) => '@' + a).join(' ')}`}>+{p.aliases.length} 旧键</span>}
                      </div>
                      <div>{p.tags.map((t) => <span key={t}>#{t}</span>)}</div>
                    </div>
                    <small className={'status ' + p.status}>{p.status}</small>
                  </button>
                ))}
                {!filtered.length && <div className="no-result">没有找到匹配的文献（试试搜历史别名）</div>}
              </section>

              <PaperDetail
                entry={cur}
                entries={state.entries}
                manuscripts={state.manuscripts}
                onEdit={() => setModal(cur)}
                onDelete={handleDelete}
                onPromoteAlias={handlePromote}
                onNotify={notify}
                onUpdateNotes={(id, notes) => dispatch({ type: 'update-notes', id, notes })}
                onToggleFavorite={() => { dispatch({ type: 'toggle-favorite', id: cur.id }); notify(cur.favorite ? '已取消收藏' : '已加入收藏'); }}
              />
            </div>
          </>
        ) : (
          <>
            <header>
              <div>
                <span className="crumb">RESEARCH / MANUSCRIPTS</span>
                <h1>组稿手稿</h1>
              </div>
            </header>
            <ManuscriptsView
              entries={state.entries}
              manuscripts={state.manuscripts}
              onOpenEntry={openEntry}
              onChange={(manuscripts) => dispatch({ type: 'set-manuscripts', manuscripts })}
              onNotify={notify}
            />
          </>
        )}
      </main>

      {modal && (
        <EntryModal
          entry={modal === 'new' ? null : modal}
          entries={state.entries}
          manuscripts={state.manuscripts}
          onClose={() => setModal(null)}
          onCommit={handleCommit}
        />
      )}
      {notice && <div className="toast">{notice}</div>}
    </div>
  );
}
