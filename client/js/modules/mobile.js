/**
 * 移动端功能模块
 * 包含：移动端日期显示、日期切换、日期头点击事件绑定
 */
import { getWeekDates, formatDate } from './date.js';

export function createMobileModule(ctx) {
    const { getCurrentMonday, weekDisplay } = ctx;

    // 移动端显示今日日期
    function showTodayOnMobile() {
        const today = new Date();
        const todayStr = formatDate(today);
        const weekDates = getWeekDates(getCurrentMonday());
        const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

        // 找到今日对应的列
        const todayIndex = weekDates.findIndex(date => formatDate(date) === todayStr);
        if (todayIndex !== -1) {
            switchToDayOnMobile(weekdays[todayIndex], todayIndex);
        }
    }

    // 移动端切换到指定日期
    function switchToDayOnMobile(dayId, dayIndex) {
        const dayColumns = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayHeaders = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header', 'saturday-header', 'sunday-header'];

        // 隐藏所有列，显示选中的列
        dayColumns.forEach((colId, index) => {
            const column = document.getElementById(colId);
            if (index === dayIndex) {
                column.style.display = 'block';
                column.classList.add('active-day');
            } else {
                column.style.display = 'none';
                column.classList.remove('active-day');
            }
        });

        // 更新标题选中状态
        dayHeaders.forEach((headerId, index) => {
            const header = document.getElementById(headerId);
            if (index === dayIndex) {
                header.classList.add('active');
            } else {
                header.classList.remove('active');
            }
        });

        // 更新周显示
        const weekDates = getWeekDates(getCurrentMonday());
        const selectedDate = weekDates[dayIndex];
        const month = selectedDate.getMonth() + 1;
        const day = selectedDate.getDate();
        const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        weekDisplay.textContent = `${weekdays[dayIndex]} ${month}月${day}日`;
    }

    // 移动端日期切换功能
    function setupMobileDateSwitch() {
        const dayHeaders = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header', 'saturday-header', 'sunday-header'];
        const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

        dayHeaders.forEach((headerId, index) => {
            const header = document.getElementById(headerId);

            // 添加点击事件
            header.addEventListener('click', () => {
                // 检查是否为移动端
                if (window.innerWidth <= 768 || 'ontouchstart' in window) {
                    switchToDayOnMobile(weekdays[index], index);
                }
            });

            // 添加切换提示的指针样式
            header.style.cursor = 'pointer';
        });
    }

    // 移动端左右滑动切周 — 已移至 mobileGestures.js 统一管理，避免重复绑定
    function setupSwipeGesture() {
        // no-op: swipe gestures handled by mobileGestures.js
    }

    return { showTodayOnMobile, switchToDayOnMobile, setupMobileDateSwitch, setupSwipeGesture };
}
