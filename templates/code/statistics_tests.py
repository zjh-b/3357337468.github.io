# -*- coding: utf-8 -*-
"""
统计检验模板 — 论文中最常用的统计检验方法
适用场景：模型对比、显著性验证、分布检验
依赖：scipy, numpy
"""

import numpy as np
from scipy import stats

# ============================================================
# 1. 配对t检验 — 两组配对数据的均值差异是否显著
# ============================================================
def paired_ttest(before, after, alpha=0.05):
    """
    配对t检验（如：优化前 vs 优化后）

    返回:
        dict: {t_statistic, p_value, significant, conclusion}
    """
    t_stat, p_value = stats.ttest_rel(after, before)
    significant = p_value < alpha

    conclusion = (
        f'差异统计{"显著" if significant else "不显著"} '
        f'(t={t_stat:.3f}, p={p_value:.4f}{"**" if significant else ""})'
    )
    return {
        'test': '配对t检验',
        't_statistic': t_stat,
        'p_value': p_value,
        'significant': significant,
        'conclusion': conclusion,
    }


# ============================================================
# 2. 独立样本t检验 — 两组独立数据的均值差异
# ============================================================
def independent_ttest(group1, group2, alpha=0.05):
    """独立样本t检验（如：方法A vs 方法B）"""
    t_stat, p_value = stats.ttest_ind(group1, group2)
    return {
        'test': '独立样本t检验',
        't_statistic': t_stat,
        'p_value': p_value,
        'significant': p_value < alpha,
        'conclusion': f't={t_stat:.3f}, p={p_value:.4f}',
    }


# ============================================================
# 3. Wilcoxon符号秩检验 — t检验的非参数替代（不要求正态性）
# ============================================================
def wilcoxon_test(before, after, alpha=0.05):
    """Wilcoxon符号秩检验（配对数据的非参数检验）"""
    stat, p_value = stats.wilcoxon(after, before)
    return {
        'test': 'Wilcoxon符号秩检验',
        'statistic': stat,
        'p_value': p_value,
        'significant': p_value < alpha,
        'conclusion': f'W={stat:.1f}, p={p_value:.4f}',
    }


# ============================================================
# 4. Cohen's d 效应量 — 差异的实际意义（不仅统计显著）
# ============================================================
def cohens_d(group1, group2):
    """Cohen's d 效应量"""
    n1, n2 = len(group1), len(group2)
    s_pooled = np.sqrt(
        ((n1 - 1) * np.var(group1, ddof=1) + (n2 - 1) * np.var(group2, ddof=1))
        / (n1 + n2 - 2)
    )
    d = (np.mean(group1) - np.mean(group2)) / s_pooled
    interpretation = (
        '可忽略' if abs(d) < 0.2 else
        '小效应' if abs(d) < 0.5 else
        '中等效应' if abs(d) < 0.8 else
        '大效应'
    )
    return {'cohens_d': d, 'interpretation': interpretation}


# ============================================================
# 5. 正态性检验 — 判断是否满足t检验的前提
# ============================================================
def normality_test(data, alpha=0.05):
    """Shapiro-Wilk正态性检验"""
    stat, p_value = stats.shapiro(data)
    return {
        'test': 'Shapiro-Wilk正态性检验',
        'statistic': stat,
        'p_value': p_value,
        'is_normal': p_value >= alpha,
        'conclusion': f'W={stat:.4f}, p={p_value:.4f} — {"正态" if p_value >= alpha else "非正态"}',
    }


# ============================================================
# 6. 方差齐性检验
# ============================================================
def levene_test(group1, group2, alpha=0.05):
    """Levene方差齐性检验"""
    stat, p_value = stats.levene(group1, group2)
    return {
        'test': 'Levene方差齐性检验',
        'statistic': stat,
        'p_value': p_value,
        'equal_var': p_value >= alpha,
        'conclusion': f'F={stat:.4f}, p={p_value:.4f}',
    }


# ============================================================
# 论文报告模板
# ============================================================
def paper_report(results_dict):
    """
    生成论文中可直接使用的统计报告文本

    results_dict: {指标名: {'method_A': [数据], 'method_B': [数据]}}
    """
    for metric, data in results_dict.items():
        a, b = np.array(data['method_A']), np.array(data['method_B'])

        # 正态性
        norm = normality_test(a - b)
        # 选择合适的检验
        if norm['is_normal']:
            test = paired_ttest(a, b)
        else:
            test = wilcoxon_test(a, b)
        # 效应量
        d = cohens_d(a, b)

        print(f'\n=== {metric} ===')
        print(f'方法A: {np.mean(a):.4f} ± {np.std(a):.4f}')
        print(f'方法B: {np.mean(b):.4f} ± {np.std(b):.4f}')
        print(f'改进: {(np.mean(a) - np.mean(b)) / abs(np.mean(b)) * 100:+.2f}%')
        print(f'{test["conclusion"]}')
        print(f'效应量: d={d["cohens_d"]:.3f} ({d["interpretation"]})')


# ============================================================
# 示例
# ============================================================
if __name__ == '__main__':
    np.random.seed(42)
    # 模拟30次实验的RMSE数据
    results = {
        'RMSE': {
            'method_A': np.random.normal(0.85, 0.05, 30),  # 本文方法
            'method_B': np.random.normal(1.02, 0.08, 30),  # 基线方法
        }
    }
    paper_report(results)
