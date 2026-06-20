#!/usr/bin/env python3
"""Reorganize CSS files into target structure."""
import os, re

CSS_DIR = '/opt/Scheduling-Tool-Docker/client/css'

# Read all CSS files
source_files = ['base.css', 'layout.css', 'components.css', 'schedule.css', 
                'modal.css', 'extra_components.css', 'animations.css', 'theme.css', 'mobile.css']

files = {}
for f in source_files:
    path = os.path.join(CSS_DIR, f)
    if os.path.exists(path):
        with open(path, 'r') as fh:
            files[f] = fh.read()

total_before = sum(len(c.split('\n')) for c in files.values())
print(f"Total lines before: {total_before}")

def block_has_selector(body, patterns):
    for p in patterns:
        if p in body:
            return True
    return False

# Parse CSS into blocks
def parse_css_blocks(text):
    """Return list of (type, content, preceding_comment) tuples."""
    blocks = []
    i = 0
    n = len(text)
    pending_comment = ''
    
    while i < n:
        # Skip whitespace
        while i < n and text[i] in ' \t\n\r':
            i += 1
        if i >= n:
            break
        
        # Collect comment
        if text[i:i+2] == '/*':
            end = text.find('*/', i)
            if end == -1:
                pending_comment += text[i:]
                i = n
            else:
                pending_comment += text[i:end+2]
                i = end + 2
            continue
        
        if i >= n:
            break
        
        # @import or @charset (no braces)
        if text[i] == '@':
            # Check if it's @keyframes or @media (has braces) vs @import (no braces)
            keyword_match = re.match(r'@(import|charset|keyframes|media)', text[i:])
            if keyword_match:
                kw = keyword_match.group(1)
                if kw in ('import', 'charset'):
                    line_end = text.find('\n', i)
                    if line_end == -1:
                        line_end = n
                    content = text[i:line_end+1]
                    i = line_end + 1
                    blocks.append(('at-rule', content, pending_comment))
                    pending_comment = ''
                    continue
                # @keyframes or @media - find matching braces
                brace_pos = text.find('{', i)
                if brace_pos == -1:
                    rest = text[i:]
                    blocks.append(('text', rest, pending_comment))
                    i = n
                    pending_comment = ''
                    continue
                
                depth = 1
                j = brace_pos + 1
                while j < n and depth > 0:
                    if text[j] == '{': depth += 1
                    elif text[j] == '}': depth -= 1
                    j += 1
                
                content = text[i:j]
                i = j
                blocks.append(('rule', content, pending_comment))
                pending_comment = ''
                continue
        
        # Regular rule: selector { ... }
        brace_pos = text.find('{', i)
        if brace_pos == -1:
            rest = text[i:]
            if rest.strip():
                blocks.append(('text', rest, pending_comment))
            i = n
            pending_comment = ''
            break
        
        depth = 1
        j = brace_pos + 1
        while j < n and depth > 0:
            if text[j] == '{': depth += 1
            elif text[j] == '}': depth -= 1
            j += 1
        
        content = text[i:j]
        i = j
        blocks.append(('rule', content, pending_comment))
        pending_comment = ''
    
    return blocks

# Parse all files and classify
base_blocks = []
layout_blocks = []
components_blocks = []
schedule_blocks = []
modal_blocks = []
overlays_blocks = []
panels_blocks = []
animations_blocks = []
theme_blocks = []
mobile_blocks = []

for fname, content in files.items():
    blocks = parse_css_blocks(content)
    
    for btype, body, comment in blocks:
        if btype == 'at-rule' and ('@import' in body or '@charset' in body):
            continue  # Skip imports
        
        if fname == 'base.css':
            base_blocks.append((comment, body))
            continue
        if fname == 'layout.css':
            layout_blocks.append((comment, body))
            continue
        if fname == 'schedule.css':
            schedule_blocks.append((comment, body))
            continue
        if fname == 'animations.css':
            animations_blocks.append((comment, body))
            continue
        if fname == 'theme.css':
            theme_blocks.append((comment, body))
            continue
        if fname == 'mobile.css':
            mobile_blocks.append((comment, body))
            continue
        
        # --- Classify from components.css, modal.css, extra_components.css ---
        
        # PANELS selectors
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
            '.backup-locked', '.backup-unlocked',
            '.history-panel', '.history-toggle',
            '@media print',
        ]
        
        # OVERLAYS selectors
        overlays_pats = [
            '#toast-container', '.toast', '.loading-overlay',
            '.loading-spinner', '.loading-text',
            '.skeleton',
        ]
        
        # MODAL additions selectors
        modal_add_pats = [
            '.days ', '.day ', '.day,', '.day{', '.day:hover', '.day.selected',
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
        ]
        
        is_dark = block_has_selector(body, ['[data-theme="dark"]'])
        is_panel = block_has_selector(body, panels_pats)
        is_overlay = block_has_selector(body, overlays_pats)
        is_keyframe = '@keyframes' in body
        is_print = '@media print' in body
        is_modal_add = block_has_selector(body, modal_add_pats)
        
        if fname == 'components.css':
            if is_dark:
                theme_blocks.append((comment, body))
            elif is_panel or is_print:
                panels_blocks.append((comment, body))
            elif is_overlay:
                overlays_blocks.append((comment, body))
            else:
                components_blocks.append((comment, body))
        
        elif fname == 'modal.css':
            if is_keyframe:
                animations_blocks.append((comment, body))
            elif is_panel or is_print:
                panels_blocks.append((comment, body))
            elif is_overlay:
                overlays_blocks.append((comment, body))
            else:
                modal_blocks.append((comment, body))
        
        elif fname == 'extra_components.css':
            if is_keyframe:
                animations_blocks.append((comment, body))
            elif is_dark:
                theme_blocks.append((comment, body))
            elif is_panel or is_print:
                panels_blocks.append((comment, body))
            elif is_overlay:
                overlays_blocks.append((comment, body))
            elif is_modal_add:
                modal_blocks.append((comment, body))
            else:
                # Check if it's component-level (add-btn, today-highlight, date-input)
                if block_has_selector(body, ['.add-btn', 'today-highlight', '.date-input-container']):
                    components_blocks.append((comment, body))
                else:
                    # Default to modal for extra_components
                    modal_blocks.append((comment, body))

# Write helper
def write_css(filepath, blocks, header):
    content = header.rstrip() + '\n\n'
    for comment, body in blocks:
        if comment:
            content += comment
        content += body + '\n'
    with open(filepath, 'w') as f:
        f.write(content)
    return len(content.split('\n'))

# Write all target files
results = {}

results['base.css'] = write_css(os.path.join(CSS_DIR, 'base.css'), base_blocks,
    '/* ========================================\n'
    ' * base.css — CSS 变量、全局重置、基础样式\n'
    ' * 罐头场通告排期系统 v2.59\n'
    ' * ======================================== */')

results['layout.css'] = write_css(os.path.join(CSS_DIR, 'layout.css'), layout_blocks,
    '/* ========================================\n'
    ' * layout.css — 头部、导航栏、工具栏布局\n'
    ' * 罐头场通告排期系统 v2.59\n'
    ' * ======================================== */')

results['components.css'] = write_css(os.path.join(CSS_DIR, 'components.css'), components_blocks,
    '/* ========================================\n'
    ' * components.css — 按钮、主内容区、星期标题、排期网格\n'
    ' * 罐头场通告排期系统 v2.59\n'
    ' * ======================================== */')

results['schedule.css'] = write_css(os.path.join(CSS_DIR, 'schedule.css'), schedule_blocks,
    '/* ========================================\n'
    ' * schedule.css — 项目卡片、人员标签、类型标签、操作按钮\n'
    ' * 罐头场通告排期系统 v2.59\n'
    ' * ======================================== */')

results['modal.css'] = write_css(os.path.join(CSS_DIR, 'modal.css'), modal_blocks,
    '/* ========================================\n'
    ' * modal.css — 模态框、表单、日期选择器、设置、备份、模板、标签\n'
    ' * 罐头场通告排期系统 v2.59\n'
    ' * ======================================== */')

results['overlays.css'] = write_css(os.path.join(CSS_DIR, 'overlays.css'), overlays_blocks,
    '/* ========================================\n'
    ' * overlays.css — Toast、Loading、骨架屏覆盖层\n'
    ' * 罐头场通告排期系统 v2.59\n'
    ' * ======================================== */')

results['panels.css'] = write_css(os.path.join(CSS_DIR, 'panels.css'), panels_blocks,
    '/* ========================================\n'
    ' * panels.css — 通告、管理、历史、热力图面板及备份状态\n'
    ' * 罐头场通告排期系统 v2.59\n'
    ' * ======================================== */')

results['animations.css'] = write_css(os.path.join(CSS_DIR, 'animations.css'), animations_blocks,
    '/* ========================================\n'
    ' * animations.css — 所有动画关键帧\n'
    ' * 罐头场通告排期系统 v2.59\n'
    ' * ======================================== */')

results['theme.css'] = write_css(os.path.join(CSS_DIR, 'theme.css'), theme_blocks,
    '/* ========================================\n'
    ' * theme.css — 暗色模式主题\n'
    ' * 罐头场通告排期系统 v2.59\n'
    ' * ======================================== */')

results['mobile.css'] = write_css(os.path.join(CSS_DIR, 'mobile.css'), mobile_blocks,
    '/* ========================================\n'
    ' * mobile.css — 响应式媒体查询\n'
    ' * 罐头场通告排期系统 v2.59\n'
    ' * ======================================== */')

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
results['style.css'] = len(style_content.split('\n'))

# Delete extra_components.css
extra_path = os.path.join(CSS_DIR, 'extra_components.css')
if os.path.exists(extra_path):
    os.remove(extra_path)
    print(f"Deleted: extra_components.css")

# Print results
print(f"\n=== New file sizes ===")
total_after = 0
for f in ['style.css', 'base.css', 'layout.css', 'components.css', 'schedule.css', 
          'modal.css', 'overlays.css', 'panels.css', 'animations.css', 'theme.css', 'mobile.css']:
    print(f"  {results[f]:5} {f}")
    total_after += results[f]

print(f"\nTotal before: {total_before}")
print(f"Total after:  {total_after}")

# Verify no rules lost by counting { in all files
import glob
total_braces = 0
for f in glob.glob(os.path.join(CSS_DIR, '*.css')):
    with open(f) as fh:
        total_braces += fh.read().count('{')
print(f"Total '{{' in new files: {total_braces}")
