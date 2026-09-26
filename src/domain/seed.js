// 领域数据：初始文献条目与组稿手稿。
// 条目结构：
//   id, title, authors, year, venue, tags[], abstract, status, favorite, notes
//   key     当前引文键（手稿 @键 应指向它）
//   aliases 历史别名（旧键自动留存，仍能解析回本条目）
//   cite    引用文本
export const seedEntries = [
  {
    id: 'ref_clark1998',
    title: 'The Extended Mind',
    authors: 'Clark, A. & Chalmers, D.',
    year: 1998,
    venue: 'Analysis',
    tags: ['具身认知', '经典'],
    abstract: '本文提出心智延展论：当外部环境稳定地承担认知功能时，心智边界可以超越头脑与皮肤。',
    status: '阅读中',
    favorite: true,
    notes: '',
    key: 'Clark1998',
    aliases: ['ClarkChalmers1998', 'Extended1998'],
    cite: 'Clark, A. & Chalmers, D. (1998). The Extended Mind. Analysis.',
  },
  {
    id: 'ref_lave1991',
    title: 'Situated Learning',
    authors: 'Lave, J. & Wenger, E.',
    year: 1991,
    venue: 'Cambridge University Press',
    tags: ['学习科学', '社会'],
    abstract: '学习发生在真实情境的参与过程中，知识与共同体实践不可分割。',
    status: '待读',
    favorite: false,
    notes: '',
    key: 'Lave1991',
    aliases: ['LaveWenger1991'],
    cite: 'Lave, J. & Wenger, E. (1991). Situated Learning. Cambridge University Press.',
  },
  {
    id: 'ref_miller2022',
    title: 'Designing with Data',
    authors: 'Miller, S.',
    year: 2022,
    venue: 'MIT Press',
    tags: ['设计研究', '方法'],
    abstract: '一套面向设计师的数据研究方法，讨论如何把定性洞察转化为可行动的设计决策。',
    status: '已读',
    favorite: false,
    notes: '',
    key: 'Miller2022',
    aliases: ['Miller2021'],
    cite: 'Miller, S. (2022). Designing with Data. MIT Press.',
  },
  {
    id: 'ref_miller2022b',
    title: 'Data in the Design Studio',
    authors: 'Miller, K. T.',
    year: 2022,
    venue: 'Design Studies, 48, 112–140',
    tags: ['设计研究'],
    abstract: '追踪设计工作室如何在项目节奏中穿插数据工作，提出“轻量证据”概念。',
    status: '待读',
    favorite: false,
    notes: '',
    key: 'Miller2022a',
    aliases: [],
    cite: 'Miller, K. T. (2022). Data in the Design Studio. Design Studies, 48, 112–140.',
  },
];

// 手稿结构：id, title, text（正文用 @键 引用）, updatedAt
export const seedManuscripts = [
  {
    id: 'ms_draft1',
    title: '组稿：认知与工具（第三章草稿）',
    text:
      '认知并不封闭在颅内，工具可以成为心智过程的组成部分 @Clark1998。\n' +
      '早期手稿曾沿用 @ClarkChalmers1998 的写法，指的是同一篇《The Extended Mind》。\n' +
      '学习同样是嵌入实践的过程 @LaveWenger1991，两位作者的论证与心智延展论相互呼应 @Extended1998。',
    updatedAt: '2026-09-20',
  },
  {
    id: 'ms_draft2',
    title: '组稿：数据与设计决策',
    text:
      '面向设计师的数据方法强调可行动性 @Miller2022。\n' +
      '注意区分另一篇同姓氏同年的工作室研究 @Miller2022a。\n' +
      '旧稿曾误写年份 @Miller2021（出版年已更正为 2022）。\n' +
      '待补：还有一篇 @Clark1999 尚未入库，需先找到条目。',
    updatedAt: '2026-09-24',
  },
];
