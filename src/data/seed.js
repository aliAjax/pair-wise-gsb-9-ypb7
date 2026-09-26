// 领域初始数据：文献条目（现键 + 历史别名）与手稿文本
export const seedItems = [
  {
    id: 1,
    key: 'clark1998extended',
    aliases: ['clark1997extended'], // 年份由 1997 订正为 1998 后留下的历史键
    title: 'The Extended Mind',
    authors: 'Clark, A. & Chalmers, D.',
    year: 1998,
    venue: 'Analysis',
    tags: ['具身认知', '经典'],
    abstract:
      '本文提出心智延展论：当外部环境稳定地承担认知功能时，心智边界可以超越头脑与身体。',
    status: '阅读中',
    cite: 'Clark, A. & Chalmers, D. (1998). The Extended Mind. Analysis.',
  },
  {
    id: 2,
    key: 'lave1991situated',
    aliases: [],
    title: 'Situated Learning',
    authors: 'Lave, J. & Wenger, E.',
    year: 1991,
    venue: 'Cambridge University Press',
    tags: ['学习科学', '社会'],
    abstract: '学习发生在真实情境的参与过程中，知识与共同体实践不可分割。',
    status: '待读',
    cite: 'Lave, J. & Wenger, E. (1991). Situated Learning. Cambridge University Press.',
  },
  {
    id: 3,
    key: 'miller2022designing',
    aliases: [],
    title: 'Designing with Data',
    authors: 'Miller, S.',
    year: 2022,
    venue: 'MIT Press',
    tags: ['设计研究', '方法'],
    abstract:
      '一套面向设计师的数据研究方法，讨论如何把定性洞察转化为可行动的设计决策。',
    status: '已读',
    cite: 'Miller, S. (2022). Designing with Data. MIT Press.',
  },
];

// 手稿用 [@引文键] 引用文献；clark1997extended 是历史别名，wenger1998practice 暂无归属
export const seedManuscript = `心智延展论认为认知过程可以超出颅骨与皮肤的边界 [@clark1997extended]，而情境学习强调知识扎根于共同体实践 [@lave1991situated]。设计决策同样需要数据支撑 [@miller2022designing; @wenger1998practice]。`;
