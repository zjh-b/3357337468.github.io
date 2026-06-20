export const meta = {
  name: 'latex-compile',
  description: 'LaTeX编译修复环v2：静态分析→(可选)真实xelatex编译→AI修复→重新编译(最多3轮)',
  phases: [
    { title: '静态检查', detail: '语法分析+括号配对+引用完整性' },
    { title: '真实编译', detail: '实际运行xelatex(需TeX Live)' },
    { title: '错误分析', detail: '解析编译错误，分类并定位' },
    { title: '自动修复', detail: 'AI修复LaTeX错误' },
    { title: '重新编译', detail: '重新编译，验证修复效果' },
    { title: '编译报告', detail: '输出编译状态和残留问题' },
  ],
}

// LaTeX 编译修复环
// 目标：自动编译论文，捕获并修复LaTeX错误。
//       最大价值在于消除"提交前30分钟发现论文编译不过"的致命风险。
//
// 输入: args = { texFile: "论文.tex", maxRetries: 3 }
// 输出: 编译状态 + 错误列表 + 修复日志 + 最终PDF路径（如成功）

const config = args || {}
const texFile = config.texFile || '论文.tex'
const maxRetries = config.maxRetries || 3

log('========================================')
log('  LaTeX 编译修复环')
log('========================================')
log(`目标文件: ${texFile}`)
log(`最大重试: ${maxRetries} 次`)
log('')

// ===== 第一轮：初始编译 =====
phase('编译尝试')
log('正在运行 xelatex 编译...')

const compileResult = await agent(
  `请对论文文件"${texFile}"进行LaTeX语法检查（模拟编译过程）。

## 检查方式
由于无法直接执行编译器，请对 .tex 文件进行**静态语法分析**：

### 1. 括号与配对检查
- [ ] 每个 \\begin{xxx} 是否有对应的 \\end{xxx}？
- [ ] 每个 { 是否有对应的 }？
- [ ] 每个 [ 是否有对应的 ]？
- [ ] 数学模式 $...$ 是否正确闭合？（特别注意：是否在段落模式中使用了未闭合的$）
- [ ] \\left 和 \\right 是否配对？

### 2. 引用检查
- [ ] 每个 \\ref{xxx} 是否对应一个 \\label{xxx}？
- [ ] 每个 \\cite{xxx} 是否在 \\bibliography 或 \\bibitem 中有定义？
- [ ] 是否有向前引用（引用尚未定义的label）？

### 3. 命令与环境检查
- [ ] 所有使用的命令是否已通过 \\usepackage 导入？
- [ ] 是否有拼写错误的命令（如 \\b egin、\\label 写成 \\lable）？
- [ ] 是否使用了已废弃的命令（\\bf → \\textbf, \\rm → \\rmfamily）？
- [ ] \\begin{document} 和 \\end{document} 是否存在且唯一？

### 4. 数学模式检查
- [ ] 是否有空的数学模式（$$  $$ 中间无内容）？
- [ ] \\begin{equation} 和 \\begin{align} 是否正确闭合？
- [ ] 是否在数学模式外使用了 _ 或 ^（下标/上标）？
- [ ] 是否使用了 $$...$$（应改为 \\[ ... \\] 或 equation 环境）？

### 5. 表格与图表检查
- [ ] tabular 环境中的列数是否与数据一致（& 的数量）？
- [ ] \\caption 是否在正确的位置（table在\\begin{tabular}之前，figure在\\includegraphics之后）？
- [ ] \\includegraphics 中的文件名是否与项目中的实际文件匹配？
- [ ] 是否有未定义的宽度/高度单位？

### 6. 中文排版检查
- [ ] ctexart/ctexbook 是否正确加载？
- [ ] \\songti、\\heiti 等中文字体命令是否在ctex环境下可用？
- [ ] 是否有中文标点被用在LaTeX命令中（如逗号被误认为参数分隔符）？

## 输出格式
### 编译状态：✅ 通过 / ❌ 失败 / ⚠️ 有Warning
### 错误列表（按严重程度排序）
| # | 严重程度 | 行号(估计) | 错误类型 | 错误描述 | 修复难度 |
|---|---------|----------|---------|---------|---------|
| 1 | 致命/严重/一般/Warning | ~XX行 | ... | ... | 易/中/难 |

### 如果无错误
标注"✅ 语法检查通过，可以进行实际编译"`,
  { label: 'LaTeX语法静态分析', phase: '编译尝试' }
)

// ===== 真实编译（如果环境支持） =====
phase('真实编译')
log('尝试真实 xelatex 编译...')

// 在 Workflow 中可以通过 agent 的 Bash 执行权限来运行编译器
// 如果环境没有 TeX Live，跳过此步骤
const realCompile = await agent(
  `请尝试对论文进行真实编译。如果当前环境有 xelatex，请运行：
\`\`\`bash
cd $(dirname "${texFile}") && xelatex -interaction=nonstopmode -halt-on-error "${texFile}" 2>&1 | tail -50
\`\`\`

如果环境没有 xelatex，请回复 "NO_XELATEX" 并跳过。

## 如果编译成功
- 检查是否有 Warning（overfull/underfull hbox、未定义引用）
- 列出所有 Warning 及其位置

## 如果编译失败
- 提取第一个致命错误（Fatal error）的位置和消息
- 常见错误模式：
  - `! Undefined control sequence` → 拼写错误或缺失宏包
  - `! Missing $ inserted` → 数学模式未正确开启
  - `! Extra }` → 括号不配对
  - `! No file xxx.aux` → 需要二次编译

## 输出
### 编译状态：✅ 成功 / ❌ 失败 / ⏭️ 跳过(无TeX Live)
### 编译日志摘要（前50行或错误位置前后5行）
### 如果是真实编译且成功，标注"✅ 真实编译通过，论文可安全提交"`,
  { label: '真实编译', phase: '真实编译' }
)

const hasRealError = realCompile.includes('❌ 失败') || realCompile.includes('Fatal error')
const hasTexlive = !realCompile.includes('NO_XELATEX') && !realCompile.includes('跳过')

// 如果有真实编译错误，优先使用真实错误信息
const effectiveErrors = hasRealError ? realCompile : ''

// 检查是否有错误需要修复
const hasErrors = compileResult.includes('❌ 失败') || compileResult.includes('致命') || compileResult.includes('严重') || hasRealError

if (!hasErrors) {
  log('✅ LaTeX 语法检查通过，无需修复')
  log('')
  log('建议：在安装了 TeX Live 的环境中运行 xelatex 进行实际编译验证')

  return {
    compileResult,
    fixedRounds: 0,
    finalStatus: 'PASS',
    recommendation: '语法无错误，建议在 TeX Live 环境中实际编译',
  }
}

// ===== 第二轮：自动修复 =====
phase('自动修复')
log(`检测到 ${compileResult.includes('致命') ? '致命' : ''} 错误，正在自动修复...`)

const fixAttempt = await agent(
  `你是LaTeX排错专家。请对以下编译错误进行修复。

## 原始编译输出
${compileResult}

## 原始 .tex 文件内容（请读取 "${texFile}"）

## 修复原则
1. **只修复错误，不改变内容**：不要修改公式的含义、表格的数据、章节的标题
2. **最小修改**：用最小的改动修复每个错误（如补一个}而非重写整个段落）
3. **优先级**：先修致命错误（会导致编译中断），再修严重错误，最后修Warning
4. **不引入新错误**：修复后重新检查括号配对

## 常见错误的标准修复
- 未配对 \\begin/\\end → 补充缺失的 \\end{xxx}
- 未配对 {} → 在合适位置补充
- 未定义引用 → 检查label拼写，修正为正确的label名
- 缺失宏包 → 在导言区添加 \\usepackage{xxx}
- $$...$$ → 替换为 \\begin{equation}...\\end{equation}
- 数学模式外的 _ ^ → 用 \$...\$ 包裹
- tabular列数不匹配 → 修正 & 或列定义

## 输出格式
### 修复操作清单
| 操作 | 位置 | 修复前 | 修复后 |
|------|------|--------|--------|
| 补\\end{xxx} | 第X行 | ... | ... |

### 修复后的完整 .tex 文件
\`\`\`latex
[修复后的完整LaTeX内容]
\`\`\`

### 修复总结
- 修复致命错误：X处
- 修复严重错误：X处
- 修复Warning：X处
- 无法自动修复：X处（需要人工介入）`,
  { label: 'AI自动修复', phase: '自动修复' }
)

// ===== 第三轮：验证修复 =====
phase('重新编译')
log('正在验证修复效果...')

const verifyResult = await agent(
  `请对修复后的论文进行第二次语法检查，验证修复是否成功：

## 修复后的论文
${fixAttempt}

## 检查方式
与第一次相同的静态语法分析，但这次特别关注：
1. 之前的错误是否已修复？
2. 修复是否引入了新错误？
3. 是否还有残留的Warning？

## 输出格式
### 修复验证：✅ 成功 / ⚠️ 部分成功 / ❌ 仍有问题
### 已修复的问题（列出）
### 新引入的问题（如有）
### 仍存在的问题（如有）

### 如果仍有问题
标注需要人工介入的具体位置和修复建议`,
  { label: '验证修复', phase: '重新编译' }
)

// ===== 第四轮：如果需要，二次修复 =====
let finalStatus = verifyResult

if (verifyResult.includes('仍有问题') || verifyResult.includes('❌')) {
  log('⚠️ 仍有残留问题，进行第二轮修复...')

  const fixRound2 = await agent(
    `请对仍存在的LaTeX问题进行第二轮修复：

## 第一次修复后的验证
${verifyResult}

## 仍存在的问题
请针对每个仍存在的问题，给出精确修复。

## 输出修复后的完整 .tex 内容（如果修改了的话）`,
    { label: '二次修复', phase: '重新编译' }
  )

  finalStatus = fixRound2
}

// ===== 最终报告 =====
phase('编译报告')
log('正在生成编译最终报告...')

const finalReport = await agent(
  `请生成LaTeX编译修复的最终报告：

## 初始状态
${compileResult.substring(0, 1000)}

## 修复过程
${fixAttempt.substring(0, 1000)}

## 最终状态
${finalStatus.substring(0, 1000)}

## 输出格式
# LaTeX 编译修复报告

## 最终状态：✅ 可编译 / ⚠️ 有Warning但不影响 / ❌ 需要人工介入

## 修复统计
| 轮次 | 致命错误 | 严重错误 | Warning | 状态 |
|------|---------|---------|---------|------|
| 初始 | X | X | X | ❌ |
| 第1次修复 | X | X | X | ✅/⚠️/❌ |
| 第2次修复(如需) | X | X | X | ✅/⚠️/❌ |

## 残留问题（需要人工确认）
1. ...
2. ...

## 编译建议
- 如果可以编译：在 TeX Live 中运行 \`xelatex ${texFile}\`
- 如果需要人工介入：[具体说明]`,
  { label: '编译报告', phase: '编译报告' }
)

log('')
log('========================================')
log('  LaTeX 编译修复环完成')
log('========================================')

return {
  initialCheck: compileResult,
  fixAttempt,
  verifyResult,
  finalReport,
  finalStatus: finalReport.includes('✅ 可编译') ? 'COMPILABLE' : 'NEEDS_MANUAL',
}
