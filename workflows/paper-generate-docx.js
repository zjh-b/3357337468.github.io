export const meta = {
  name: 'paper-generate-docx',
  description: 'DOCX论文生成v2：从LaTeX生成Word文档——基于月球项目实战经验重构，零残留符号+正确标题摘要+公式上下标+图片嵌入+参考文献',
  phases: [
    { title: '解析LaTeX', detail: '解析论文结构和内容' },
    { title: '生成DOCX脚本', detail: '生成v2质量DOCX转换脚本' },
    { title: '运行脚本', detail: '执行脚本生成DOCX' },
    { title: '质量验证', detail: '检查残留符号/字体颜色/标题摘要完整性' },
  ],
}

// DOCX论文生成工作流 v2
// 基于月球轨迹项目实战经验完全重构
//
// v2 关键改进（来自实战debug）：
//   1. clean_latex_text() 15步清理管道 → 0残留符号
//   2. 标题提取：多策略匹配（heiti+zihao+textbf → 最长textbf → 通用title）
//   3. 摘要提取：搜索 \songti\zihao{4} 正文起点，不再依赖字符偏移
//   4. 公式渲染：subscript/superscript + Greek字母映射 + LaTeX符号→Unicode
//   5. 强制黑色：每个run显式设置 font.color.rgb = RGBColor(0,0,0)
//   6. 三线表 + 图片嵌入 + 参考文献悬挂缩进
//
// 输入: args = { texFile: "论文.tex", outputDir: ".", figuresDir: "figures/" }
// 输出: 格式规范的Word文档 + 质量验证报告

const config = args || {}
const texFile = config.texFile || '论文.tex'
const outputDir = config.outputDir || '.'
const figuresDir = config.figuresDir || 'figures/'

phase('解析LaTeX')
log(`正在解析 ${texFile}...`)

const latexStructure = await agent(
  `请读取LaTeX论文文件"${texFile}"，提取结构信息：

1. **章节结构**：所有 \\section 和 \\subsection 标题
2. **图表清单**：所有 \\includegraphics 路径和 \\caption
3. **表格清单**：所有 table 环境及数据
4. **公式清单**：所有 equation/align 环境
5. **参考文献**：所有 \\bibitem 条目
6. **标题格式**：标题的LaTeX标记方式（如 {\\heiti\\zihao{3}\\textbf{...}}）
7. **摘要格式**：摘要正文的LaTeX标记方式（如 {\\songti\\zihao{4}...}）

请按顺序列出，保留原始LaTeX代码。`,
  { label: '解析LaTeX', phase: '解析LaTeX' }
)

phase('生成DOCX脚本')
log('正在生成v2质量DOCX转换脚本...')

const docxScript = await agent(
  `请生成完整的Python DOCX转换脚本。要求基于以下v2架构，**严格实现所有函数**。

## 目标文件
- LaTeX论文: ${texFile}
- 图片目录: ${figuresDir}
- 输出: ${outputDir}/论文.docx

## LaTeX结构
${latexStructure}

## v2 核心架构（必须严格实现）

### 1. clean_latex_text(text) — 15步清理管道（最关键！）

\`\`\`python
def clean_latex_text(text):
    """15步清理：注释→环境标签→引用→带参命令→无参命令→表格标签→
       表格格式→特殊字符→符号→$标记→下标上标→孤立括号→残留命令"""
    # 步骤1-15 按照以下顺序执行：
    # 1. 移除LaTeX注释（%开头的行）
    # 2. 移除 \\begin{...} 和 \\end{...} 标签
    # 3. 移除 \\label{...}, \\ref{...}, \\cite{...}, \\bibitem{...}
    # 4. 处理带参数命令（保留内容）：\\textbf,\\textit,\\emph,\\texttt,\\text,\\mathbf,\\mathrm,\\boldsymbol
    # 5. 处理 \\section,\\subsection,\\caption 等（保留内容）
    # 6. 移除无参数命令：\\newpage,\\centering,\\small,\\large,\\noindent,\\par 等50+个
    # 7. 移除表格环境标签 {tabular}{...}, {table}{...}, {figure}{...}
    # 8. 移除表格格式：\\toprule,\\midrule,\\bottomrule,\\hline,\\multicolumn
    # 9. 转换特殊字符：\\%→%, \\&→&, \\#→#, \\_→_, \\{→{, \\}→}
    # 10. 转换LaTeX符号→Unicode：\\cdot→·, \\times→×, \\approx→≈, \\leq→≤ 等30+个
    # 11. 转换Greek字母：\\alpha→α, \\beta→β, \\pi→π 等50+个
    # 12. 移除行内数学模式 $...$ → 保留内容、移除$标记
    # 13. 处理下标上标：_{text}→text, ^{text}→text（正文中不渲染，但移除标记）
    # 14. 多次清理孤立的 { } 括号
    # 15. 移除残留的 \\command 形式命令
    # 16. 清理多余空白
\`\`\`

### 2. render_math(paragraph, expr, base_size) — 公式渲染

\`\`\`python
def render_math(paragraph, expr, base_size=Pt(12)):
    """逐字符扫描，处理 _ 下标(创建subscript run)、^ 上标(创建superscript run)、
       Greek字母、LaTeX符号。跳过 {} 和残留命令。"""
    # 关键：_ 后跟 {...} 时，花括号内的内容创建subscript run
    #       ^ 后跟 {...} 时，花括号内的内容创建superscript run
    #       Greek字母映射表（50+条目）
    #       LaTeX符号映射表（30+条目）
\`\`\`

### 3. 标题提取 — 多策略匹配

\`\`\`python
# 策略1：华中杯格式 {\\heiti\\zihao{3}\\textbf{标题}}
# 策略2：通用 \\textbf{标题}
# 策略3：最长 \\textbf 作为标题
# 策略4：\\title{标题}
title_patterns = [
    r'\{\\heiti\\zihao\{3\}\\textbf\{([^}]+)\}\}',
    r'\\textbf\{([^}]+)\}',
    r'\\title\{([^}]+)\}',
]
\`\`\`

### 4. 摘要提取 — 搜索正文起点标记

\`\`\`python
# 策略1：搜索 \\songti\\zihao{4} 之后的正文（最可靠）
# 策略2：搜索"摘 要"标签，然后跳过LaTeX命令直到正文开始
# 提取后：清理所有LaTeX标记 → 合并空白 → 截取500字
\`\`\`

### 5. 关键词提取 — 清理括号和命令

\`\`\`python
# 搜索 r'关键词[：:]' 后的内容
# 移除所有 {} 括号
# 移除 \\textbf, \\noindent 等命令
# 合并空白
\`\`\`

### 6. add_black_run() — 强制黑色

\`\`\`python
def add_black_run(paragraph, text, bold=False, italic=False,
                   size=None, font_name=None, subscript=False, superscript=False):
    """每个run必须显式设置 font.color.rgb = RGBColor(0,0,0)"""
    run = paragraph.add_run(text)
    run.font.color.rgb = RGBColor(0, 0, 0)  # 强制黑色！
    # ...
\`\`\`

### 7. 图片嵌入

\`\`\`python
def add_figure(doc, image_path, caption, width_inches=5.5):
    """嵌入PNG图片 + 图标题。图片不存在时插入占位符而非崩溃"""
    full_path = os.path.join(FIGURES_DIR, image_path)
    if os.path.exists(full_path):
        run.add_picture(full_path, width=Inches(width_inches))
    else:
        add_black_run(p, f'[图表缺失: {image_path}]', italic=True, size=Pt(10))
\`\`\`

### 8. 参考文献

\`\`\`python
def add_reference(doc, ref_text):
    """悬挂缩进：first_line_indent=-0.74cm, left_indent=0.74cm"""
\`\`\`

### 9. 页面设置
- A4纸
- 页边距：上下左右 2.54cm
- 默认字体：宋体12pt

### 10. 输出后验证（脚本必须包含）
\`\`\`python
# 运行结束后打印验证报告
print(f'总段落: {len(doc.paragraphs)}')
print(f'图片嵌入: {image_count}')
# 检查残留符号
artifacts = sum(p.text.count(c) for p in doc.paragraphs for c in ['{', '}', '\\\\', '\$'])
print(f'残留符号: {artifacts} (应为0)')
# 检查字体颜色
non_black = sum(1 for p in doc.paragraphs for r in p.runs
                if r.font.color and r.font.color.rgb and r.font.color.rgb != RGBColor(0,0,0))
print(f'非黑色run: {non_black} (应为0)')
\`\`\`

## 完整输出要求
请输出**完整可运行的Python脚本**。不要省略任何函数。保存到 ${outputDir}/generate_docx.py。
依赖：pip install python-docx`,
  { label: '生成DOCX转换脚本', phase: '生成DOCX脚本' }
)

phase('运行脚本')
log('正在执行DOCX生成脚本...')

const runResult = await agent(
  `请检查生成的DOCX脚本是否可以运行。分析脚本逻辑是否存在以下问题：

1. **标题提取**：是否正确匹配了论文的实际标题格式？
2. **摘要提取**：是否正确找到 \\songti\\zihao{4} 之后的正文？
3. **clean_latex_text**：是否包含了所有15个清理步骤？
4. **render_math**：是否正确处理了 _ 下标和 ^ 上标？
5. **字体颜色**：每个add_run是否都设置了 RGBColor(0,0,0)？
6. **图片路径**：是否使用 os.path.join 拼接了正确的图片目录？

## 执行建议
\`\`\`bash
cd ${outputDir}
pip install python-docx
python generate_docx.py
\`\`\`

如果脚本存在逻辑缺陷，请输出修复后的完整脚本。`,
  { label: '验证并修复脚本', phase: '运行脚本' }
)

phase('质量验证')
log('正在验证DOCX输出质量...')

const qualityReport = await agent(
  `请对生成的DOCX生成脚本进行质量检查，确保以下所有项通过：

## 质量检查清单（v2实战标准）

### A. 残留符号（必须为0）
- [ ] 正文中无孤立的 { 或 }
- [ ] 正文中无 $ 符号
- [ ] 正文中无 \\ 反斜杠
- [ ] 百分比符号正确（\\% → %）

### B. 标题与摘要（必须完整）
- [ ] 标题完整提取（非"论文标题"占位符）
- [ ] "摘  要"标签正确显示
- [ ] 摘要正文内容完整（非"==="或"提取失败"）
- [ ] 关键词无残留花括号 { }

### C. 字体颜色（必须100%黑色）
- [ ] 所有run显式设置 font.color.rgb = RGBColor(0,0,0)
- [ ] 标题黑色
- [ ] 正文黑色
- [ ] 关键词黑色

### D. 公式渲染
- [ ] 实现了 render_math() 函数
- [ ] _ 下标：_{text} → subscript run
- [ ] ^ 上标：^{text} → superscript run
- [ ] Greek字母映射表完整（≥50个条目）
- [ ] LaTeX符号映射表完整（≥30个条目）

### E. 图片嵌入
- [ ] 使用 run.add_picture() 嵌入PNG
- [ ] 图片路径与项目实际文件名匹配
- [ ] 图片缺失时有fallback占位符（不会崩溃）

### F. 参考文献
- [ ] 逐条独立渲染（非"参见原文"占位）
- [ ] 悬挂缩进格式
- [ ] 10pt字号

### G. 结构完整性
- [ ] 封面（标题）
- [ ] 摘要+关键词
- [ ] 全部章节标题
- [ ] 正文段落
- [ ] 参考文献
- [ ] 附录代码块（如有）

对每项输出 ✅ 或 ❌（附具体问题位置和修复方案）。`,
  { label: 'DOCX质量验证', phase: '质量验证' }
)

log('DOCX生成工作流v2完成！')
log('')
log('关键改进（来自月球项目实战）：')
log('  1. clean_latex_text() 15步清理管道 → 0残留符号')
log('  2. 标题多策略匹配 → 不再丢失')
log('  3. 摘要搜索正文起点标记 → 不再显示"==="')
log('  4. 每个run强制黑色 → 100%黑色字体')
log('  5. 图片/参考文献/公式完整渲染')

return {
  latexStructure,
  docxScript,
  runResult,
  qualityReport,
  lessons: {
    '残留符号': 'clean_latex_text() 15步管道，特别处理 _{text}→text 和 $...$→text',
    '标题丢失': '多策略匹配：heiti+zihao+textbf → 最长textbf',
    '摘要显示===': '搜索 \\songti\\zihao{4} 正文起点，而非字符偏移',
    '关键词残留}': '全局清理 [{}] 括号',
    '\%残留\\': '先转义 \\%→% 再清理注释行',
  },
}
