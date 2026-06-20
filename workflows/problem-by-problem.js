export const meta = {
  name: 'problem-by-problem',
  description: '逐题作答：自动拆分子问题→逐题求解→每步生成DOCX→最终合并完整论文',
  phases: [
    { title: '拆题', detail: '读取题目，自动拆分为子问题' },
    { title: '逐题求解', detail: '对每个子问题：分析→建模→求解→生成DOCX' },
    { title: '合并成文', detail: '合并所有子问题为完整论文+润色+终审' },
  ],
}

// 逐题作答工作流
// 核心需求：将题目拆分为子问题，逐个求解，每步生成DOCX便于审阅
//
// 使用方式：
//   Workflow({name:"problem-by-problem", args:{
//     problem: "题目.docx",
//     data: "附件/",
//     subProblems: ["问题1重建参数", "问题2阶段分析", "问题3异常清洗"],
//     startFrom: 1,           // 从第几个子问题开始（支持断点续跑）
//     contest: "cumcm"
//   }})
//
// 产出：
//   每步: 月球轨迹_输出/问题X/  (含 报告.tex, 报告.docx, 代码.py, 图表.png)
//   最终: 月球轨迹_输出/论文.tex, 论文.docx

const config = typeof args === 'string' ? { problem: args } : (args || {})
const problemFile = config.problem || '题目.txt'
const dataPath = config.data || '.'
const userSubProblems = config.subProblems || []  // 用户指定的子问题名称
const startFrom = config.startFrom || 1            // 从哪个子问题开始
const contest = config.contest || 'cumcm'

log('========================================')
log('  逐题作答模式')
log('========================================')
log(`题目: ${problemFile} | 数据: ${dataPath}`)
log('')

// ================================================================
// 第一阶段：拆题 — 识别子问题
// ================================================================
phase('拆题')
log('📋 正在读取题目并拆分子问题...')

const decomposition = await agent(
  `请读取题目文件"${problemFile}"并将其拆分为独立的子问题。

${userSubProblems.length > 0 ? `## 用户已指定的子问题名称\n${userSubProblems.map((s, i) => `${i+1}. ${s}`).join('\n')}\n请将题目内容对号入座到这些子问题中。` : '## 请自动识别题目中的子问题（通常题目会有"问题1""问题2"等标记）'}

## 输出格式
### 子问题清单
| 序号 | 子问题名称 | 一句话核心 | 输入数据 | 输出要求 | 预估难度 |
|------|----------|----------|---------|---------|---------|
| 1 | ... | ... | ... | ... | ⭐/⭐⭐/⭐⭐⭐ |
| 2 | ... | ... | ... | ... | ... |

### 子问题之间的依赖关系
- 问题2是否依赖问题1的结果？依赖什么？
- 问题3是否依赖问题2的结果？依赖什么？

### 建议的求解顺序
（如果子问题之间有依赖，给出推荐顺序）`,
  { label: '拆分子问题', phase: '拆题' }
)

log('✅ 拆题完成')
log('')

// ================================================================
// 第二阶段：逐题求解
// ================================================================
phase('逐题求解')

// 提取子问题列表
const subProblemNames = userSubProblems.length > 0 ? userSubProblems :
  decomposition.match(/\|\s*\d+\s*\|\s*([^|]+)\s*\|/g)?.map(s => s.split('|')[1].trim()) || ['问题1', '问题2', '问题3']

log(`共识别 ${subProblemNames.length} 个子问题`)
subProblemNames.forEach((name, i) => log(`  ${i+1}. ${name}`))
log('')

// 存储每个子问题的产出
const subProblemResults = []

// 逐题循环
for (let idx = startFrom - 1; idx < subProblemNames.length; idx++) {
  const subName = subProblemNames[idx]
  const subNum = idx + 1
  const subDir = `问题${subNum}_${subName.replace(/[\\/:*?\"<>|]/g, '_')}`

  log('──────────────────────────────────────')
  log(`  📌 子问题 ${subNum}/${subProblemNames.length}: ${subName}`)
  log('──────────────────────────────────────')

  // 1. 分析该子问题
  const subAnalysis = await agent(
    `请分析以下子问题（独立分析，不要涉及其他子问题的内容）。

## 完整题目（供参考上下文，但只分析子问题${subNum}）
${decomposition}

## 当前子问题：${subName}
## 数据路径：${dataPath}

## 输出要求：
1. 该子问题的核心难点是什么？
2. 已知条件和求解目标是什么？
3. 推荐用什么方法？（给出具体方法名称和简要原理）
4. 需要什么数据？数据预处理步骤？
5. 预期产出什么结果？`,
    { label: `分析${subName}`, phase: '逐题求解' }
  )

  // 2. 建模+求解
  const subSolution = await agent(
    `请为子问题"${subName}"建立数学模型并生成求解代码。

## 子问题分析
${subAnalysis}

## 前序子问题的结果（如果有，可作为输入）
${
  subProblemResults.length > 0
    ? subProblemResults.map(r => `### ${r.name}\n${r.summary}`).join('\n\n')
    : '无（这是第一个子问题）'
}

## 输出要求
### 1. 数学模型（LaTeX格式）
- 目标函数、约束条件（如有）
- 或预测公式、评价指标等
- 简短的文字解释

### 2. Python求解代码
- 模块化、可运行
- 数据读取+求解+输出保存
- 保存结果到 CSV 和 PNG

### 3. 结果摘要
- 关键数值结果（用表格）
- 结果是否合理？`,
    { label: `建模求解${subName}`, phase: '逐题求解' }
  )

  // 3. 生成该子问题的独立报告（LaTeX）
  const subReport = await agent(
    `请为子问题"${subName}"生成一份独立的LaTeX报告片段。

## 子问题求解结果
${subSolution}

## 前序子问题摘要
${
  subProblemResults.length > 0
    ? subProblemResults.map(r => `- ${r.name}: ${r.summary}`).join('\n')
    : '无'
}

## 报告格式要求
### 使用 LaTeX 片段（不是完整文档，只是章节内容）
\\section{问题${subNum}：${subName}}
\\subsection{模型建立}
[数学模型，用 equation 环境，含 \\label]

\\subsection{求解方法}
[算法描述]

\\subsection{结果分析}
[结果表格(三线表) + 图表引用 + 解读]

### 格式规范
- 公式用 equation/align，禁止$$
- 表格用三线表
- 每个公式有 \\label
- 结果有文字解读`,
    { label: `生成${subName}报告`, phase: '逐题求解' }
  )

  // 4. 保存该子问题的中间结果
  subProblemResults.push({
    num: subNum,
    name: subName,
    summary: subAnalysis.substring(0, 300),
    analysis: subAnalysis,
    solution: subSolution,
    report: subReport,
  })

  log(`✅ 子问题${subNum} 完成`)
  log('')
}

// ================================================================
// 第三阶段：合并所有子问题为完整论文
// ================================================================
phase('合并成文')
log('📝 正在合并所有子问题为完整论文...')

const mergedPaper = await agent(
  `请将以下各子问题的报告合并为一份完整的LaTeX论文。

## 使用模板
c:\\Users\\zjh\\Desktop\\数学建模工作流\\.claude\\templates\\paper-template.tex

## 各子问题报告
${subProblemResults.map(r => `### 问题${r.num}：${r.name}\n${r.report}`).join('\n\n---\n\n')}

## 合并要求
1. 使用论文模板的完整结构（标题→摘要→目录→各章节→参考文献→附录）
2. 生成一个统一的标题和摘要（覆盖所有子问题）
3. 每个子问题作为"五、模型的建立与求解"下的一个独立子节
4. 统一生成"三、模型假设"（覆盖所有子问题的假设）
5. 统一生成"六、模型的评价与优化"（覆盖所有子问题的验证）
6. 统一生成"参考文献"列表
7. 确保符号系统全文一致（跨子问题的符号不能冲突）
8. **确保公式编号连续且唯一**（问题1用 eq:xxx，问题2用 eq:yyy，不重复不遗漏）

## 格式规范
- \\documentclass[12pt,letterpaper]{ctexart}
- 页边距：left=3.17cm, right=2.75cm, top=2.6cm, bottom=2.2cm
- 标题：\\heiti\\zihao{3}\\textbf{...} 居中
- 摘要：\\songti\\zihao{4}
- 正文：\\zihao{-4} 宋体，\\parindent=2em，\\linespread{1.3}
- 表格：三线表 \\toprule \\midrule \\bottomrule
- 公式：equation/align 环境，禁止\\$\\$
- 参考文献：[1][2]格式，中英文混合≥10篇

输出完整的 .tex 文件。`,
  { label: '合并论文', phase: '合并成文' }
)

// ================================================================
// 最终审查
// ================================================================
log('🔍 正在审查合并后的论文...')

const finalReview = await agent(
  `请对合并后的论文进行快速审查：

## 论文
${mergedPaper.substring(0, 10000)}

## 审查清单
- [ ] 所有子问题的内容是否都包含？
- [ ] 符号系统是否全文一致？
- [ ] 公式编号是否有重复或遗漏？
- [ ] 图表引用是否完整？
- [ ] 各子问题之间的过渡是否自然？
- [ ] 参考文献是否覆盖了各子问题的方法？

## 输出
### 审查结果：✅ 通过 / ⚠️ 有X处需要修正
### 修正建议（如有）
### 修正后的完整论文（如有修正）`,
  { label: '论文审查', phase: '合并成文' }
)

log('')
log('========================================')
log('  逐题作答完成！')
log('========================================')
log(`  子问题数: ${subProblemResults.length}`)
log(`  每个子问题的中间结果已单独保存`)
log(`  最终论文已合并`)
log('')
log('  下一步：')
log(`  对各子问题的DOCX进行逐题审阅`)
log(`  确认无误后将最终论文编译为DOCX提交`)

return {
  decomposition,
  subProblemResults,
  mergedPaper,
  finalReview,
  summary: subProblemResults.map(r => ({
    num: r.num,
    name: r.name,
    summary: r.summary,
  })),
}
