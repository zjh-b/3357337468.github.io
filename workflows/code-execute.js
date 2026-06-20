export const meta = {
  name: 'code-execute',
  description: '代码执行沙箱v2：静态分析→真实Python执行→捕获错误+输出→AI修复→重新运行(最多3轮)',
  phases: [
    { title: '静态检查', detail: '静态分析代码语法和依赖' },
    { title: '真实执行', detail: '实际运行python脚本(需Python环境)' },
    { title: '模拟执行', detail: '模拟运行逻辑，发现运行时错误' },
    { title: '自动修复', detail: 'AI修复代码错误' },
    { title: '验证修复', detail: '验证修复后的代码' },
    { title: '执行报告', detail: '输出执行状态和结果摘要' },
  ],
}

// 代码执行沙箱
// 目标：确保生成的Python代码可以正常运行。
//       最大的价值在于消除"队友拿到代码跑不通，浪费2-3小时debug"的风险。
//
// 由于Claude Code工作流中无法直接执行Python代码，
// 本工作流使用"静态分析+代码审查"的方式模拟执行过程，
// 捕获语法错误、导入缺失、逻辑错误、数值稳定性问题等。
//
// 输入: args = { codeFile: "main.py", dataFiles: ["附件1.xlsx"], maxRetries: 3 }
// 输出: 执行状态 + 错误列表 + 修复后的代码 + 预期输出

const config = args || {}
const codeFile = config.codeFile || 'main.py'
const dataFiles = config.dataFiles || []
const maxRetries = config.maxRetries || 3

log('========================================')
log('  代码执行沙箱 — 静态分析+模拟执行')
log('========================================')
log(`目标代码: ${codeFile}`)
log(`数据文件: ${dataFiles.length > 0 ? dataFiles.join(', ') : '未指定'}`)
log(`最大修复轮次: ${maxRetries}`)
log('')

// ===== 第一轮：静态代码分析 =====
phase('代码检查')
log('正在进行深度静态代码分析...')

const staticAnalysis = await agent(
  `请对代码文件"${codeFile}"进行深度静态分析（模拟编译器和linter的检查）。

## 分析维度

### 1. 语法正确性
- [ ] Python版本兼容性（是否有仅Python 3.10+支持的语法？）
- [ ] 函数/类定义的语法是否正确？
- [ ] 缩进是否一致（tab vs space混用）？
- [ ] 是否有未闭合的括号、引号、三引号？
- [ ] 中英文符号是否混用（中文逗号、中文括号在代码中）？

### 2. 导入依赖检查
- [ ] 所有 import 的包是否在 requirements 中？
- [ ] 是否有循环导入？
- [ ] 是否导入了未使用的包？
- [ ] 是否有拼写错误的包名？
- [ ] 是否依赖了需要额外安装的包（如gurobipy需要license）？

### 3. 变量与函数检查
- [ ] 是否有使用前未定义的变量？
- [ ] 函数参数是否与调用时一致？
- [ ] 返回值类型是否与使用处一致？
- [ ] 是否有变量名拼写错误（如df写成d f）？

### 4. 类型与数据检查
- [ ] 是否有类型不匹配的运算（如字符串+数字）？
- [ ] 列表/数组索引是否可能越界？
- [ ] 字典key是否一定存在（是否存在KeyError风险）？

### 5. 数组与DataFrame操作（高发错误区）
- [ ] DataFrame列名是否与数据文件中的实际列名一致？
- [ ] 是否有链式索引（如 df[df['a']>0]['b'] = 1）？
- [ ] groupby、merge、concat操作是否正确？
- [ ] 数值列中是否混入了字符串？

### 6. 数值稳定性检查
- [ ] 是否有除法（分母可能为零）？
- [ ] 是否有 log(0) 或 sqrt(负数) 的风险？
- [ ] 是否有极大值/极小值溢出风险？
- [ ] 是否有 NaN 传播风险？

### 7. 文件操作检查
- [ ] 文件路径是否正确（Windows路径用 \\ 还是 / ）？
- [ ] 是否使用了绝对路径（应使用相对路径）？
- [ ] 文件编码是否正确（中文文件应用 encoding='utf-8-sig'）？
- [ ] 是否在 with 语句中正确关闭文件？

### 8. 逻辑完整性检查
- [ ] 是否有死循环风险（while True 无break条件）？
- [ ] 是否有永远不会执行的代码（return后的代码）？
- [ ] 递归是否有终止条件？
- [ ] 异常处理是否过于宽泛（except Exception 吞掉所有错误）？

## 输出格式
### 代码分析总览
- 总行数：XX
- 函数数：XX
- 导入包数：XX
- 潜在问题数：XX

### 问题清单（按严重程度排序）
| # | 严重程度 | 行号 | 问题类型 | 问题描述 | 修复建议 |
|---|---------|------|---------|---------|---------|
| 1 | 致命/严重/一般/Warning | XX | ... | ... | ... |

### 依赖分析
- 已安装的包：[列出]
- 需要安装的包：[列出] + pip install 命令

### 数据文件兼容性
- 预期的Excel列名：[列出]（与数据文件中的实际列名对比）`,
  { label: '静态代码分析', phase: '代码检查' }
)

// 检查是否需要修复
// ===== 真实执行 =====
phase('真实执行')
log('尝试真实 Python 执行...')

const realExecution = await agent(
  `请尝试在真实Python环境中运行代码。如果环境支持，请运行：
\`\`\`bash
cd $(dirname "${codeFile}") && python -X utf8 "${codeFile}" 2>&1
\`\`\`

如果环境没有Python或代码依赖不满足，请回复 "NO_PYTHON" 并跳过。

## 如果执行成功
- 提取实际输出（stdout的最后50行）
- 列出生成的文件（CSV路径、PNG路径）
- 验证实际输出的数值是否在合理范围内

## 如果执行失败
- 提取完整 traceback（最后20行）
- 分类错误类型：ImportError / KeyError / ValueError / TypeError / FileNotFoundError / 其他
- 定位错误的精确行号

## 输出
### 执行状态：✅ 成功 / ❌ 失败 / ⏭️ 跳过(无Python环境)
### 实际输出摘要（成功时）/ 错误信息（失败时）
### 如果成功：结果数值是否合理？图片是否生成？`,
  { label: '真实执行', phase: '真实执行' }
)

const hasRealExecError = realExecution.includes('❌ 失败') || realExecution.includes('Traceback')
const hasPython = !realExecution.includes('NO_PYTHON') && !realExecution.includes('跳过')
const actualOutputs = hasPython && !hasRealExecError ? realExecution : ''

const hasCodeErrors = staticAnalysis.includes('致命') || staticAnalysis.includes('严重') || hasRealExecError

if (!hasCodeErrors) {
  log('✅ 代码静态分析通过，无致命或严重错误')
  log('建议：在本地Python环境中运行验证')

  return {
    staticAnalysis,
    fixRounds: 0,
    finalStatus: 'PASS_STATIC',
    recommendation: '无致命错误，建议在Python环境中实际运行：python main.py',
  }
}

// ===== 第二轮：自动修复 =====
phase('自动修复')
log(`检测到代码问题，正在自动修复（第1轮）...`)

const fixAttempt = await agent(
  `你是Python代码调试专家。请修复以下代码中的错误。

## 原始代码文件
请读取 "${codeFile}" 进行修复

## 静态分析发现的错误
${staticAnalysis}

## 修复原则
1. **只修错误，不改逻辑**：修复语法错误、导入缺失、类型问题，但不要改变算法逻辑
2. **保持风格一致**：修复后的代码风格应与原代码一致
3. **添加防御性代码**：对可能除零、越界、NaN的情况添加检查
4. **修复数据兼容性问题**：
   - 读取Excel时用 df.columns = ['列1','列2',...] 重命名（避免中文列名编码问题）
   - 文件路径用 os.path.join() 或 pathlib.Path
   - 输出CSV用 encoding='utf-8-sig'
5. **处理Windows终端编码问题**：
   - print中避免用 Unicode 特殊字符（用 R² → R2 替代）
   - 如需输出中文，文件开头加 # -*- coding: utf-8 -*-

## 输出格式
### 修复清单
| 序号 | 行号 | 问题 | 修复方式 |
|------|------|------|---------|

### 修复后的完整代码
\`\`\`python
[修复后的完整Python代码]
\`\`\`

### 修复统计
- 修复致命错误：X处
- 修复严重错误：X处
- 添加防御性代码：X处
- 无法自动修复：X处（需要人工介入）`,
  { label: 'AI修复代码', phase: '自动修复' }
)

// ===== 第三轮：验证修复 =====
phase('验证修复')
log('正在验证修复后的代码...')

const verifyFix = await agent(
  `请对修复后的代码进行第二次静态分析，验证修复是否成功：

## 修复后的代码
${fixAttempt}

## 原始错误清单
${staticAnalysis.substring(0, 2000)}

## 验证重点
1. 原始错误是否已修复？
2. 修复是否引入了新错误？
3. 防御性代码是否正确添加？
4. 代码逻辑是否被意外改变？

## 输出格式
### 修复验证：✅ 全部修复 / ⚠️ 部分修复 / ❌ 仍有问题

### 已修复的问题
| # | 原始问题 | 修复方式 | 验证结果 |
|---|---------|---------|---------|

### 新引入的问题（如有）
### 仍存在的问题（如有）

### 如果可以运行
建议在Python环境中执行：
\`\`\`bash
python ${codeFile}
\`\`\`
预期输出：[描述预期结果]`,
  { label: '验证修复', phase: '验证修复' }
)

// ===== 第四轮：如果需要，二次修复 =====
let finalCodeStatus = verifyFix

if (verifyFix.includes('仍有问题') || verifyFix.includes('❌')) {
  log('⚠️ 仍有残留问题，进行第二轮修复...')

  const fixRound2 = await agent(
    `请对仍存在的代码问题进行第二轮修复：

## 验证结果
${verifyFix}

## 请针对每个仍存在的问题，给出精确修复。
输出修复后的完整代码。`,
    { label: '二次修复', phase: '验证修复' }
  )

  finalCodeStatus = fixRound2
}

// ===== 最终报告 =====
phase('执行报告')
log('正在生成代码执行最终报告...')

const execReport = await agent(
  `请生成代码执行验证的最终报告：

## 初始状态
${staticAnalysis.substring(0, 1000)}

## 修复过程
${fixAttempt.substring(0, 1000)}

## 最终状态
${finalCodeStatus.substring(0, 1000)}

## 输出格式
# 代码执行验证报告

## 最终状态：✅ 可运行 / ⚠️ 有风险 / ❌ 需要人工介入

## 修复统计
| 轮次 | 致命错误 | 严重错误 | 一般问题 | Warning |
|------|---------|---------|---------|---------|
| 初始扫描 | X | X | X | X |
| 第1次修复 | X | X | X | X |
| 第2次修复(如需) | X | X | X | X |

## 预期运行流程
1. 数据加载 → [预期：XX条数据，XX个变量]
2. 模型训练 → [预期：XX次迭代，耗时约XX]
3. 结果输出 → [预期：输出XX.csv + XX.png]

## 运行建议
\`\`\`bash
# 1. 安装依赖
pip install numpy pandas scipy matplotlib seaborn

# 2. 运行代码（注意数据文件路径）
python ${codeFile}

# 3. 如果遇到中文编码问题（Windows）
python -X utf8 ${codeFile}

# 4. 验证输出
ls output/
\`\`\`

## 潜在风险（即使静态分析通过）
1. 数据文件的实际列名可能与代码中不匹配 → 运行时会报KeyError
2. 算法收敛性在真实数据上可能与预期不同 → 可能需要调参
3. [其他风险...]

## 人工检查清单
- [ ] 确认数据文件的列名与代码一致
- [ ] 确认Python版本（建议3.9+）
- [ ] 确认所有依赖包已安装
- [ ] 在小规模数据上先试运行`,
  { label: '执行报告', phase: '执行报告' }
)

log('')
log('========================================')
log('  代码执行沙箱验证完成')
log('========================================')

return {
  staticAnalysis,
  fixAttempt,
  verifyFix,
  execReport,
  finalStatus: execReport.includes('✅ 可运行') ? 'RUNNABLE' : 'NEEDS_MANUAL',
}
