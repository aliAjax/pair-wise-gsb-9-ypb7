import React, { useState } from 'react';
import { citationView, commitManuscript, danglingCites, deleteManuscript } from '../domain/manuscripts.js';

// 组稿视图：列出手稿、解析 @键、展示占用与悬空引用。
export default function ManuscriptsView({ entries, manuscripts, onOpenEntry, onChange, onNotify }) {
  const [editing, setEditing] = useState(null); // null | 'new' | manuscript
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');

  const open = (m) => { setEditing(m); setTitle(m.title); setText(m.text); };
  const openNew = () => { setEditing('new'); setTitle(''); setText(''); };

  const save = () => {
    const next = commitManuscript(
      editing === 'new' ? { title, text } : { id: editing.id, title, text },
      manuscripts,
    );
    onChange(next);
    setEditing(null);
    onNotify('手稿已保存，引用键已重新解析');
  };

  const remove = (m) => {
    onChange(deleteManuscript(m.id, manuscripts));
    onNotify(`已删除手稿《${m.title}》，其占用的键随之释放`);
  };

  return (
    <div className="ms-view">
      <div className="ms-head">
        <p>正文中用 <code>@键名</code> 引用文献；现键与历史别名都能解析回原条目。手稿已占用的键不能再分配给其他文献。</p>
        <button className="primary" onClick={openNew}>＋ 新建手稿</button>
      </div>

      <div className="ms-grid">
        {manuscripts.map((m) => {
          const cites = citationView(m, entries);
          const dangling = danglingCites(m, entries);
          return (
            <article className="ms-card" key={m.id}>
              <header>
                <h3>{m.title}</h3>
                <div className="ms-card-tools">
                  <button onClick={() => open(m)}>编辑</button>
                  <button onClick={() => remove(m)}>删除</button>
                </div>
              </header>
              <small className="ms-date">更新于 {m.updatedAt}</small>
              <pre className="ms-text">{m.text}</pre>
              <div className="ms-cites">
                <small>引用键（{cites.length}）</small>
                <div>
                  {cites.map((c) => {
                    const entry = c.entryId ? entries.find((e) => e.id === c.entryId) : null;
                    const viaAlias = entry && entry.key.toLowerCase() !== c.raw.toLowerCase();
                    return (
                      <button
                        key={c.raw}
                        className={'cite-chip ' + (entry ? (viaAlias ? 'alias' : 'ok') : 'dangling')}
                        onClick={() => entry ? onOpenEntry(entry.id) : onNotify(`@${c.raw} 还没有对应条目，悬空中`)}
                        title={entry ? (viaAlias ? `历史别名 → 现键 @${entry.key}` : `现键 · ${entry.title}`) : '悬空键：库中无此键或别名'}
                      >
                        @{c.raw}
                        {viaAlias && <i>→ @{entry.key}</i>}
                        {!entry && <i>悬空</i>}
                      </button>
                    );
                  })}
                  {!cites.length && <span className="ms-empty">尚无 @引用</span>}
                </div>
              </div>
              {dangling.length > 0 && (
                <p className="ms-warn">⚠ {dangling.length} 个悬空键：{dangling.map((d) => `@${d.raw}`).join('、')}，文献库中暂无对应键或别名。</p>
              )}
            </article>
          );
        })}
        {!manuscripts.length && <div className="no-result">还没有手稿，新建一篇并在正文用 @键 引用文献。</div>}
      </div>

      {editing && (
        <div className="modal-bg" onMouseDown={() => setEditing(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setEditing(null)}>×</button>
            <span className="crumb">MANUSCRIPT</span>
            <h2>{editing === 'new' ? '新建手稿' : '编辑手稿'}</h2>
            <label>标题<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：组稿第三章草稿" /></label>
            <label>正文（用 @键名 插入引用）
              <textarea className="ms-editor" rows="11" value={text} onChange={(e) => setText(e.target.value)} placeholder="……这一观点见 @Clark1998。" />
            </label>
            <button className="primary full" disabled={!text.trim()} onClick={save}>保存手稿</button>
          </div>
        </div>
      )}
    </div>
  );
}
