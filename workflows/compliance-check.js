export const meta = {
  name: 'compliance-check',
  description: '竞赛规则合规检查：按官方规则逐项检查论文（匿名/页数/字号/格式），防止因格式违规被降级',
  phases: [
    { title: '规则加载', detail: '加载对应竞赛的官方格式规则' },
    { title: '逐项检查', detail: '按规则清单逐项检查论文' },
    { title: '违规报告', detail: '输出违规项+严重程度+修复方案' },
  ],
}

// 竞赛规则合规检查器
// 目标：模拟竞赛组委会的格式审查，找出所有违规项。
//       格式违规是最冤枉的扣分——规则就在那里，但你不知道哪里漏了。
//
// 输入: args = { paperFile: "论文.tex", contest: "cumcm", rules: "自定义规则(可选)" }
// 输出: 违规清单 + 严重程度 + 修复方案

const config = args || {}
const paperFile = config.paperFile || '论文.tex'
const contest = config.contest || 'cumcm'

// ===== 竞赛规则库（从官方通知中提取） =====
const contestRules = {
  'cumcm': {
    name: '全国大学生数学建模竞赛（国赛 CUMCM）',
    rules: [
      // 匿名要求
      { id: 'C01', category: '匿名', severity: '致命', rule: '论文中不得出现参赛者姓名、学校名称、指导教师姓名', check: '搜索可能导致身份暴露的文字' },
      { id: 'C02', category: '匿名', severity: '致命', rule: '论文中不得出现队号以外的任何身份标识', check: '搜索学号、院系名称、省份+学校特征词' },
      { id: 'C03', category: '匿名', severity: '严重', rule: '代码注释中不得出现学校名称或个人信息', check: '检查附录中的代码注释' },
      // 格式要求
      { id: 'C04', category: '格式', severity: '致命', rule: '首页必须有参赛承诺书（使用组委会提供的模板）', check: '检查是否有承诺书内容' },
      { id: 'C05', category: '格式', severity: '严重', rule: '正文不超过20页（不含承诺书和附录）', check: '估计正文页数' },
      { id: 'C06', category: '格式', severity: '严重', rule: '论文标题使用三号黑体加粗居中', check: '检查标题字号和字体' },
      { id: 'C07', category: '格式', severity: '严重', rule: '一级标题使用四号黑体，正文使用小四宋体', check: '检查各级标题和正文字号' },
      { id: 'C08', category: '格式', severity: '一般', rule: '摘要正文300-500字', check: '数字数' },
      { id: 'C09', category: '格式', severity: '一般', rule: '关键词3-5个', check: '数关键词数量' },
      // 内容要求
      { id: 'C10', category: '内容', severity: '严重', rule: '参考文献≥10篇，含中英文混合', check: '数参考文献条目和语言' },
      { id: 'C11', category: '内容', severity: '一般', rule: '表格使用三线表，不使用竖线', check: '检查表格样式' },
      { id: 'C12', category: '内容', severity: '一般', rule: '公式使用equation/align环境，禁止$$...$$', check: '搜索$$' },
      // 提交要求
      { id: 'C13', category: '提交', severity: '致命', rule: '提交文件为PDF格式（非Word）', check: '确认输出格式' },
      { id: 'C14', category: '提交', severity: '严重', rule: '支撑材料不超过20MB', check: '检查文件大小' },
    ],
  },
  'huazhong-cup': {
    name: '华中杯',
    rules: [
      { id: 'H01', category: '匿名', severity: '致命', rule: '论文中不得出现参赛者信息', check: '搜索身份标识' },
      { id: 'H02', category: '格式', severity: '严重', rule: '论文标题三号(16pt)黑体加粗居中', check: '检查标题' },
      { id: 'H03', category: '格式', severity: '严重', rule: '"摘 要"标签三号(16pt)黑体居中', check: '检查摘要标签' },
      { id: 'H04', category: '格式', severity: '严重', rule: '摘要正文四号(14pt)宋体', check: '检查摘要正文字号' },
      { id: 'H05', category: '格式', severity: '严重', rule: '正文小四(12pt)宋体', check: '检查正文字号' },
      { id: 'H06', category: '格式', severity: '严重', rule: '一级标题四号(14pt)黑体居中', check: '检查一级标题' },
      { id: 'H07', category: '格式', severity: '严重', rule: '二级标题小四(12pt)黑体左对齐', check: '检查二级标题' },
      { id: 'H08', category: '格式', severity: '一般', rule: '页边距：左3.17cm，右2.75cm，上2.6cm，下2.2cm', check: '检查geometry设置' },
      { id: 'H09', category: '格式', severity: '一般', rule: '行距1.3倍，首行缩进2字符', check: '检查linespread和parindent' },
      { id: 'H10', category: '格式', severity: '一般', rule: '页眉居中显示节名(宋体五号)，页脚居中页码', check: '检查fancyhdr设置' },
      { id: 'H11', category: '内容', severity: '严重', rule: '参考文献10-15篇，中英文混合', check: '数参考文献' },
      { id: 'H12', category: '内容', severity: '一般', rule: '表格三线表，图表按节编号(表5-1、图5-1)', check: '检查表图编号格式' },
      { id: 'H13', category: '内容', severity: '一般', rule: '附录用字母编号(附录A、附录B...)，代码用verbatim环境', check: '检查附录格式' },
    ],
  },
  'mcm-icm': {
    name: 'MCM/ICM（美赛）',
    rules: [
      { id: 'M01', category: '匿名', severity: '致命', rule: '论文中只能出现Team Control Number，不得出现姓名/学校', check: '搜索身份信息' },
      { id: 'M02', category: '格式', severity: '致命', rule: '必须有Summary Sheet（单独一页，放在最前面）', check: '检查Summary Sheet' },
      { id: 'M03', category: '格式', severity: '严重', rule: '论文总页数不超过25页（含Summary Sheet）', check: '数页数' },
      { id: 'M04', category: '格式', severity: '严重', rule: '正文12pt，1.5倍行距', check: '检查字号和行距' },
      { id: 'M05', category: '格式', severity: '一般', rule: '页边距1英寸(2.54cm)四周', check: '检查geometry' },
      { id: 'M06', category: '内容', severity: '严重', rule: '参考文献≥10篇，格式规范', check: '检查参考文献' },
      { id: 'M07', category: '内容', severity: '一般', rule: 'Tables and Figures must be clearly labeled and referenced', check: '图表标注和引用' },
    ],
  },
}

const rules = contestRules[contest] || contestRules['cumcm']

// ===== 第一阶段：规则加载 =====
phase('规则加载')
log(`正在加载 ${rules.name} 的格式规则...`)
log(`共 ${rules.rules.length} 条规则待检查`)
log('')

// ===== 第二阶段：逐项检查 =====
phase('逐项检查')
log('正在逐项检查论文合规性...')

// 致命规则优先，严重次之，一般最后
const sortedRules = [...rules.rules].sort((a, b) => {
  const severity = { '致命': 0, '严重': 1, '一般': 2 }
  return severity[a.severity] - severity[b.severity]
})

const checkResult = await agent(
  `你是${rules.name}的格式审查员。请对以下论文进行**逐项合规检查**。

论文文件: ${paperFile}

## 检查清单

${sortedRules.map((r, i) => `${i+1}. [${r.severity}] **${r.rule}**（${r.category}）
   检查方式：${r.check}`).join('\n\n')}

## 检查要求
1. **逐项检查**，不能跳过任何一项
2. 对每项给出明确判断：✅ 合规 / ❌ 违规 / ⚠️ 不确定
3. 违规项必须给出：
   - 具体位置（第几页、第几段、第几行）
   - 违规内容（引用原文）
   - 严重程度
   - 修复方案（具体可操作）
4. "不确定"的项标注为什么不确定，需要人工确认什么

## 输出格式
# ${rules.name} 合规检查报告

### 总体状况
- 检查项：${rules.rules.length}项
- 合规：X项
- 违规：X项（致命X / 严重X / 一般X）
- 不确定：X项

### 🔴 致命违规（必须修复才能提交）
| # | 规则 | 位置 | 违规内容 | 修复方案 |
|---|------|------|---------|---------|
| 1 | ... | ... | ... | ... |

### 🟡 严重违规（强烈建议修复）
同上格式

### 🟢 一般违规（建议修复）
同上格式

### ⚪ 不确定项（需人工确认）
同上格式

### 修复优先级建议
1. 🔴 最先修复：...（如果不修 → 可能被取消资格）
2. 🟡 其次修复：...（如果不修 → 扣3-5分）
3. 🟢 最后修复：...（如果不修 → 扣1-2分）

### 合规评分
- 合规率：XX%（合规项/总项）
- 如果提交当前版本：预计因格式问题扣X分`,
  { label: '逐项合规检查', phase: '逐项检查' }
)

// ===== 第三阶段：违规报告 =====
phase('违规报告')
log('正在生成违规修复指引...')

const fixGuide = await agent(
  `基于合规检查结果，生成**可直接执行的修复指引**。

## 检查结果
${checkResult}

## 输出要求

### 对每个致命/严重违规：
1. 修复操作步骤（如"在 .tex 文件的第X行，将 XX 改为 YY"）
2. 修复后的验证方法

### 对批量违规（如同类型多处违规）：
1. 全局搜索替换方案
2. 预防措施（修改模板以避免下次再犯）

### 快速修复清单
给出一个5分钟的快速修复流程：
1. 先修X
2. 再修Y
3. 最后确认Z`,
  { label: '修复指引', phase: '违规报告' }
)

log('')
log('========================================')
log(`  合规检查完成 — ${rules.name}`)
log('========================================')

return {
  contest: rules.name,
  rulesChecked: rules.rules.length,
  checkResult,
  fixGuide,
}
