import React from 'react';
import { entryUsage } from '../domain/manuscripts.js';

// 单篇文献详情：键治理、引用文本、被手稿占用情况。
export default function PaperDetail({ entry, entries, manuscripts, onEdit, onDelete, onPromoteAlias, onNotify, onUpdateNotes, onToggleFavorite }) {
  if (!entry) return <section className="detail"><div className="no-result">请选择左侧文献</div></section>;

  const uses = entryUsage(entry, manuscripts);
  const usedKeys = [...new Set(uses.map((u) => u.key.toLowerCase()))];
  const inManuscript = usedKeys.includes(entry.key.toLowerCase());

  const copy = (text, msg) => {
    navigator.clipboard?.writeText(text);
    onNotify(msg || '已复制');
  };

  const bibtex =
    `@${entry.tags?.[0] ? 'article' : 'misc'}{${entry.key},\n` +
    `  title  = {${entry.title}},\n` +
    `  author = {${entry.authors}},\n` +
    `  year   = {${entry.year}},\n` +
    (entry.venue ? `  venue  = {${entry.venue}},\n` : '') +
    `}`;

  return (
    <section className="detail">
      <div className="detail-top">
        <span className={'status reading'}>{entry.status}</span>
        <div className="detail-tools">
          <button onClick={onToggleFavorite}>{entry.favorite ? '★ 已收藏' : '☆ 收藏'}</button>
          <button onClick={onEdit}>✎ 编辑题录</button>
          <button className="danger" onClick={onDelete}>删除</button>
        </div>
      </div>
      <h2>{entry.title}</h2>
      <p className="authors">{entry.authors}</p>

      <div className="key-card">
        <div className="key-row">
          <small>当前引文键</small>
          <code className="key-current">@{entry.key}</code>
          <span className={'key-state ' + (inManuscript ? 'locked' : 'free')}>
            {inManuscript ? '手稿占用中 · 不可再分配' : '未被手稿引用'}
          </span>
        </div>
        <div className="key-row alias-row">
          <small>历史别名（{entry.aliases.length}）</small>
          <div className="alias-chips">
            {entry.aliases.length === 0 && <span className="muted">暂无；换键后旧键会自动留存在这里</span>}
            {entry.aliases.map((a) => {
              const occupied = uses.some((u) => u.key.toLowerCase() === a.toLowerCase());
              return (
                <span className="alias-chip" key={a}>
                  <code>@{a}</code>
                  {occupied && <i className="alias-used">手稿在用</i>}
                  <button title="提升为当前键（旧现键自动转为别名）" onClick={() => onPromoteAlias(entry.id, a)}>换为现键</button>
                </span>
              );
            })}
          </div>
        </div>
        {uses.length > 0 && (
          <div className="key-row">
            <small>手稿引用（{uses.length} 处）</small>
            <div className="usage-list">
              {uses.map((u, i) => (
                <span key={i} className="usage-item">《{u.manuscript.title}》以 <code>@{u.key}</code></span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="cite-actions">
        <button onClick={() => copy(entry.cite, '引用文本已复制')}>▣ 复制引用</button>
        <button onClick={() => copy(`@${entry.key}`, `已复制 \\cite 键 @${entry.key}`)}>▣ 复制 @{entry.key}</button>
        <button onClick={() => copy(bibtex, 'BibTeX 条目已复制')}>▣ 复制 BibTeX</button>
      </div>

      <div className="detail-section">
        <h4>摘要 <span>ABSTRACT</span></h4>
        <p>{entry.abstract || '（无摘要）'}</p>
      </div>
      <div className="detail-section">
        <h4>出版信息 <span>PUBLICATION</span></h4>
        <div className="pub-grid">
          <div><small>出版物</small><strong>{entry.venue || '—'}</strong></div>
          <div><small>年份</small><strong>{entry.year || '—'}</strong></div>
        </div>
      </div>
      <div className="detail-section">
        <h4>引用文本 <span>REFERENCE</span></h4>
        <div className="cite-box">
          {entry.cite}
          <button onClick={() => copy(entry.cite, '引用文本已复制')}>复制</button>
        </div>
      </div>
      <div className="detail-section">
        <h4>我的笔记 <span>PRIVATE</span></h4>
        <textarea className="notes" placeholder="记录你的阅读想法…" value={entry.notes || ''} onChange={(e) => onUpdateNotes(entry.id, e.target.value)} />
      </div>
    </section>
  );
}
