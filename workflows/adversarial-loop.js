export const meta = {
  name: 'adversarial-loop',
  description: '多轮对抗修复：魔鬼代言人攻击→靶向修复→再攻击→再修复（最多3轮），直到论文质量收敛',
  phases: [
    { title: '第1轮攻击', detail: '魔鬼代言人5维攻击' },
    { title: '第1轮修复', detail: '靶向修复致命+严重问题' },
    { title: '第2轮攻击', detail: '验证修复+发现新问题' },
    { title: '第2轮修复', detail: '修复残留问题' },
    { title: '终审评分', detail: '多评委模拟评分，判断是否需要第3轮' },
    { title: '收敛报告', detail: '输出各轮改进轨迹' },
  ],
}

// 多轮对抗修复循环
// 核心思想：单次魔鬼代言人只能发现一部分问题。
//          通过"攻击→修复→再攻击→再修复"的循环，
//          让论文质量收敛到稳定高分。
//
// 输入:
//   args.paperFile: 论文.tex
//   args.maxRounds: 最大修复轮数（默认3）
//   args.targetScore: 目标分数（默认85，低于此分触发下一轮）
//   args.problemType: 问题类型（默认"优化类"）
//   args.contest: 竞赛类型（默认"cumcm"）
//
// 输出: 修复后的论文 + 各轮改进轨迹 + 最终评分

const config = args || {}
const paperFile = config.paperFile || '论文.tex'
const maxRounds = config.maxRounds || 3
const targetScore = config.targetScore || 85
const problemType = config.problemType || '优化类'
const contest = config.contest || 'cumcm'

log('========================================')
log('  多轮对抗修复循环')
log('========================================')
log(`论文: ${paperFile} | 目标分: ${targetScore} | 最多${maxRounds}轮`)
log('')

// ===== 状态跟踪 =====
const roundHistory = []
let currentPaper = paperFile
let finalScore = 0
let converged = false

// ===== 第1轮：攻击 =====
phase('第1轮攻击')
log('🔍 第1轮：魔鬼代言人5维攻击...')

const attack1 = await agent(
  `你是魔鬼代言人。对以下论文进行5维攻击。

论文文件: ${currentPaper}
问题类型: ${problemType}
竞赛: ${contest}

## 5维攻击
1. **假设攻击**：每个假设的反例？不合理之处？
2. **方法攻击**：为什么选这个算法？"创新"是真的吗？参数有依据吗？
3. **结果攻击**：结果是模型能力还是运气？统计检验做了吗？图表是否误导？
4. **逻辑攻击**："因为A所以B"真的成立吗？论证链有断点吗？
5. **证据攻击**：哪些断言没有数据支撑？"具有较好的鲁棒性"——数字呢？

## 输出格式
### 第1轮攻击发现
| 排名 | 维度 | 致命程度 | 问题描述 | 位置 |
|------|------|---------|---------|------|
| 1 | ... | 致命/严重/一般 | ... | ... |

### 致命/严重问题详情（列出每个问题的具体修复方案）`,
  { label: '第1轮5维攻击', phase: '第1轮攻击' }
)

// ===== 第1轮：修复 =====
phase('第1轮修复')
log('🔧 第1轮：靶向修复致命+严重问题...')

const fix1 = await agent(
  `请对论文进行靶向修复，只修复以下魔鬼代言人发现的问题，不动其余内容。

## 需要修复的问题
${attack1}

## 当前论文
${currentPaper}

## 修复原则
1. **靶向修复**：只修改问题所在的段落/公式/章节，不重写整篇论文
2. **保留好的部分**：不要因为修一个问题而引入新问题
3. **优先级**：致命 > 严重 > 一般（如果时间只够修致命+严重）
4. **每个修复标注**：在修改处加LaTeX注释 `% [修复: 原问题描述]`

## 输出格式
### 修复了X处致命问题、Y处严重问题
### 修复后的完整论文
\`\`\`latex
[完整.tex内容]
\`\`\``,
  { label: '第1轮靶向修复', phase: '第1轮修复' }
)

roundHistory.push({ round: 1, attack: attack1, fix: fix1 })

// ===== 第2轮：攻击（验证修复） =====
if (maxRounds >= 2) {
  phase('第2轮攻击')
  log('🔍 第2轮：验证修复效果+发现新问题...')

  const attack2 = await agent(
    `请对修复后的论文进行第2轮攻击，重点关注：
1. 第1轮的问题是否被正确修复？（修复是否引入了新错误？）
2. 第1轮被标记为"一般"的问题是否仍然存在？
3. 是否有第1轮未发现的新问题？

## 第1轮攻击和修复
${attack1.substring(0, 1500)}

## 修复后的论文
${fix1}

## 输出格式
### 第1轮修复验证
| 第1轮问题 | 修复状态 | 备注 |
|----------|---------|------|
| ... | ✅已修复 / ⚠️部分修复 / ❌未修复 | ... |

### 第2轮新发现问题
| 排名 | 维度 | 致命程度 | 问题描述 |
|------|------|---------|---------|
| ... | ... | ... | ... |

### 如果第1轮问题全部修复且第2轮无新致命问题
标注"✅ 论文已收敛，建议进入终审"`,
    { label: '第2轮验证攻击', phase: '第2轮攻击' }
  )

  // 判断是否需要第2轮修复
  const needsRound2Fix = attack2.includes('未修复') || attack2.includes('新发现')

  if (needsRound2Fix) {
    phase('第2轮修复')
    log('🔧 第2轮：修复残留和新问题...')

    const fix2 = await agent(
      `靶向修复第2轮发现的问题。只修改问题所在位置，不动其余内容。
${attack2}
${fix1}

输出修复后的完整论文。`,
      { label: '第2轮靶向修复', phase: '第2轮修复' }
    )

    roundHistory.push({ round: 2, attack: attack2, fix: fix2 })
    currentPaper = fix2
  } else {
    log('✅ 第2轮无新问题，论文已收敛')
    converged = true
    currentPaper = fix1
  }
}

// ===== 终审评分 =====
phase('终审评分')
log('📊 终审：多评委模拟评分...')

const finalJudge = await agent(
  `请对最终论文进行多评委模拟评分。

论文: ${currentPaper}
问题类型: ${problemType}
竞赛: ${contest}

## 对抗修复历史
第1轮: 发现X个问题 → 修复
${roundHistory.length >= 2 ? '第2轮: 发现X个新问题 → 修复' : ''}

## 评分（100分制）
| 维度 | 满分 | 得分 | 评语 |
|------|------|------|------|
| 问题理解与建模 | 25 | XX | ... |
| 算法设计与实现 | 25 | XX | ... |
| 结果分析与验证 | 20 | XX | ... |
| 写作表达与规范 | 20 | XX | ... |
| 创新性与实用性 | 10 | XX | ... |
| **总分** | **100** | **XX** | |

## 是否达到目标分(${targetScore})？
[是/否]

## 如果未达目标分，是否需要第3轮？
[是/否 + 理由 + 第3轮应重点关注什么]`,
  { label: '终审评分', phase: '终审评分' }
)

// 提取分数
const scoreMatch = finalJudge.match(/总分.*?(\d+)/)
finalScore = scoreMatch ? parseInt(scoreMatch[1]) : 0

// ===== 第3轮（如果未收敛且分数低） =====
if (!converged && finalScore < targetScore && maxRounds >= 3) {
  phase('第3轮攻击')
  log(`⚠️ 当前${finalScore}分 < 目标${targetScore}分，启动第3轮...`)

  const attack3 = await agent(
    `论文仍有提升空间（当前${finalScore}分，目标${targetScore}分）。请针对性攻击得分最低的维度。
${finalJudge}

输出每处可修复的问题和具体修复方案。`,
    { label: '第3轮精准攻击', phase: '第3轮攻击' }
  )

  const fix3 = await agent(
    `靶向修复第3轮发现的问题。
${attack3}
${currentPaper}

输出修复后的完整论文。`,
    { label: '第3轮靶向修复', phase: '第3轮修复' }
  )

  roundHistory.push({ round: 3, attack: attack3, fix: fix3 })
  currentPaper = fix3

  // 最终评分
  const finalScore3 = await agent(
    `对第3轮修复后的论文进行最终评分。
${currentPaper}
输出格式同上，含总分。`,
    { label: '最终评分', phase: '终审评分' }
  )

  const sm = finalScore3.match(/总分.*?(\d+)/)
  if (sm) finalScore = parseInt(sm[1])
}

// ===== 收敛报告 =====
phase('收敛报告')
log('正在生成各轮改进轨迹...')

const convergenceReport = await agent(
  `请生成多轮对抗修复的收敛报告。

## 修复轮次: ${roundHistory.length}
## 最终分数: ${finalScore}
## 收敛状态: ${converged ? '✅ 已收敛' : finalScore >= targetScore ? '✅ 达到目标' : '⚠️ 建议人工介入'}

## 输出格式
# 多轮对抗修复收敛报告

## 改进轨迹
| 轮次 | 致命问题 | 严重问题 | 一般问题 | 预估分数 |
|------|---------|---------|---------|---------|
| 初始(第1轮攻击) | X | X | X | XX |
| 第1轮修复后(第2轮攻击) | X | X | X | XX |
| 第2轮修复后(终审) | X | X | X | XX |
${roundHistory.length >= 3 ? '| 第3轮修复后 | X | X | X | XX |' : ''}

## 每轮修复的关键改进
1. 第1轮：[最关键的1-2个修复]
2. 第2轮：[最关键的1-2个修复]

## 收敛分析
- 从初始到最终提升了XX分
- 最大的单次提升来自第X轮的XX修复
- ${converged ? '论文在第' + roundHistory.length + '轮收敛' : '仍有提升空间'}

## 最终论文质量评估
- 是否达到省一水平(85+): [是/否]
- 是否还有明显扣分项: [是/否]
- 建议: [提交 / 人工复审 / 继续修复]`,
  { label: '收敛报告', phase: '收敛报告' }
)

log('')
log('========================================')
log('  多轮对抗修复完成')
log(`  轮次: ${roundHistory.length} | 最终分: ${finalScore}`)
log('========================================')

return {
  roundHistory,
  finalPaper: currentPaper,
  finalScore,
  converged,
  convergenceReport,
}
