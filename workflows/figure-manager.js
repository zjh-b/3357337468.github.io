export const meta = {
  name: 'figure-manager',
  description: '图表管理v2：扫描图表+匹配章节+核心示意图设计+TikZ/matplotlib代码生成+LaTeX引用',
  phases: [
    { title: '扫描图表', detail: '扫描项目中所有图片文件' },
    { title: '匹配章节', detail: '智能匹配图表到对应章节' },
    { title: '核心示意图', detail: '设计模型架构/算法流程核心示意图' },
    { title: '代码生成', detail: '生成TikZ/matplotlib可运行绘图代码' },
    { title: '生成引用', detail: '生成LaTeX图表引用代码' },
  ],
}

const options = args || {}
const figureDir = options.dir || '.'
const template = options.template || 'huazhong-cup'

phase('扫描图表')
log(`正在扫描图表文件: ${figureDir}`)

// 扫描所有图表文件
const figureInventory = await agent(
  `请扫描项目目录"${figureDir}"中的所有图表文件（PNG、JPG、PDF），按以下规则整理：

1. **列出所有图表**：文件名、尺寸（如能从文件大小推断）
2. **读取图表内容**：如果图表文件名有规律（如 figure1_xxx.png），尝试推断内容
3. **分类**：
   - 数据分布/EDA类（客户分布、热力图等）
   - 模型结果类（路线图、收敛曲线、成本构成等）
   - 对比分析类（问题对比、灵敏度等）
   - 算法验证类（基准对比、收敛性等）

请读取项目中实际的图片文件名，不要编造。`,
  { label: '扫描图表', phase: '扫描图表' }
)

phase('匹配章节')
log('正在智能匹配图表到论文章节...')

// 根据模板类型匹配章节结构
const templateStructure = {
  'huazhong-cup': [
    { section: '5.1.1', title: '客户分布与需求特征', keywords: ['分布', '客户', '订单', '需求'] },
    { section: '5.1.2', title: '速度时段建模', keywords: ['速度', '时段'] },
    { section: '5.1.3', title: '能耗建模与负载修正', keywords: ['能耗', '负载', '速度'] },
    { section: '5.2.3', title: '问题1求解结果', keywords: ['Q1', 'route', '路线', '成本', '收敛'] },
    { section: '5.3', title: '问题2求解结果', keywords: ['Q2', 'green', '绿色', '碳'] },
    { section: '5.4.3', title: '问题3求解结果', keywords: ['dynamic', '动态', '事件'] },
    { section: '6.2', title: '敏感性分析', keywords: ['敏感', 'sensitivity', '参数'] },
    { section: '6.3', title: '模型优点', keywords: ['对比', 'benchmark', '基准'] },
  ],
  'cumcm': [
    { section: '4.1', title: '数据预处理', keywords: ['分布', '客户', '数据'] },
    { section: '4.2.3', title: '问题1求解结果', keywords: ['路线', 'route', '成本', '收敛', 'Q1'] },
    { section: '4.3', title: '问题2求解结果', keywords: ['Q2', '对比', '碳', '绿色'] },
    { section: '4.4', title: '问题3求解结果', keywords: ['动态', '事件', 'Q3'] },
    { section: '5.2', title: '灵敏度分析', keywords: ['敏感', 'sensitivity'] },
  ],
  'mcm-icm': [
    { section: '4.1', title: 'Data Preprocessing', keywords: ['distribution', 'customer', 'data'] },
    { section: '4.2.4', title: 'Results for Problem 1', keywords: ['route', 'convergence', 'cost', 'Q1'] },
    { section: '4.3', title: 'Results for Problem 2', keywords: ['Q2', 'carbon', 'green'] },
    { section: '4.4', title: 'Results for Problem 3', keywords: ['dynamic', 'event', 'Q3'] },
    { section: '5.2', title: 'Sensitivity Analysis', keywords: ['sensitivity'] },
  ],
}

const structure = templateStructure[template] || templateStructure['huazhong-cup']

const figureMapping = await agent(
  `请将以下图表文件匹配到论文各章节：

## 图表清单
${figureInventory}

## 论文章节结构
${JSON.stringify(structure, null, 2)}

## 匹配规则
对每个图表：
1. 根据文件名和内容关键词，匹配到最合适的章节
2. 如果同一章节有多个图表，按展示逻辑排序
3. 标注每个图表的推荐标题（中文/英文，取决于模板）
4. 如果某章节没有匹配的图表，标注"缺少图表"

## 输出格式
对每个图表输出：
```
文件名 → 章节X.X：标题
  建议caption: 【图X-X 图表描述】
  尺寸建议: width=0.75\\textwidth
  是否关键图表: 是/否
````,
  { label: '匹配章节', phase: '匹配章节' }
)

phase('核心示意图')
log('正在设计模型架构/算法流程核心示意图...')

const coreSchematic = await agent(
  `基于以下信息，设计1-2张"核心示意图"——这是论文中最重要的图，评委快速翻阅时首先注意到的图。

## 图表清单与匹配
${figureMapping}

## 模板类型：${template}

## 核心示意图设计要求

### 为什么需要核心示意图？
- 评委会在5秒内通过这张图判断你的整体思路
- 顶级论文几乎都有这样一张"总览图"
- 这张图放在模型建立章节的开头，让读者先建立全局认知

### 图1：模型整体架构图（强烈推荐）
设计一张展示模型整体结构的框图/流程图，包含：
1. **输入层**：数据来源（如附件1-5）、关键参数
2. **处理层**：数据预处理步骤
3. **模型层**：核心数学模型/算法的模块结构（各子模型的层次关系）
4. **求解层**：求解算法的主要步骤
5. **输出层**：最终产出的结果和指标

### 图2（可选）：算法流程图
如果算法是论文核心创新点，额外设计一张详细的算法流程图：
1. 初始解生成 → 迭代优化 → 收敛判断 → 输出最优解
2. 标注关键参数和决策点
3. 标注各步骤的计算复杂度

### 输出格式
对每张核心示意图：
1. **图名**：学术化的图标题
2. **放置位置**：建议放在论文的哪个章节
3. **详细描述**：图中应包含的每个模块、每条连线、每个标注（文字描述即可，后续可用 draw.io / PPT / tikz 实现）
4. **配色建议**：主色/辅色/强调色
5. **尺寸建议**：建议占页面宽度比例

请给出足够详细的描述，让绘图者（队友）可以直接照着画出来。`,
  { label: '设计核心示意图', phase: '核心示意图' }
)

phase('代码生成')
log('正在为核心示意图和数据图生成可运行代码...')

const figureCode = await agent(
  `根据以下图表设计，生成可实际运行的绘图代码。

## 核心示意图设计
${coreSchematic}

## 图表匹配信息
${figureMapping}

## 代码生成要求

### 1. 核心示意图代码（模型架构图/流程图）
生成 **TikZ/LaTeX** 代码（可直接嵌入论文 .tex 文件）：
- 使用 \\begin{tikzpicture} 环境
- 节点用 \\node, 连线用 \\draw[->]
- 柔和配色（blue!30, green!20, orange!25）
- 每个模块标注简洁名称
- 代码带注释

如果流程复杂改为 Python matplotlib patches 绘制框图，保存300dpi PNG。

### 2. 数据图代码（缺失的图表）
对每个需要生成但尚未存在的图表，给出完整的 matplotlib/seaborn 代码：
- 使用中文字体支持
- 300dpi 保存
- 标注论文对应位置

### 输出格式
用代码块分别输出 TikZ 代码和 Python 代码。
如果使用了额外包，标注 pip install xxx`,
  { label: '生成图表代码', phase: '代码生成' }
)

phase('生成引用')
log('正在生成LaTeX图表引用代码...')

const latexCode = await agent(
  `根据以下图表匹配结果，生成论文中所有图表的LaTeX引用代码：

${figureMapping}

## 格式要求（${template}模板）

### 华中杯格式
\\begin{figure}[H]
    \\centering
    \\includegraphics[width=0.75\\textwidth]{文件名.png}
    \\caption{图X-X 图表描述}
    \\label{fig:xxx}
\\end{figure}

### 国赛格式
\\begin{figure}[H]
    \\centering
    \\includegraphics[width=0.75\\textwidth]{文件名.png}
    \\caption{图X-X 图表描述}
    \\label{fig:xxx}
\\end{figure}

### 美赛格式
\\begin{figure}[H]
    \\centering
    \\includegraphics[width=0.75\\textwidth]{filename.png}
    \\caption{Figure X-X: Description}
    \\label{fig:xxx}
\\end{figure}

## 要求
1. 每个图表生成完整的 \\begin{figure}...\\end{figure} 代码块
2. 按章节顺序排列
3. 添加注释标注属于哪个章节

输出可直接插入LaTeX论文的完整代码。`,
  { label: '生成引用代码', phase: '生成引用' }
)

log('图表管理完成！')
return {
  figureInventory,
  figureMapping,
  coreSchematic,
  figureCode,
  latexCode,
  missingFigures: '（需要补充图表的章节列表）',
}
