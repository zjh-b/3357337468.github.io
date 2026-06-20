export const meta = {
  name: 'algorithm-research',
  description: '算法调研：多角度并行搜索适用算法，对比分析并推荐最佳方案',
  phases: [
    { title: '多路搜索', detail: '从不同角度并行搜索算法' },
    { title: '对比分析', detail: '多维度对比候选算法' },
    { title: '方案推荐', detail: '输出算法推荐报告' },
  ],
}

const problemDesc = args || '数学建模优化问题'

// 项目内可用的算法参考资源
const ALGO_GUIDES = '算法集锦/ 目录下有4份算法指南：黄金算法匹配表（AHP/TOPSIS/ARIMA/GA/PSO等50+算法与问题类型匹配）、创新算法汇总表（改进AHP-直觉模糊/ARIMA+LSTM+XGBoost/PSO-GA等组合创新方案）、高频必备算法汇总表（按题型的标准算法+升级方案）、美赛高频算法汇总表。请在调研时参考这些指南中的算法选型建议。'

phase('多路搜索')
log(`正在多角度搜索算法: ${problemDesc}`)
log('项目内有算法集锦指南可供参考')

// 第一步：从多个方向并行搜索
const [exactAlgorithms, heuristicAlgorithms, mlApproaches, toolSurvey] = await parallel([
  () => agent(
    `针对以下问题，搜索适用的精确算法（精确求解最优解）：

${problemDesc}

请调研：
1. 可以建立什么数学模型（如整数规划、混合整数规划、约束规划等）
2. 精确求解算法（分支定界、割平面、列生成、动态规划等）
3. 每种算法的计算复杂度
4. 可求解的问题规模上限
5. 推荐的求解器或实现方式

输出详细的精确算法分析。`,
    { label: '精确算法', phase: '多路搜索' }
  ),
  () => agent(
    `针对以下问题，搜索适用的启发式/元启发式算法：

${problemDesc}

请调研：
1. 构造型启发式（贪心、最近邻、插入法等）
2. 局部搜索算法（禁忌搜索、模拟退火、变邻域搜索等）
3. 群体智能算法（遗传算法、粒子群、蚁群算法等）
4. 自适应大规模邻域搜索(ALNS)
5. 混合启发式策略

对每种算法说明原理、计算复杂度、优缺点和适用性。`,
    { label: '启发式算法', phase: '多路搜索' }
  ),
  () => agent(
    `针对以下问题，搜索机器学习/数据驱动的求解方法：

${problemDesc}

请调研：
1. 监督学习方法（回归、分类预测等）
2. 强化学习方法（Q-learning、深度强化学习等）
3. 聚类和降维方法
4. 神经网络方法（图神经网络、注意力机制等）
5. 集成方法

分析机器学习方法在此问题中的适用性和局限性。`,
    { label: 'ML方法', phase: '多路搜索' }
  ),
  () => agent(
    `针对以下问题类型，调研Python可用的求解工具和库：

${problemDesc}

请调研：
1. **商用求解器**：Gurobi、CPLEX的Python接口和能力
2. **开源求解器**：OR-Tools、SCIP、HiGHS等
3. **启发式框架**：mealpy、scikit-opt、pymoo等
4. **ML框架**：scikit-learn、PyTorch、TensorFlow相关库
5. **专业工具**：networkx、simpy、cvxpy等

对每个工具说明安装方式、主要功能和适用场景。`,
    { label: '工具调研', phase: '多路搜索' }
  ),
])

phase('对比分析')
log('正在进行算法对比分析...')

const comparison = await agent(
  `请根据以下四份调研报告，对候选算法进行全面的对比分析：

## 精确算法
${exactAlgorithms.substring(0, 3000)}

## 启发式算法
${heuristicAlgorithms.substring(0, 3000)}

## 机器学习方法
${mlApproaches.substring(0, 3000)}

## 工具调研
${toolSurvey.substring(0, 3000)}

请按以下维度对比：
1. **求解质量**：能否得到最优解？近似程度如何？
2. **计算效率**：时间复杂度和实际运行时间估计
3. **实现难度**：算法实现的复杂度和开发时间
4. **鲁棒性**：对数据变化和参数扰动的敏感程度
5. **可解释性**：结果是否容易理解，是否方便写论文
6. **可扩展性**：能否适应问题规模增大

用表格形式输出对比结果。`,
  { label: '算法对比', phase: '对比分析' }
)

phase('方案推荐')
log('正在生成最终推荐方案...')

const recommendation = await agent(
  `基于以下对比分析结果，给出算法推荐方案。

## 参考：项目算法指南
${ALGO_GUIDES}

## 对比分析
${comparison}

请输出：

# 算法推荐方案

## 一、首选方案
（推荐的第一方案，说明理由，给出算法流程图或伪代码）

## 二、备选方案
（如果首选方案不理想，提供1-2个备选）

## 三、混合策略
（是否可以将多种方法结合使用？）

## 四、实现路线图
（分步骤的实现计划）

## 五、预期效果
（预期能达到的结果质量、运行时间等）

## 六、论文写作建议
（如何在论文中描述这些方法、突出什么创新点）`,
  { label: '推荐方案', phase: '方案推荐' }
)

log('算法调研完成！')
return { exactAlgorithms, heuristicAlgorithms, mlApproaches, toolSurvey, comparison, recommendation }
