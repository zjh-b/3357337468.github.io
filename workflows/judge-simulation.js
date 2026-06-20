export const meta = {
  name: 'judge-simulation',
  description: '评委模拟v2：5分钟快速扫描+3专业评委并行评审+魔鬼代言人对抗+综合评分+改进方案',
  phases: [
    { title: '快速扫描', detail: '模拟评委5分钟第一遍评阅' },
    { title: '多评委评审', detail: '方法论+创新性+写作质量三评委并行' },
    { title: '综合评分', detail: '综合3评委结果+魔鬼代言人发现，给出最终评分' },
    { title: '改进方案', detail: '输出优先级排序的修改建议' },
  ],
}

// 评委模拟工作流 v2
// 核心升级：单一评委 → 3专业评委并行 + 1魔鬼代言人对抗
//
// 3位评委的专业领域：
//   评委A（方法论）：关注模型正确性、约束完整性、算法合理性、验证充分性
//   评委B（创新性）：关注创新点真实性、管理启示深度、推广价值、实际意义
//   评委C（写作质量）：关注语言流畅度、逻辑连贯性、图表规范性、格式合规性
//
// 魔鬼代言人（外部输入）：以"摧毁论文"为目标，找出最致命的弱点
//   来自 devils-advocate 工作流的 defensePlan 输出
//
// 输入:
//   args.paperFile: 论文文件路径
//   args.contest: 比赛类型
//   args.devilReport: (可选) 魔鬼代言人的输出，纳入综合评分

const config = args || {}
const paperFile = config.paperFile || '论文.tex'
const contest = config.contest || 'cumcm'
const devilReport = config.devilReport || ''

// 各竞赛评分标准
const rubrics = {
  'cumcm': {
    name: '国赛 CUMCM',
    totalScore: 100,
    dimensions: [
      { key: 'modeling', name: '问题理解与建模', maxScore: 25 },
      { key: 'algorithm', name: '算法设计与实现', maxScore: 25 },
      { key: 'results', name: '结果分析与验证', maxScore: 20 },
      { key: 'writing', name: '写作表达与规范', maxScore: 20 },
      { key: 'innovation', name: '创新性与实用性', maxScore: 10 },
    ],
  },
  'huazhong-cup': {
    name: '华中杯',
    totalScore: 100,
    dimensions: [
      { key: 'modeling', name: '问题理解与建模', maxScore: 25 },
      { key: 'algorithm', name: '算法设计与实现', maxScore: 25 },
      { key: 'results', name: '结果分析与验证', maxScore: 20 },
      { key: 'writing', name: '写作表达与规范', maxScore: 20 },
      { key: 'innovation', name: '创新性与实用性', maxScore: 10 },
    ],
  },
  'mcm-icm': {
    name: 'MCM/ICM',
    totalScore: 100,
    dimensions: [
      { key: 'modeling', name: 'Problem Understanding & Modeling', maxScore: 25 },
      { key: 'algorithm', name: 'Solution Approach & Implementation', maxScore: 25 },
      { key: 'results', name: 'Results Analysis & Validation', maxScore: 20 },
      { key: 'writing', name: 'Writing & Presentation', maxScore: 20 },
      { key: 'innovation', name: 'Creativity & Practicality', maxScore: 10 },
    ],
  },
}

const rubric = rubrics[contest] || rubrics['cumcm']
const isEnglish = contest === 'mcm-icm'

// ===== 第一阶段：快速扫描（保留 v1 逻辑） =====
phase('快速扫描')
log(`正在进行5分钟评委快速扫描（${rubric.name}标准）...`)

const quickScanPrompt = isEnglish ?
  `You are an experienced MCM/ICM judge. Spend exactly 5 minutes scanning this paper.

Paper: ${paperFile}

## 5-Minute Scan Protocol:
1. **Minute 0-1**: Read ONLY Summary. Specific numbers? Method clear? Results quantified?
2. **Minute 1-2**: Flip to Conclusions. Echo the Summary? Valuable insights?
3. **Minute 2-3**: Scan ALL figures/tables. Best? Worst? Self-explanatory?
4. **Minute 3-4**: Pick random model section. Formulas explained in words?
5. **Minute 4-5**: References. Classic papers? Mix of sources? ≥10 entries?

## Output:
### First Impression: Excellent / Good / Average / Below Average / Poor
### 5 Key Findings (strengths + issues)
### Summary Diagnosis (numbers? method? results?)
### Figure Diagnosis (best/worst/missing)
### Memorable Takeaway (or "NO MEMORY POINT — biggest problem")` :
  `你是一位经验丰富的${rubric.name}评阅老师。请用5分钟快速浏览以下论文。

论文文件: ${paperFile}

## 5分钟扫描流程
1. **第0-1分钟**：只看摘要。有具体数字吗？方法清楚吗？结果量化了吗？
2. **第1-2分钟**：翻到结论。呼应了摘要吗？有管理启示吗？
3. **第2-3分钟**：扫所有图表。最好/最差的图？是否自解释？
4. **第3-4分钟**：随机挑一段模型章节。公式有文字解释吗？有没有连续堆公式？
5. **第4-5分钟**：翻参考文献。有经典论文吗？中英文混合吗？≥10篇吗？

## 输出格式
### 第一印象：好 / 中上 / 中 / 中下 / 差
### 5个关键发现（优缺点各≥2条）
### 摘要诊断（数字？方法？结果？）
### 图表诊断（最好/最差/缺失）
### 论文的记忆点（如果没有，标注"无记忆点——这是最大的问题"）`;

const quickScan = await agent(quickScanPrompt, { label: '5分钟快速扫描', phase: '快速扫描' })

// ===== 第二阶段：多评委并行评审（v2 核心升级） =====
phase('多评委评审')
log('正在启动3位专业评委并行评审...')
log('  评委A: 方法论专家（建模+算法+验证）')
log('  评委B: 创新性专家（创新+启示+推广）')
log('  评委C: 写作质量专家（语言+逻辑+格式）')

const [judgeMethodology, judgeInnovation, judgeWriting] = await parallel([
  // 评委A：方法论专家
  () => agent(
    isEnglish ?
    `You are Judge A — a methodology expert. Your expertise: model correctness, constraint completeness, algorithm validity, verification thoroughness.

Paper: ${paperFile}
Quick scan impression: ${quickScan.substring(0, 1000)}

## Your Scoring Focus (ONLY these dimensions):
1. **Problem Understanding & Modeling** (${rubric.dimensions[0].maxScore} pts):
   - Is the problem truly understood, or just restated?
   - Are model assumptions justified with reasoning (not hand-waving)?
   - Is the model formulation complete and correct?
   - Are constraints all enumerated and explained?

2. **Algorithm Design & Implementation** (${rubric.dimensions[1].maxScore} pts):
   - Is the algorithm choice justified (problem size analysis + literature)?
   - Are algorithm design decisions motivated (not just "we used GA")?
   - Is there baseline comparison? Is the improvement meaningful?
   - Are parameters justified?

3. **Results Analysis & Validation** (${rubric.dimensions[2].maxScore} pts):
   - Are results credible? Statistical tests? Multiple runs?
   - Is sensitivity analysis deep (finding non-trivial relationships)?
   - Is validation thorough? Baseline? Small-scale exact solution?
   - Are limitations honestly discussed?

## Output Format:
### Judge A: Methodology Score
| Dimension | Score | Max | Key Evidence |
|-----------|-------|-----|-------------|
| Problem Understanding & Modeling | XX | ${rubric.dimensions[0].maxScore} | ... |
| Algorithm Design & Implementation | XX | ${rubric.dimensions[1].maxScore} | ... |
| Results Analysis & Validation | XX | ${rubric.dimensions[2].maxScore} | ... |
| **Subtotal** | **XX** | **${rubric.dimensions[0].maxScore + rubric.dimensions[1].maxScore + rubric.dimensions[2].maxScore}** | |

### Top 3 Methodology Issues (most severe first):
1. 🔴 [Issue] — [Location] — [Fix]
2. 🟡 [Issue] — [Location] — [Fix]
3. 🟢 [Issue] — [Location] — [Fix]

### What This Paper Does Well (methodology-wise):` :
    `你是**评委A——方法论专家**。你只关注：模型正确性、约束完整性、算法合理性、验证充分性。你对语言流畅度和格式美观度不感兴趣。

论文文件: ${paperFile}
快速扫描印象: ${quickScan.substring(0, 1000)}

## 你的评分范围（只评这3个维度，其他维度留给另外2位评委）

### 1. 问题理解与建模（${rubric.dimensions[0].maxScore}分）
- 问题分析是否展示了真正的洞察（而非"这是NP-hard问题"）？
- 模型假设是否有合理性说明（而非只是列举）？
- 目标函数和约束是否完整、正确？
- 每条约束是否说明了：含义+为什么需要+不满足的后果？

### 2. 算法设计与实现（${rubric.dimensions[1].maxScore}分）
- 算法选择是否有充分理由（规模分析+文献支撑）？
- 算法设计中的每个决策是否有动机说明？
- **是否与基线方法做了公平对比？提升是否显著？**
- 参数设置是否有依据（不只是"调参得到"）？

### 3. 结果分析与验证（${rubric.dimensions[2].maxScore}分）
- 结果是否可信（多次运行？统计检验？）？
- 灵敏度分析是否深入（发现非平凡关系 vs "影响不大"）？
- 验证是否充分（不止灵敏度，还有基线对比、小规模精确解等）？
- 模型局限性是否诚实讨论？

## 输出格式
### 评委A：方法论评分
| 维度 | 得分 | 满分 | 关键证据 |
|------|------|------|---------|
| 问题理解与建模 | XX | ${rubric.dimensions[0].maxScore} | 引用论文原文 |
| 算法设计与实现 | XX | ${rubric.dimensions[1].maxScore} | 引用论文原文 |
| 结果分析与验证 | XX | ${rubric.dimensions[2].maxScore} | 引用论文原文 |
| **小计** | **XX** | **${rubric.dimensions[0].maxScore + rubric.dimensions[1].maxScore + rubric.dimensions[2].maxScore}** | |

### 评委A发现的最严重的3个问题
1. 🔴 [问题] — [位置] — [修复方案]
2. 🟡 [问题] — [位置] — [修复方案]
3. 🟢 [问题] — [位置] — [修复方案]

### 方法论层面做得好的
[引用具体内容]`,
    { label: '评委A:方法论', phase: '多评委评审' }
  ),

  // 评委B：创新性专家
  () => agent(
    isEnglish ?
    `You are Judge B — an innovation & impact expert. Your expertise: novelty claims, management insights, practical value, extensibility.

Paper: ${paperFile}

## Your Scoring Focus (ONLY these dimensions):
1. **Innovation & Practicality** (${rubric.dimensions[4].maxScore} pts): ...
2. Also cross-check: Problem Understanding for insight depth

## Output: (similar format to Judge A)` :
    `你是**评委B——创新性与实用性专家**。你只关注：创新点是否真实、管理启示是否有价值、模型是否有实际应用前景。你对公式推导细节不感兴趣。

论文文件: ${paperFile}
快速扫描印象: ${quickScan.substring(0, 1000)}

## 你的评分范围

### 1. 问题理解的深度（评委A评建模正确性，你评审"洞察深度"）
- 论文是否展示了对问题本质的深度理解？
- 问题分析中是否有超越题目表面的洞察？
- 文献调研是否展示了领域知识广度？

### 2. 创新性与实用性（${rubric.dimensions[4].maxScore}分）
- **创新声明是否诚实？**"提出新算法"→真的是新的吗？还是标准方法的改进应用？
- 如果创新在于"问题特定的算子设计"或"领域知识的融入"，这比声称"新算法"更可信
- **管理启示（6.5子节）是否有实际价值？**
  - 每一条建议是否有数据支撑？
  - 建议是否是"具体到可以被管理者直接执行的"？
  - 有没有识别出阈值/临界点/非平凡关系？
- 模型推广是否具体（"可用于XX领域，需要调整YY" vs "可用于其他领域"）？
- 论文是否有"记忆点"——评委24小时后还能记住的东西？

## 输出格式
### 评委B：创新性评分
| 维度 | 得分 | 满分 | 关键证据 |
|------|------|------|---------|
| 问题洞察深度 | [定性评估] | — | 引用具体洞察 |
| 创新性与实用性 | XX | ${rubric.dimensions[4].maxScore} | 引用具体创新/启示 |

### 评委B对创新声明的事实核查
- 论文声称的创新：[引用原文]
- 核查结果：✅属实 / ⚠️夸大 / ❌虚假
- 如果夸大/虚假，具体原因：

### 管理启示（6.5子节）价值评估：高 / 中 / 低 / 无此子节
- 最好的启示：[引用]
- 最弱的启示：[引用]

### 论文的记忆点质量：强 / 一般 / 无
（如果"无"或"一般"，给出强化建议）`,
    { label: '评委B:创新性', phase: '多评委评审' }
  ),

  // 评委C：写作质量专家
  () => agent(
    isEnglish ?
    `You are Judge C — a writing & presentation expert. Your expertise: language, logic, figures/tables, format compliance.

Paper: ${paperFile}

## Your Scoring Focus: Writing & Presentation (${rubric.dimensions[3].maxScore} pts)

## Output: (similar format to Judge A)` :
    `你是**评委C——写作与表达专家**。你只关注：语言是否清晰、逻辑是否连贯、图表是否规范、格式是否合规。你对数学推导是否正确不感兴趣。

论文文件: ${paperFile}
快速扫描印象: ${quickScan.substring(0, 1000)}

## 你的评分范围

### 写作表达与规范（${rubric.dimensions[3].maxScore}分）

#### 语言质量（8分）
- [ ] 是否有模板化废话？（"随着...发展""具有重要...意义"）——每处-1分
- [ ] 是否有空洞断言？（"效果很好"但没有数字）——每处-1分
- [ ] 学术表达是否规范？（口语化、第一人称滥用等）
- [ ] 摘要信息密度是否高？（300-500字该有的信息量）

#### 逻辑与结构（5分）
- [ ] 叙事主线是否清晰？（问题→本质→方法→验证→启示）
- [ ] 各章节之间是否有合理过渡？（还是各自为政？）
- [ ] 摘要的承诺是否在结论中兑现？
- [ ] 论证是否充分（结论有数据支撑 vs 空谈）？

#### 图表质量（4分）
- [ ] 图表是否规范（三线表、标题位置、编号格式）？
- [ ] 图表是否自解释（不看正文也能懂）？
- [ ] 每个图表前是否有引导？后是否有解读？
- [ ] 是否有一张"核心示意图"（模型架构/流程总览）？

#### 格式合规（3分）
- [ ] 字体字号是否规范？
- [ ] 页边距、行距是否正确？
- [ ] 公式格式是否正确（equation/align，无\\$\\$）？
- [ ] 参考文献格式是否规范？是否有中英文混合？

## 输出格式
### 评委C：写作评分
| 子维度 | 得分 | 满分 | 关键证据 |
|--------|------|------|---------|
| 语言质量 | XX | 8 | 引用具体好/差句子 |
| 逻辑与结构 | XX | 5 | ... |
| 图表质量 | XX | 4 | ... |
| 格式合规 | XX | 3 | ... |
| **小计** | **XX** | **20** | |

### 废话检测结果
- 模板化废话：XX处 — [列举最严重的3处]
- 空洞断言：XX处 — [列举最严重的3处]
- 无信息量句子：XX处

### 图表逐项审查
- 最好的图：[哪个] — 好在哪
- 最差的图：[哪个] — 差在哪 — 怎么改
- 缺失的图：[应该有什么]

### 如果我是评委，第一遍翻完的感觉是：
（1-2句话，模拟真实评委的心理活动）`,
    { label: '评委C:写作', phase: '多评委评审' }
  ),
])

// ===== 第三阶段：综合评分 =====
phase('综合评分')
log('正在综合3位评委+魔鬼代言人的评审结果...')

const devilContext = devilReport ?
  `\n## 魔鬼代言人攻击报告（外部输入）\n${devilReport.substring(0, 3000)}` :
  ''

const finalScore = await agent(
  isEnglish ?
  `You are the HEAD JUDGE. Synthesize 3 specialist judges + devil's advocate into a final score.

## Judge A (Methodology)
${judgeMethodology}

## Judge B (Innovation)
${judgeInnovation}

## Judge C (Writing)
${judgeWriting}
${devilContext}

## Your Task:
1. Synthesize into a single coherent score
2. When judges disagree, YOU decide
3. The devil's advocate's findings carry special weight for "fatal" issues
4. Output final score and top improvement priorities

## Output: [final score table + 3-priority improvement plan + estimated prize level]` :
  `你是**评审组长**。请综合3位专业评委的独立评审结果${devilReport ? '和魔鬼代言人的攻击发现' : ''}，给出最终评分。

## 评委A：方法论专家
${judgeMethodology}

## 评委B：创新性专家
${judgeInnovation}

## 评委C：写作质量专家
${judgeWriting}
${devilContext}

## 综合规则
1. **正常情况**：取3位评委各自领域的评分，直接汇总
2. **评委分歧**：当2位以上评委对同一问题有不同判断时，你裁决
3. **魔鬼代言人优先**：魔鬼代言人发现的"致命"问题，即使3位评委都没注意到，也要纳入最终评分（在相应的维度扣分）
4. **交叉验证**：如果魔鬼代言人说某处是致命的，但3位评委都没提——标注为"评委盲区"，但仍需扣分

## 输出格式

### 最终评分汇总
| 维度 | 评委A | 评委B | 评委C | 综合 | 满分 |
|------|-------|-------|-------|------|------|
| 问题理解与建模 | XX | [评委B对洞察的评估] | — | XX | ${rubric.dimensions[0].maxScore} |
| 算法设计与实现 | XX | — | — | XX | ${rubric.dimensions[1].maxScore} |
| 结果分析与验证 | XX | — | — | XX | ${rubric.dimensions[2].maxScore} |
| 写作表达与规范 | — | — | XX | XX | ${rubric.dimensions[3].maxScore} |
| 创新性与实用性 | — | XX | — | XX | ${rubric.dimensions[4].maxScore} |
| **总分** | | | | **XX** | **100** |

### 评委分歧裁决
（如有2位以上评委判断不一致的问题，说明你的裁决和理由）

### 魔鬼代言人交叉验证
| 魔鬼代言人致命发现 | 评委A是否发现 | 评委B是否发现 | 评委C是否发现 | 是否纳入扣分 |
|------------------|-------------|-------------|-------------|------------|
| [发现1] | ✅/❌ | ✅/❌ | ✅/❌ | ✅/理由 |

### 评委盲区警示
（魔鬼代言人发现但3位评委都没注意到的致命问题）
如果没有盲区，标注"✅ 3位评委+魔鬼代言人达成共识，无盲区"

### 预估获奖等级
- 当前得分: XX/100
- 预估等级: [省一(85+) / 省二(70-84) / 省三(60-69) / 成功参赛(<60)]
- 置信度: 高/中/低

### 如果只改3处（按提分效果排序，综合4方意见）
1. 🔴 [最优先] — 来自[评委X/魔鬼代言人] — [具体操作] — 预计+XX分
2. 🟡 [次优先] — 来自[评委X/魔鬼代言人] — [具体操作] — 预计+XX分
3. 🟢 [第三] — 来自[评委X/魔鬼代言人] — [具体操作] — 预计+XX分`,
  { label: '综合评分', phase: '综合评分' }
)

// ===== 第四阶段：改进方案 =====
phase('改进方案')
log('正在生成优先级改进方案...')

const improvementPlan = await agent(
  `基于以下评审结果，生成可操作的改进方案：

## 综合评分
${finalScore}

## 快速扫描
${quickScan.substring(0, 1000)}

## 要求
1. **紧急修复（最后2小时）**：3-5个最小改动最大提分的修改
2. **深度优化（如有4-6小时）**：较大改动，按优先级排序
3. **如果只能改一处**：什么？为什么？
4. **提交前检查清单**：10项绝对不能遗漏
5. **预估得分区间**：不改/紧急修复/深度优化 三种情况的预估

${isEnglish ? 'Output in English.' : '请直接、实用、可操作。每一条都能直接执行。'}`,
  { label: '生成改进方案', phase: '改进方案' }
)

log('')
log('═══════════════════════════════════')
log('  多评委模拟 v2 完成！')
log('═══════════════════════════════════')

return {
  quickScan,
  judges: {
    methodology: judgeMethodology,
    innovation: judgeInnovation,
    writing: judgeWriting,
  },
  finalScore,
  improvementPlan,
  rubric: rubric.name,
}
