export const meta = {
  name: 'paper-refine',
  description: '章节级靶向精修：只修改论文指定章节/段落，不动其余内容，自动验证修改后的一致性',
  phases: [
    { title: '定位章节', detail: '精确定位要修改的章节或段落' },
    { title: '靶向修改', detail: '只修改指定内容，保留其余不变' },
    { title: '一致性验证', detail: '检查修改是否与正文其他部分冲突' },
  ],
}

// 章节级靶向精修工作流
// 目标：解决"只想改摘要一句话却要重跑整个paper-polish"的痛点
//
// 输入:
//   args.paperFile: 论文.tex
//   args.section: "摘要" | "五、模型的建立与求解" | "5.2" | "参考文献" 等
//   args.instructions: 具体的修改要求（自然语言描述）
//   args.verifyConsistency: true/false — 是否自动验证前后一致性
//
// 输出: 修改后的完整 .tex 文件

const config = args || {}
const paperFile = config.paperFile || '论文.tex'
const section = config.section || '摘要'
const instructions = config.instructions || '改善表达，增加数据支撑'
const verifyConsistency = config.verifyConsistency !== false

log('========================================')
log('  章节级靶向精修')
log('========================================')
log(`论文: ${paperFile}`)
log(`目标章节: ${section}`)
log(`修改要求: ${instructions}`)
log(`一致性验证: ${verifyConsistency ? '开启' : '关闭'}`)
log('')

// ===== 第一阶段：定位章节 =====
phase('定位章节')
log(`正在定位"${section}"章节...`)

const sectionContent = await agent(
  `请读取论文文件"${paperFile}"，精确定位"${section}"章节的完整内容。

## 定位规则
- 如果 section 是"摘要"：提取从"摘 要"到"关键词"结束的完整内容
- 如果 section 是章节号（如"5.2"）：提取 \\subsection{...} 的完整内容
- 如果 section 是章节标题（如"五、模型的建立与求解"）：提取 \\section{...} 的完整内容
- 如果 section 是"参考文献"：提取 \\begin{thebibliography}...\\end{thebibliography}

## 输出格式
### 定位结果
- 章节标题: [实际标题]
- 行号范围: 第X行 - 第Y行
- 内容长度: X字

### 章节完整内容
\`\`\`latex
[该章节的完整LaTeX代码]
\`\`\`

### 该章节中包含的
- 公式: X个 (\\label{...})
- 图表引用: X个 (\\ref{...})
- 文献引用: X个 (\\cite{...})`,
  { label: '定位章节', phase: '定位章节' }
)

// ===== 第二阶段：靶向修改 =====
phase('靶向修改')
log('正在执行靶向修改（只改目标章节，其余不动）...')

const refinedPaper = await agent(
  `请对论文的**"${section}"章节**进行靶向修改。

## 修改要求
${instructions}

## 章节当前内容
${sectionContent}

## 修改原则（严格遵守！）
1. **只修改目标章节**：不要改动论文的任何其他部分（标题、其他章节、参考文献、附录）
2. **保留所有数学公式**：不要改变任何公式的数学内容，只改文字描述
3. **保留所有 \\label 和 \\ref**：不要删除或重命名已有的标签
4. **保留所有 \\cite**：如果要新增引用，确保参考文献列表中有对应条目
5. **保持LaTeX格式**：修改后仍使用正确的LaTeX语法
6. **最小修改原则**：如果某处已经很好，就不要改——只改确实需要改进的地方

## 特定章节的修改指南

### 如果修改的是"摘要"：
- 确保300-500字
- 确保包含具体数字（非"显著降低"）
- 确保结构：问题→方法→关键结果→启示
- "本文"不超过3次

### 如果修改的是模型章节：
- 确保每个公式有引导句+三层解释
- 确保公式编号完整（无"公式()"空编号）
- 确保图表描述不重复图题

### 如果修改的是"参考文献"：
- 确保每条有确定存在的文献
- 确保中英文混合
- 确保引用规范（\\cite紧跟具体声明）

## 输出格式
### 修改摘要
- 修改了X处
- 新增了X处
- 删除了X处

### 修改后的完整论文
\`\`\`latex
[完整的 .tex 文件内容——包含所有未修改的章节+修改后的目标章节]
\`\`\``,
  { label: '靶向修改', phase: '靶向修改' }
)

// ===== 第三阶段：一致性验证 =====
if (verifyConsistency) {
  phase('一致性验证')
  log('正在验证修改后的一致性...')

  const consistencyReport = await agent(
    `请验证修改后的论文是否存在前后不一致的问题。

## 修改的章节
${section}

## 修改后的论文
${refinedPaper}

## 验证清单
1. **数字一致性**：修改后的章节中出现的数字是否在正文其他部分也有对应？
   - 如果摘要中改了一个数字（如"降低23.5%"），正文结果部分是否同步了？
2. **符号一致性**：修改章节中使用的符号是否与第四章（符号说明）一致？
3. **引用一致性**：新增的 \\cite{...} 是否在参考文献列表中有对应条目？
4. **逻辑一致性**：修改后的结论是否与模型部分的分析一致？
5. **格式一致性**：修改的章节标题格式是否与其他章节一致？

## 输出
### 一致性验证：✅ 通过 / ⚠️ 发现X处不一致
### 不一致项（如有）
| # | 位置 | 问题 | 修复建议 |
|---|------|------|---------|
| 1 | ... | ... | ... |

### 如果需要修复
给出修复后的完整论文（修复不一致项，不动其余内容）。`,
    { label: '一致性验证', phase: '一致性验证' }
  )

  log('一致性验证完成')
}

log('')
log('========================================')
log('  章节级靶向精修完成')
log('========================================')

return {
  section,
  instructions,
  sectionContent,
  refinedPaper,
  consistencyReport: verifyConsistency ? consistencyReport : '未开启验证',
}
