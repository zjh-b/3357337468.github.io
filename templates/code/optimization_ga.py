# -*- coding: utf-8 -*-
"""
遗传算法(GA)优化模板
适用场景：组合优化、参数寻优、路径规划等
依赖：numpy, matplotlib
"""

import numpy as np
import matplotlib.pyplot as plt

# ============================================================
# 配置参数
# ============================================================
POP_SIZE = 100        # 种群大小
N_GENERATIONS = 200   # 迭代代数
CROSSOVER_RATE = 0.8  # 交叉概率
MUTATION_RATE = 0.1   # 变异概率
ELITE_SIZE = 5        # 精英保留数
SEED = 42             # 随机种子

np.random.seed(SEED)


# ============================================================
# 问题定义（按题目修改）
# ============================================================
def create_individual():
    """创建一个随机个体"""
    # 示例：长度为10的0-1向量
    return np.random.randint(0, 2, size=10)


def fitness(individual):
    """
    计算适应度（目标函数）

    返回:
        float: 适应度值（越大越好。如果是最小化问题，返回负值）
    """
    # 示例：最大化1的个数
    return np.sum(individual)


def crossover(parent1, parent2):
    """两点交叉"""
    if np.random.random() > CROSSOVER_RATE:
        return parent1.copy(), parent2.copy()
    p1, p2 = sorted(np.random.choice(len(parent1), 2, replace=False))
    child1 = np.concatenate([parent1[:p1], parent2[p1:p2], parent1[p2:]])
    child2 = np.concatenate([parent2[:p1], parent1[p1:p2], parent2[p2:]])
    return child1, child2


def mutate(individual):
    """位翻转变异"""
    mask = np.random.random(len(individual)) < MUTATION_RATE
    individual[mask] = 1 - individual[mask]
    return individual


def constraint_check(individual):
    """
    约束处理（按题目修改）

    返回:
        bool: True=可行, False=不可行
    """
    # 示例：至少选3个
    return np.sum(individual) >= 3


# ============================================================
# GA主循环
# ============================================================
def run_ga():
    """运行遗传算法"""
    # 初始化种群
    pop = [create_individual() for _ in range(POP_SIZE)]
    best_fitness_history = []
    avg_fitness_history = []

    for gen in range(N_GENERATIONS):
        # 计算适应度 + 罚函数处理不可行解
        fitnesses = []
        for ind in pop:
            f = fitness(ind)
            if not constraint_check(ind):
                f -= 1000  # 罚函数
            fitnesses.append(f)

        # 记录
        best_idx = np.argmax(fitnesses)
        best_fitness_history.append(fitnesses[best_idx])
        avg_fitness_history.append(np.mean(fitnesses))

        # 精英保留
        sorted_idx = np.argsort(fitnesses)[::-1]
        new_pop = [pop[sorted_idx[i]].copy() for i in range(ELITE_SIZE)]

        # 选择（锦标赛）
        while len(new_pop) < POP_SIZE:
            # 锦标赛选择
            candidates = np.random.choice(POP_SIZE, 3, replace=False)
            winner = candidates[np.argmax([fitnesses[c] for c in candidates])]

            # 轮盘赌选另一个父代
            fitnesses_np = np.array(fitnesses)
            fitnesses_np = fitnesses_np - fitnesses_np.min() + 1e-10
            probs = fitnesses_np / fitnesses_np.sum()
            other = np.random.choice(POP_SIZE, p=probs)

            # 交叉+变异
            c1, c2 = crossover(pop[winner], pop[other])
            c1 = mutate(c1)
            c2 = mutate(c2)
            new_pop.extend([c1, c2])

        pop = new_pop[:POP_SIZE]

    # 最终结果
    final_fitnesses = [fitness(ind) for ind in pop]
    best = pop[np.argmax(final_fitnesses)]

    return best, best_fitness_history, avg_fitness_history


# ============================================================
# 结果输出
# ============================================================
def report(best, history):
    print(f'最优个体: {best}')
    print(f'最优适应度: {fitness(best)}')
    print(f'收敛代数: {np.argmax(history[0])}')

    plt.figure(figsize=(8, 5))
    plt.plot(history[0], 'b-', label='最优适应度', alpha=0.8)
    plt.plot(history[1], 'r--', label='平均适应度', alpha=0.5)
    plt.xlabel('代数')
    plt.ylabel('适应度')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.savefig('ga_convergence.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('收敛曲线已保存: ga_convergence.png')


if __name__ == '__main__':
    best, best_hist, avg_hist = run_ga()
    report(best, (best_hist, avg_hist))
