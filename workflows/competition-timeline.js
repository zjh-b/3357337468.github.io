export const meta = {
  name: 'competition-timeline',
  description: '竞赛时间管理：根据比赛时间自动规划阶段节点，跟踪进度，超时提醒，智能止损建议',
  phases: [
    { title: '阶段规划', detail: '根据比赛时长分配各阶段时间' },
    { title: '进度跟踪', detail: '检查当前阶段完成情况' },
    { title: '风险预警', detail: '识别进度风险并给出建议' },
    { title: '止损建议', detail: '给出可牺牲清单和最晚启动时间' },
  ],
}

// 竞赛时间管理工作流
// 输入: { startTime: "2026-09-07 08:00", endTime: "2026-09-10 20:00", contest: "cumcm" }
// 或直接传入 duration 小时数

const config = args || {}
const contest = config.contest || 'cumcm'
const startTime = config.startTime || '未指定'
const endTime = config.endTime || '未指定'
const currentProgress = config.currentProgress || '未开始'

// 竞赛类型预设
const contestPresets = {
  'cumcm': {
    name: '全国大学生数学建模竞赛（国赛）',
    totalHours: 84, // 通常周四晚8点-周日晚8点，共72小时；周五8点-周一8点=72h
    phases: [
      { name: '选题与题目分析', hours: 4, pct: 5, deadline: '第4小时', deliverables: '选定题目+分析报告' },
      { name: '数据预处理', hours: 3, pct: 4, deadline: '第7小时', deliverables: '清洗后数据+EDA图表' },
      { name: '文献调研与算法选型', hours: 6, pct: 8, deadline: '第13小时', deliverables: '算法推荐报告' },
      { name: '模型1建立与求解', hours: 12, pct: 17, deadline: '第25小时', deliverables: '模型1代码+结果' },
      { name: '模型2建立与求解', hours: 10, pct: 14, deadline: '第35小时', deliverables: '模型2代码+结果' },
      { name: '模型3建立与求解（选做）', hours: 8, pct: 11, deadline: '第43小时', deliverables: '模型3代码+结果' },
      { name: '结果验证与敏感性分析', hours: 6, pct: 8, deadline: '第49小时', deliverables: '验证报告' },
      { name: '论文初稿撰写', hours: 10, pct: 14, deadline: '第59小时', deliverables: '完整论文初稿' },
      { name: '论文修改润色', hours: 8, pct: 11, deadline: '第67小时', deliverables: '最终论文.tex' },
      { name: '最终检查与提交', hours: 3, pct: 4, deadline: '第70小时', deliverables: '提交确认' },
      { name: '缓冲时间', hours: 2, pct: 3, deadline: '第72小时', deliverables: '应对意外' },
    ],
  },
  'huazhong-cup': {
    name: '华中杯',
    totalHours: 72,
    phases: [
      { name: '选题与题目分析', hours: 4, pct: 6, deadline: '第4小时', deliverables: '选定题目+分析报告' },
      { name: '数据预处理', hours: 3, pct: 4, deadline: '第7小时', deliverables: '清洗后数据' },
      { name: '文献调研与算法选型', hours: 5, pct: 7, deadline: '第12小时', deliverables: '算法推荐报告' },
      { name: '模型建立与求解', hours: 20, pct: 28, deadline: '第32小时', deliverables: '完整代码+结果' },
      { name: '结果验证与分析', hours: 6, pct: 8, deadline: '第38小时', deliverables: '验证报告' },
      { name: '论文初稿撰写', hours: 12, pct: 17, deadline: '第50小时', deliverables: '完整论文初稿' },
      { name: '论文修改润色', hours: 12, pct: 17, deadline: '第62小时', deliverables: '最终论文' },
      { name: '最终检查与提交', hours: 3, pct: 4, deadline: '第65小时', deliverables: '提交确认' },
      { name: '缓冲时间', hours: 7, pct: 10, deadline: '第72小时', deliverables: '应对意外' },
    ],
  },
  'mcm-icm': {
    name: 'MCM/ICM（美赛）',
    totalHours: 96, // 4天
    phases: [
      { name: 'Problem Selection & Analysis', hours: 6, pct: 6, deadline: '第6小时', deliverables: 'Problem chosen + analysis' },
      { name: 'Literature Review', hours: 6, pct: 6, deadline: '第12小时', deliverables: 'Literature review notes' },
      { name: 'Data Processing', hours: 4, pct: 4, deadline: '第16小时', deliverables: 'Cleaned data' },
      { name: 'Model 1 Development & Solution', hours: 14, pct: 15, deadline: '第30小时', deliverables: 'Model 1 code + results' },
      { name: 'Model 2 Development & Solution', hours: 14, pct: 15, deadline: '第44小时', deliverables: 'Model 2 code + results' },
      { name: 'Model 3 (if applicable)', hours: 10, pct: 10, deadline: '第54小时', deliverables: 'Model 3 code + results' },
      { name: 'Validation & Sensitivity', hours: 6, pct: 6, deadline: '第60小时', deliverables: 'Validation report' },
      { name: 'Paper Draft (English)', hours: 14, pct: 15, deadline: '第74小时', deliverables: 'Complete draft' },
      { name: 'Paper Revision & Polish', hours: 12, pct: 13, deadline: '第86小时', deliverables: 'Final paper' },
      { name: 'Final Check & Submission', hours: 4, pct: 4, deadline: '第90小时', deliverables: 'Submission confirmed' },
      { name: 'Buffer', hours: 6, pct: 6, deadline: '第96小时', deliverables: 'Contingency' },
    ],
  },
}

phase('阶段规划')
log(`正在为${contestPresets[contest]?.name || contest}制定时间规划...`)

const preset = contestPresets[contest] || contestPresets['cumcm']

const timelinePlan = await agent(
  `为以下数学建模竞赛制定详细的时间规划：

## 竞赛信息
- 竞赛名称：${preset.name}
- 总时长：${preset.totalHours}小时
- 开始时间：${startTime}
- 结束时间：${endTime}

## 预设阶段分配
${preset.phases.map((p, i) => `${i+1}. ${p.name}: ${p.hours}h (${p.pct}%) — 截止: ${p.deadline}`).join('\n')}

## 要求
请输出详细的时间管理计划：

1. **时间轴**：将每个阶段映射到具体的日期时间
2. **关键里程碑**：标注最重要的3-5个节点
3. **并行策略**：哪些阶段可以并行进行（如建模和数据处理可同时）
4. **每日检查点**：每天应完成什么
5. **吃饭休息安排**：合理的休息时间

用表格和具体时间点呈现。`,
  { label: '制定时间规划', phase: '阶段规划' }
)

phase('进度跟踪')
log('正在评估当前进度...')

const progressCheck = await agent(
  `根据以下信息，评估当前进度并给出调整建议：

## 时间规划
${timelinePlan}

## 当前状态
${currentProgress}

## 预设阶段
${preset.phases.map(p => `${p.name}: ${p.hours}h`).join('\n')}

## 要求
1. **已完成评估**：哪些阶段已完成？
2. **当前阶段**：现在应该在进行哪个阶段？
3. **进度偏差**：超前还是落后？偏差多少小时？
4. **调整建议**：如果落后，哪些阶段可以压缩？如何压缩？
5. **优先级排序**：剩余阶段按重要性排序

用表格展示进度对比（计划 vs 实际）。`,
  { label: '进度评估', phase: '进度跟踪' }
)

phase('风险预警')
log('正在识别进度风险...')

const riskWarning = await agent(
  `根据以下进度信息，识别潜在风险：

## 进度评估
${progressCheck}

## 时间规划
${timelinePlan}

## 常见风险
1. 模型求解时间超出预期（算法调参、debug时间）
2. 结果不合理需要返工
3. 论文撰写时间不足
4. 队友协作问题
5. 数据问题（发现数据质量差、需要额外数据等）
6. LaTeX编译问题
7. 网络/提交问题

## 要求
1. **风险识别**：针对当前进度，哪些风险最可能发生？
2. **风险等级**：高/中/低
3. **应对预案**：每个高风险给出具体的应急方案
4. **最小可提交方案**：如果时间不够，至少要完成什么？
5. **放弃清单**：什么可以牺牲？（如"问题3可简化"、"灵敏度分析可缩减"）

输出风险预警报告。`,
  { label: '风险预警', phase: '风险预警' }
)

phase('止损建议')
log('正在生成止损建议和硬性截止时间...')

const stopLoss = await agent(
  `根据以下进度和风险信息，给出比赛止损建议：

## 竞赛信息
- 竞赛名称：${preset.name}
- 总时长：${preset.totalHours}小时
- 开始时间：${startTime}
- 结束时间：${endTime}

## 阶段分配
${preset.phases.map((p, i) => `${i+1}. ${p.name}: ${p.hours}h — 截止: ${p.deadline}`).join('\n')}

## 当前进度
${currentProgress}

## 进度评估
${progressCheck}

## 风险预警
${riskWarning}

## 止损建议要求（这是关键！大多数队伍输在"做不完"而非"做不好"）

### 1. 硬性截止时间
对以下每个节点，给出"无论如何必须启动"的最晚时间：
- 论文撰写最晚启动时间：（即使模型未完全调优，也必须开始写论文的时间点）
- 论文初稿最晚完成时间：
- 最终检查最晚开始时间：
- 停止修改、开始提交的时间：

### 2. 可牺牲清单（按牺牲优先级排序）
如果时间不够，按以下顺序牺牲（第1个最先放弃）：
1. 【最先可牺牲的——对分数影响最小】
2. 【其次可牺牲的】
3. 【再次可牺牲的】
4. 【尽量保留的——对分数影响较大】
5. 【绝对不能牺牲的——缺了论文不完整】

对每项说明：牺牲后的降级方案是什么（如"不做灵敏度分析的3参数全扫，只做最重要参数的±20%单点测试"）

### 3. 降级路线图
如果当前进度落后，给出3条降级路线：
- **落后4小时以内**：如何压缩？（具体哪个阶段可以从X小时压缩到Y小时）
- **落后8小时以内**：如何压缩？
- **落后12小时以上**：紧急方案——最少需要完成什么才能交卷？

### 4. 三人并行策略
如果时间紧迫，三位队友应该如何分工并行以最大化效率？
- 队友A（建模）应该专注什么？
- 队友B（编程）应该专注什么？
- 队友C（写作）应该专注什么？

输出时使用表格和具体的时间点，确保每条建议都是可操作的。`,
  { label: '止损建议', phase: '止损建议' }
)

log('时间管理报告生成完成！')

return {
  contest: preset.name,
  totalHours: preset.totalHours,
  timelinePlan,
  progressCheck,
  riskWarning,
  stopLoss,
}
