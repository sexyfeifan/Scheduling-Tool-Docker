#!/usr/bin/env python3
"""Reorganize CSS files into target structure - v2 with better parsing."""
import os, re

CSS_DIR = '/opt/Scheduling-Tool-Docker/client/css'

# Read all source CSS files
source_files = ['base.css', 'layout.css', 'components.css', 'schedule.css',
                'modal.css', 'extra_components.css', 'animations.css', 'theme.css', 'mobile.css']

files_content = {}
for f in source_files:
    path = os.path.join(CSS_DIR, f)
    if os.path.exists(path):
        with open(path, 'r') as fh:
            files_content[f] = fh.read()

total_lines_before = sum(len(c.split('\n')) for c in files_content.values())
total_braces_before = sum(c.count('{') for c in files_content.values())
print(f"Before: {total_lines_before} lines, {total_braces_before} braces")

def split_into_sections(text):
    """Split CSS text into sections. Each section = comment block + rule block."""
    sections = []
    lines = text.split('\n')
    i = 0
    n = len(lines)
    
    while i < n:
        line = lines[i]
        stripped = line.strip()
        
        # Skip pure blank lines
        if not stripped:
            i += 1
            continue
        
        # Collect comment block (may span multiple lines)
        if stripped.startswith('/*'):
            comment_lines = []
            while i < n:
                comment_lines.append(lines[i])
                if '*/' in lines[i]:
                    i += 1
                    break
                i += 1
            comment = '\n'.join(comment_lines)
            
            # After comment, skip blanks and collect the rule
            while i < n and not lines[i].strip():
                i += 1
            
            if i < n:
                rule_lines = []
                line = lines[i]
                
                # Check if it's an @-rule without braces (like @import)
                if line.strip().startswith('@import') or line.strip().startswith('@charset'):
                    rule_lines.append(lines[i])
                    i += 1
                    sections.append(('\n'.join(rule_lines), comment))
                    continue
                
                # Collect rule with braces
                brace_count = 0
                started = False
                while i < n:
                    rule_lines.append(lines[i])
                    brace_count += lines[i].count('{') - lines[i].count('}')
                    if '{' in lines[i]:
                        started = True
                    i += 1
                    if started and brace_count <= 0:
                        break
                
                sections.append(('\n'.join(rule_lines), comment))
            else:
                # Comment at end of file with no following rule
                sections.append(('', comment))
            continue
        
        # Non-comment line (could be a rule or @-rule)
        if stripped.startswith('@import') or stripped.startswith('@charset'):
            sections.append((lines[i], ''))
            i += 1
            continue
        
        # Regular rule or @-rule with braces
        rule_lines = []
        brace_count = 0
        started = False
        while i < n:
            rule_lines.append(lines[i])
            brace_count += lines[i].count('{') - lines[i].count('}')
            if '{' in lines[i]:
                started = True
            i += 1
            if started and brace_count <= 0:
                break
        
        sections.append(('\n'.join(rule_lines), ''))
    
    return sections

def section_has_selector(rule_text, patterns):
    for p in patterns:
        if p in rule_text:
            return True
    return False

# Classify sections from each source file
target = {
    'base': [], 'layout': [], 'components': [], 'schedule': [],
    'modal': [], 'overlays': [], 'panels': [], 'animations': [],
    'theme': [], 'mobile': []
}

for fname, content in files_content.items():
    sections = split_into_sections(content)
    
    for rule, comment in sections:
        # Skip @import rules
        if rule.strip().startswith('@import'):
            continue
        
        combined = (comment + '\n' + rule) if comment else rule
        
        # Files that stay in their original location
        if fname == 'base.css':
            target['base'].append((comment, rule))
            continue
        if fname == 'layout.css':
            target['layout'].append((comment, rule))
            continue
        if fname == 'schedule.css':
            target['schedule'].append((comment, rule))
            continue
        if fname == 'animations.css':
            target['animations'].append((comment, rule))
            continue
        if fname == 'theme.css':
            target['theme'].append((comment, rule))
            continue
        if fname == 'mobile.css':
            target['mobile'].append((comment, rule))
            continue
        
        # === Classification for components.css, modal.css, extra_components.css ===
        
        # PANELS patterns
        panels_pats = [
            '.history-modal-content', '.history-filters', '.history-table',
            '.history-action-', '.history-diff',
            '.notice-modal-content', '.notice-header-info', '.notice-body',
            '.notice-project-row', '.notice-index', '.notice-project-info',
            '.notice-project-name', '.notice-project-meta', '.notice-day-btn',
            '.sort-day-btn',
            '.admin-modal-content', '.admin-tabs', '.admin-tab-btn',
            '.admin-tab-panel', '#admin-unlocked-content',
            '.heatmap-modal-content', '.heatmap-tabs', '.heatmap-tab-btn',
            '#heatmap-content', '.heatmap-section', '.heatmap-person-list',
            '.heatmap-day-list', '.heatmap-bar-row', '.heatmap-bar-label',
            '.heatmap-bar-track', '.heatmap-bar-fill', '.heatmap-bar-count',
            '.heatmap-empty', '.heatmap-chart', '.heatmap-chart-inner',
            '.heatmap-chart-labels', '.heatmap-label-cell', '.heatmap-chart-grid',
            '.heatmap-chart-week', '.heatmap-cell', '.heatmap-bar-top',
            '.heatmap-label', '.heatmap-legend',
            '.backup-locked', '.backup-unlocked',
            '.history-panel', '.history-toggle',
            '@media print',
        ]
        
        # OVERLAYS patterns
        overlays_pats = [
            '#toast-container', '.toast', '.loading-overlay',
            '.loading-spinner', '.loading-text',
            '.skeleton',
        ]
        
        # MODAL additions (from extra_components)
        modal_add_pats = [
            '.days', '.day,', '.day ', '.day{', '.day:hover', '.day.selected',
            '.day.other-month', '.day.today',
            '.selected-date-info',
            '.settings-section', '.backup-list', '.backup-item',
            '.template-list', '.template-item',
            '.share-link-display', '.share-link-text', '.copy-share-link',
            '.backup-preview-body', '.backup-preview-table', '.backup-preview-warning',
            '.checkbox-group', '.tag-btn', '.checkbox-empty',
            '.role-category-', '.copy-date-options', '.copy-week-label',
            '.copy-date-option',
            '.webhook-settings', '.webhook-template',
            '.export-modal', '.export-options', '.export-date-range',
            '.form-actions', '.admin-actions',
            '.selected-date-info',
        ]
        
        is_dark = section_has_selector(combined, ['[data-theme="dark"]'])
        is_panel = section_has_selector(combined, panels_pats)
        is_overlay = section_has_selector(combined, overlays_pats)
        is_keyframe = '@keyframes' in rule
        is_print = '@media print' in combined
        is_modal_add = section_has_selector(combined, modal_add_pats)
        
        # Component-level selectors that stay in components.css
        component_pats = ['.add-btn', 'today-highlight', '.date-input-container']
        
        if fname == 'components.css':
            if is_dark:
                target['theme'].append((comment, rule))
            elif is_panel or is_print:
                target['panels'].append((comment, rule))
            elif is_overlay:
                target['overlays'].append((comment, rule))
            else:
                target['components'].append((comment, rule))
        
        elif fname == 'modal.css':
            if is_keyframe:
                target['animations'].append((comment, rule))
            elif is_panel or is_print:
                target['panels'].append((comment, rule))
            elif is_overlay:
                target['overlays'].append((comment, rule))
            else:
                target['modal'].append((comment, rule))
        
        elif fname == 'extra_components.css':
            if is_keyframe:
                target['animations'].append((comment, rule))
            elif is_dark:
                target['theme'].append((comment, rule))
            elif is_panel or is_print:
                target['panels'].append((comment, rule))
            elif is_overlay:
                target['overlays'].append((comment, rule))
            elif is_modal_add:
                target['modal'].append((comment, rule))
            elif section_has_selector(combined, component_pats):
                target['components'].append((comment, rule))
            else:
                target['modal'].append((comment, rule))

# Write output files
def write_target(name, header):
    blocks = target[name]
    content = header + '\n\n'
    for comment, rule in blocks:
        if comment:
            content += comment + '\n'
        if rule:
            content += rule + '\n\n'
    
    filepath = os.path.join(CSS_DIR, f'{name}.css')
    with open(filepath, 'w') as f:
        f.write(content.rstrip() + '\n')
    
    lines = len(content.split('\n'))
    braces = content.count('{')
    return lines, braces

headers = {
    'base': '/* ========================================\n * base.css — CSS 变量、全局重置、基础样式\n * 罐头场通告排期系统 v2.59\n * ======================================== */',
    'layout': '/* ========================================\n * layout.css — 头部、导航栏、工具栏布局\n * 罐头场通告排期系统 v2.59\n * ======================================== */',
    'components': '/* ========================================\n * components.css — 按钮、主内容区、星期标题、排期网格\n * 罐头场通告排期系统 v2.59\n * ======================================== */',
    'schedule': '/* ========================================\n * schedule.css — 项目卡片、人员标签、类型标签、操作按钮\n * 罐头场通告排期系统 v2.59\n * ======================================== */',
    'modal': '/* ========================================\n * modal.css — 模态框、表单、日期选择器、设置、备份、模板、标签\n * 罐头场通告排期系统 v2.59\n * ======================================== */',
    'overlays': '/* ========================================\n * overlays.css — Toast、Loading、骨架屏覆盖层\n * 罐头场通告排期系统 v2.59\n * ======================================== */',
    'panels': '/* ========================================\n * panels.css — 通告、管理、历史、热力图面板及备份状态\n * 罐头场通告排期系统 v2.59\n * ======================================== */',
    'animations': '/* ========================================\n * animations.css — 所有动画关键帧\n * 罐头场通告排期系统 v2.59\n * ======================================== */',
    'theme': '/* ========================================\n * theme.css — 暗色模式主题\n * 罐头场通告排期系统 v2.59\n * ======================================== */',
    'mobile': '/* ========================================\n * mobile.css — 响应式媒体查询\n * 罐头场通告排期系统 v2.59\n * ======================================== */',
}

results = {}
total_lines = 0
total_braces = 0
for name in ['base', 'layout', 'components', 'schedule', 'modal', 'overlays', 'panels', 'animations', 'theme', 'mobile']:
    lines, braces = write_target(name, headers[name])
    results[name] = (lines, braces)
    total_lines += lines
    total_braces += braces

# Write style.css
style_content = """/* ========================================
 * 罐头场通告排期 — 样式入口
 * 版本: v2.59
 *
 * 所有样式模块通过 @import 引入
 * 注意：@import 必须在文件最前面
 * ======================================== */

@import url('base.css');
@import url('layout.css');
@import url('components.css');
@import url('schedule.css');
@import url('modal.css');
@import url('overlays.css');
@import url('panels.css');
@import url('animations.css');
@import url('theme.css');
@import url('mobile.css');
"""
with open(os.path.join(CSS_DIR, 'style.css'), 'w') as f:
    f.write(style_content)
results['style'] = (17, 0)
total_lines += 17

# Delete extra_components.css
extra_path = os.path.join(CSS_DIR, 'extra_components.css')
if os.path.exists(extra_path):
    os.remove(extra_path)
    print(f"Deleted: extra_components.css")

# Print results
print(f"\n{'File':<20} {'Lines':>6} {'Braces':>7}")
print('-' * 35)
for name in ['style', 'base', 'layout', 'components', 'schedule', 'modal', 'overlays', 'panels', 'animations', 'theme', 'mobile']:
    l, b = results[name]
    print(f"{name+'.css':<20} {l:>6} {b:>7}")
print('-' * 35)
print(f"{'TOTAL':<20} {total_lines:>6} {total_braces:>7}")
print(f"\nBefore: {total_lines_before} lines, {total_braces_before} braces")
print(f"Diff:   {total_lines - total_lines_before:+} lines, {total_braces - total_braces_before:+} braces")
