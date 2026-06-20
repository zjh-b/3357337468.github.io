export const meta = {
  name: 'math-model-full',
  description: '数学建模完整流水线v5：用户思路驱动+动态时间压力+checkpoint确认+多版本择优+跨项目知识迁移',
  phases: [
    { title: '思路解析', detail: '解析用户建模思路，生成可执行计划' },
    { title: '问题分类', detail: '识别问题类型，匹配竞赛策略' },
    { title: '范文注入', detail: '从国赛范文+算法指南提取适用模式' },
    { title: '题目分析', detail: '遵循用户思路框架深度分析' },
    { title: '数据预处理', detail: '数据清洗与探索' },
    { title: '算法选型', detail: '基于用户思路+算法指南智能匹配' },
    { title: '基线对比', detail: '建立性能基线' },
    { title: '模型求解', detail: '生成代码（参考预置模板）' },
    { title: '代码沙箱', detail: '静态分析+真实执行+自动修复' },
    { title: '代码审查', detail: '审查和优化代码' },
    { title: '数据验证', detail: '统计检验+物理规律+鲁棒性' },
    { title: '质量决策', detail: '判断是否需要迭代' },
    { title: '洞察挖掘', detail: '从结果提炼关键洞察' },
    { title: '时间评估', detail: '动态调整后续阶段深度' },
    { title: '论文生成', detail: '思路驱动+自适应结构+多版本择优' },
    { title: '论文润色', detail: '废话检测+符号审计+专项审查' },
    { title: 'LaTeX编译', detail: '静态分析+真实编译+修复' },
    { title: '合规检查', detail: '竞赛规则逐项检查' },
    { title: '魔鬼代言人', detail: '5维攻击找致命弱点' },
    { title: '对抗修复', detail: '攻击→修复→再攻击→收敛' },
    { title: '多评委模拟', detail: '3评委并行+预估分数' },
    { title: '进化记录', detail: '记录本次经验供下次复用' },
  ],
}

// 数学建模完整流水线 v5
// 核心升级：用户思路驱动 + 动态时间压力 + checkpoint确认 + 多版本择优
//
// 使用方式：
//   方式1（推荐）：提供你的建模思路
//   Workflow({name:"math-model-full", args:{
//     problem: "题目.docx", data: "附件/",
//     approach: "我认为核心是X，应该用Y方法，关键约束是Z...",
//     contest: "cumcm",
//     startTime: "2026-09-05 20:00", endTime: "2026-09-08 20:00"
//   }})
//
//   方式2：不提供思路，工作流自主分析
//   Workflow({name:"math-model-full", args:{problem:"题目.docx", data:"附件/"}})
//
//   方式3：分组执行（分阶段调用，每阶段人工确认后继续）
//   第1组：Workflow({...args, runGroup:"analyze"})  → 只跑到题目分析
//   第2组：Workflow({...args, runGroup:"solve"})    → 只跑模型求解
//   第3组：Workflow({...args, runGroup:"paper"})    → 论文生成+审查

const config = typeof args === 'string' ? { problem: args } : (args || {})
const problemFile = config.problem || '题目.txt'
const dataPath = config.data || '.'
const preferredMethod = config.method || ''
const userApproach = config.approach || ''     // 🆕 用户建模思路
const contest = config.contest || 'cumcm'
const startTime = config.startTime || ''
const endTime = config.endTime || ''
const runGroup = config.runGroup || 'all'      // 🆕 分组执行: "analyze" | "solve" | "paper" | "all"
const ensembleMode = config.ensemble !== false // 🆕 是否多版本择优
const timeAdaptive = config.timeAdaptive !== false // 🆕 是否动态时间调整

// 竞赛策略
const contestStrategy = {
  'cumcm': { name: '国赛', focus: '数学推导深度+创新性+验证严密性', formulaDepth: 4, sensitivityDepth: 3, innovationLevel: 'B', avoidOverclaim: true },
  'huazhong-cup': { name: '华中杯', focus: '格式规范+实证分析+数据对比', formulaDepth: 3, sensitivityDepth: 2, innovationLevel: 'C', avoidOverclaim: true },
  'mcm-icm': { name: '美赛', focus: '问题洞察+图表质量+英文表达', formulaDepth: 2, sensitivityDepth: 3, innovationLevel: 'B', avoidOverclaim: false },
}
const strategy = contestStrategy[contest] || contestStrategy['cumcm']

// 动态时间评估
let remainingHours = 72 // 默认
if (startTime && endTime) {
  try {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const now = new Date()
    const total = (end - start) / 3600000
    const elapsed = Math.max(0, (now - start) / 3600000)
    remainingHours = Math.max(0, total - elapsed)
  } catch(e) { /* 时间解析失败，使用默认值 */ }
}

const timeLevel = remainingHours > 48 ? '充裕' : remainingHours > 24 ? '正常' : remainingHours > 12 ? '紧张' : remainingHours > 6 ? '紧迫' : '危急'
const skipPhases = timeLevel === '危急' ? ['范文注入', '洞察挖掘', '进化记录'] :
                   timeLevel === '紧迫' ? ['范文注入', '进化记录'] : []

log('========================================')
log(`  数学建模完整流水线 v5`)
log(`  竞赛: ${strategy.name} | 时间: ${timeLevel}(${Math.round(remainingHours)}h)`)
log(`  模式: ${userApproach ? '思路驱动' : '自主分析'} | 分组: ${runGroup}`)
log('========================================')
log('')

// ================================================================
// 第0阶段：解析用户思路（v5核心升级）
// ================================================================
phase('思路解析')

let modelingPlan = ''

if (userApproach) {
  log('📋 正在解析你的建模思路...')

  modelingPlan = await agent(
    `你是数学建模竞赛的执行助手。请解析以下用户提供的建模思路，生成结构化的可执行计划。

## 用户的建模思路
${userApproach}

## 题目信息
题目文件: ${problemFile}
数据路径: ${dataPath}
竞赛: ${strategy.name}（${strategy.focus}）

## 解析要求

### 1. 提取关键决策
从用户思路中提取：
- **核心论点**：用户认为问题的本质是什么？
- **推荐方法**：用户倾向用什么方法/算法？
- **关键约束**：用户特别强调的约束条件
- **预期难点**：用户预判的困难点
- **创新方向**：用户设想的创新点

### 2. 评估可行性
- 用户思路的逻辑是否自洽？
- 推荐的方法是否适用于本题？
- 是否存在用户未注意到的盲区？
- 如果有潜在问题，礼貌地指出并给出备选方案

### 3. 生成可执行计划
将用户思路分解为具体的执行步骤：
- 第1步：...（对应工作流的"题目分析"阶段）
- 第2步：...（对应"数据预处理"阶段）
- ...
- 标注每一步的关键产出物
- 标注每一步的预估耗时

### 4. 思路完整性检查
- 用户的思路是否覆盖了所有子问题？
- 是否遗漏了必要的验证步骤？
- 论文的"故事线"是否清晰？

## 输出格式
# 思路解析报告

## 用户思路摘要
（1-2段概括用户的建模方案）

## 可行性评估
- ✅ 合理之处：...
- ⚠️ 需注意：...
- 💡 补充建议：...

## 可执行计划
| 步骤 | 工作流阶段 | 具体任务 | 预估耗时 |
|------|----------|---------|---------|
| 1 | 题目分析 | ... | Xh |
| 2 | 数据预处理 | ... | Xh |
| ... | ... | ... | ... |

## 潜在盲区
（用户思路中可能遗漏的内容）

## 论文故事线建议
（基于用户思路，推荐的论文叙事主线）`,
    { label: '思路解析', phase: '思路解析' }
  )

  log('✅ 思路解析完成')
  log(`计划步骤数: ${modelingPlan.split('|').length}`)
  log('')
} else {
  log('ℹ️ 未提供建模思路，工作流将自主分析')
  modelingPlan = '用户未提供特定思路，请自主完成全部分析和建模。'
}

// 如果只跑到分析阶段
if (runGroup === 'analyze') {
  const analysisOnly = await agent(
    `只执行分析阶段（题目分析+数据预处理+算法调研）。\n用户思路: ${modelingPlan}\n题目: ${problemFile}\n数据: ${dataPath}`,
    { label: '分析阶段', phase: '思路解析' }
  )
  return { stage: 'analyze', modelingPlan, analysisOnly }
}

// ================================================================
// 第一阶段：问题分类 + 范文注入（合并执行）
// ================================================================
if (!skipPhases.includes('范文注入')) {
  phase('问题分类')
  log('🔬 识别问题类型...')

  const problemType = await agent(
    `判断本题类型。竞赛: ${strategy.name}(${strategy.focus})。\n用户思路: ${modelingPlan}\n题目: ${problemFile}`,
    { label: '问题分类', phase: '问题分类' }
  )

  phase('范文注入')
  log('📚 从范文库提取适用模式...')

  const paperPatterns = await agent(
    `提取适用模式。问题类型: ${problemType}\n用户思路: ${modelingPlan}\n参考: 2020国赛优秀论文/ 目录17篇范文，算法集锦/ 目录4份指南`,
    { label: '范文注入', phase: '范文注入' }
  )
} else {
  log('⏭️ 时间紧张，跳过范文注入')
}

// ================================================================
// 第二阶段：题目分析（严格遵循用户思路框架）
// ================================================================
phase('题目分析')
log('📋 分析题目（遵循你的思路框架）...')

const problemAnalysis = await agent(
  `分析题目。${userApproach ? '请严格遵循用户的建模思路框架进行分析。' : ''}

## 用户思路
${modelingPlan}

## 竞赛策略
${strategy.name}: ${strategy.focus}
公式深度建议: ${strategy.formulaDepth}级, 灵敏度深度: ${strategy.sensitivityDepth}级

## 题目: ${problemFile} | 数据: ${dataPath}
${preferredMethod ? '推荐方法: ' + preferredMethod : ''}

## 输出：结构化分析报告（问题分解+约束+路线图+陷阱预警）`,
  { label: '题目分析', phase: '题目分析' }
)

// 动态时间：如果时间紧张，合并数据预处理和算法调研
if (timeLevel === '危急' || timeLevel === '紧迫') {
  log('⏩ 时间紧迫，合并执行数据预处理+算法调研...')

  const [dataReport, algorithmRecommendation] = await parallel([
    () => agent(`数据预处理。数据: ${dataPath}\n用户思路: ${modelingPlan}\n输出精简报告。`, { label: '数据预处理(快速)', phase: '数据预处理' }),
    () => agent(`算法调研。用户思路: ${modelingPlan}\n${preferredMethod ? '推荐: '+preferredMethod : ''}\n参考算法集锦/目录。输出推荐方案。`, { label: '算法调研(快速)', phase: '算法调研' }),
  ])
  log('✅ 数据+算法快速完成')
}

if (runGroup === 'solve') {
  return { stage: 'analyze_done', modelingPlan, problemAnalysis, problemType, paperPatterns }
}

const AGENT_CTX = "\n## " + (userApproach ? '用户建模思路（严格遵循，偏离请说明理由）' : '自主分析模式') + "\n" + (userApproach ? modelingPlan : '请基于题目分析自主确定最优方案。') + "\n## 竞赛策略\n" + strategy.name + ": " + strategy.focus + "\n公式深度:" + strategy.formulaDepth + "级 灵敏度:" + strategy.sensitivityDepth + "级" + (strategy.avoidOverclaim ? '\n⚠️ 严禁创新点夸大' : '')

let dataReport, algorithmRecommendation
if (timeLevel !== '危急' && timeLevel !== '紧迫') {
  phase('数据预处理')
  dataReport = await agent('数据质量检查+清洗+特征工程。' + AGENT_CTX + '\n数据路径: ' + dataPath, { label: '数据预处理', phase: '数据预处理' })
  phase('算法选型')
  const [exact, heur, tool] = await parallel([
    () => agent('精确算法调研。' + AGENT_CTX, { label: '精确算法', phase: '算法选型' }),
    () => agent('启发式算法调研。' + AGENT_CTX, { label: '启发式算法', phase: '算法选型' }),
    () => agent('工具调研。' + AGENT_CTX + '\n参考: 算法集锦/ 4份指南。', { label: '工具调研', phase: '算法选型' }),
  ])
  algorithmRecommendation = await agent('综合推荐。' + AGENT_CTX + '\n' + exact + '\n' + heur + '\n' + tool, { label: '算法推荐', phase: '算法选型' })
}

const baseline = await agent('设计基线方法。' + AGENT_CTX + '\n算法: ' + (algorithmRecommendation || ''), { label: '基线对比', phase: '基线对比' })

phase('模型求解')
const solution = await agent('生成Python代码。' + AGENT_CTX + '\n算法: ' + (algorithmRecommendation || '') + '\n参考模板: .claude/templates/code/', { label: '代码生成', phase: '模型求解' })

phase('代码沙箱')
const codeCheck = await agent('静态分析+尝试真实执行。\n' + solution.substring(0, 8000), { label: '代码沙箱', phase: '代码沙箱' })

const codeReview = await agent('代码审查。\n' + solution, { label: '代码审查', phase: '代码审查' })
const validation = await agent('验证(物理+数学+统计+鲁棒性)。' + AGENT_CTX, { label: '数据验证', phase: '数据验证' })

phase('质量决策')
const qualityGate = await agent('判断迭代。验证: ' + validation.substring(0, 2000) + '\n剩余: ' + Math.round(remainingHours) + 'h', { label: '质量决策', phase: '质量决策' })

let insights = ''
if (!skipPhases.includes('洞察挖掘')) {
  phase('洞察挖掘')
  insights = await agent('挖掘关键洞察。' + AGENT_CTX + '\n' + validation, { label: '洞察挖掘', phase: '洞察挖掘' })
}

phase('论文生成')
log('📝 生成论文(' + (ensembleMode && timeLevel !== '危急' ? '多版本择优' : '标准') + ')...')
const paper = await agent('生成LaTeX论文。' + AGENT_CTX + '\n洞察: ' + insights + '\n模板: .claude/templates/paper-template.tex\n要求: 自适应结构+三层公式+管理启示+公式编号完整+图题去重+引用规范。', { label: '生成论文', phase: '论文生成' })

let selectedPaper = paper
if (ensembleMode && timeLevel !== '危急' && timeLevel !== '紧迫') {
  const [verB, verC] = await parallel([
    () => agent('数据密集型版本。' + AGENT_CTX + '\n原版: ' + paper.substring(0, 3000), { label: '版本B', phase: '论文生成' }),
    () => agent('洞察驱动型版本。' + AGENT_CTX + '\n原版: ' + paper.substring(0, 3000), { label: '版本C', phase: '论文生成' }),
  ])
  const sel = await agent('3版本择优。A(标准):' + paper.substring(0, 1500) + ' B(数据):' + verB.substring(0, 1500) + ' C(洞察):' + verC.substring(0, 1500), { label: '择优', phase: '论文生成' })
  if (sel.includes('版本B')) selectedPaper = verB
  else if (sel.includes('版本C')) selectedPaper = verC
}

phase('论文润色')
const polishedPaper = await agent('润色(废话检测+符号审计+专项审查)。\n' + selectedPaper, { label: '论文润色', phase: '论文润色' })

phase('LaTeX编译')
await agent('语法检查+尝试xelatex编译。\n' + polishedPaper.substring(0, 10000), { label: 'LaTeX编译', phase: 'LaTeX编译' })

phase('合规检查')
await agent(strategy.name + '规则逐项检查。\n' + polishedPaper.substring(0, 6000), { label: '合规检查', phase: '合规检查' })

phase('魔鬼代言人')
const devilAttack = await agent('5维攻击。' + AGENT_CTX + '\n' + polishedPaper.substring(0, 8000), { label: '魔鬼代言人', phase: '魔鬼代言人' })

let finalPaper = polishedPaper
if (devilAttack.includes('致命') || devilAttack.includes('严重')) {
  phase('对抗修复')
  const fix1 = await agent('修复致命+严重问题。\n攻击: ' + devilAttack + '\n' + finalPaper, { label: '第1轮修复', phase: '对抗修复' })
  const atk2 = await agent('验证修复。\n' + fix1, { label: '第2轮攻击', phase: '对抗修复' })
  finalPaper = (atk2.includes('未修复') || atk2.includes('新发现')) ? await agent('第2轮修复。\n' + atk2 + '\n' + fix1, { label: '第2轮修复', phase: '对抗修复' }) : fix1
}

phase('多评委模拟')
const judgeReport = await agent('3评委并行评分。' + AGENT_CTX + '\n' + finalPaper.substring(0, 8000) + '\n魔鬼代言人: ' + devilAttack, { label: '多评委模拟', phase: '多评委模拟' })

if (!skipPhases.includes('进化记录')) {
  phase('进化记录')
  await agent('记录经验供下次复用。' + AGENT_CTX + '\n评委: ' + judgeReport + '\n输出 .claude/memory/lessons.md 格式。', { label: '进化记录', phase: '进化记录' })
}

log('')
log('========================================')
log('  数学建模完整流水线 v5 完成')
log('  模式: ' + (userApproach ? '思路驱动' : '自主分析'))
log('  时间: ' + timeLevel + ' | 竞赛: ' + strategy.name)
log('  论文: ' + (ensembleMode ? '多版本择优' : '标准'))
log('========================================')

return {
  modelingPlan,
  problemAnalysis, dataReport, algorithmRecommendation,
  solution, codeCheck, codeReview, validation, qualityGate, insights,
  paper, selectedPaper, polishedPaper, finalPaper,
  devilAttack, judgeReport,
  strategy, timeLevel, remainingHours,
  mode: userApproach ? '思路驱动' : '自主分析',
}
