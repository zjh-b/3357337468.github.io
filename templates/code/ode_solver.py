# -*- coding: utf-8 -*-
"""
常微分方程(ODE)数值求解模板
适用场景：物理建模、动力学仿真、种群模型等
依赖：numpy, scipy, matplotlib
"""

import numpy as np
from scipy.integrate import solve_ivp
import matplotlib.pyplot as plt

# ============================================================
# 配置参数（按题目修改）
# ============================================================
T_SPAN = (0, 365.25)      # 时间区间 [起始, 结束]
Y0 = [0.0, 1.0]            # 初始条件
DT_MAX = 0.1               # 最大时间步长
METHOD = 'RK45'            # 求解方法: 'RK45', 'DOP853', 'Radau', 'BDF'

# ============================================================
# ODE 定义（按题目修改 dydt 函数）
# ============================================================
def ode_system(t, y, params):
    """
    ODE系统定义

    参数:
        t: float, 当前时间
        y: array, 状态变量 [y1, y2, ...]
        params: dict, 模型参数

    返回:
        dydt: array, 导数 [dy1/dt, dy2/dt, ...]
    """
    # 示例：阻尼谐振子 d²x/dt² + 2β·dx/dt + ω²x = 0
    x, v = y[0], y[1]
    beta = params.get('beta', 0.1)
    omega = params.get('omega', 2 * np.pi)

    dxdt = v
    dvdt = -2 * beta * v - omega**2 * x

    return [dxdt, dvdt]


# ============================================================
# 求解
# ============================================================
def solve(params=None):
    """求解ODE并返回结果"""
    if params is None:
        params = {}

    sol = solve_ivp(
        lambda t, y: ode_system(t, y, params),
        t_span=T_SPAN,
        y0=Y0,
        method=METHOD,
        max_step=DT_MAX,
        rtol=1e-8,
        atol=1e-10
    )

    if not sol.success:
        raise RuntimeError(f'ODE求解失败: {sol.message}')

    return sol


# ============================================================
# 结果分析
# ============================================================
def analyze(sol):
    """输出关键统计量"""
    print(f'求解状态: {"成功" if sol.success else "失败"}')
    print(f'时间点数: {len(sol.t)}')
    print(f'函数评估次数: {sol.nfev}')
    print(f'X范围: [{sol.y[0].min():.4f}, {sol.y[0].max():.4f}]')


# ============================================================
# 可视化
# ============================================================
def plot(sol, save_path='ode_result.png'):
    """绘制相图和时序图"""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

    # 时序图
    ax1.plot(sol.t, sol.y[0], 'b-', label='x(t)')
    ax1.plot(sol.t, sol.y[1], 'r--', label='v(t)')
    ax1.set_xlabel('t')
    ax1.set_ylabel('状态')
    ax1.legend()
    ax1.set_title('时序图')
    ax1.grid(True, alpha=0.3)

    # 相图
    ax2.plot(sol.y[0], sol.y[1], 'k-', alpha=0.7)
    ax2.set_xlabel('x')
    ax2.set_ylabel('v')
    ax2.set_title('相图')
    ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f'图表已保存: {save_path}')


# ============================================================
# 主函数
# ============================================================
if __name__ == '__main__':
    params = {'beta': 0.05, 'omega': 2 * np.pi / 27.3}
    sol = solve(params)
    analyze(sol)
    plot(sol)
