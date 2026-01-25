/**
 * Daily Tracker App
 * GitHub-style heatmap with markdown-based daily records
 */

class DailyTracker {
    constructor() {
        this.currentYear = new Date().getFullYear();
        this.selectedDate = null;
        this.data = {};
        this.startYear = 2026;
        
        this.init();
    }

    async init() {
        await this.loadData();
        this.renderHeatmap();
        this.updateStats();
        this.bindEvents();
    }

    async loadData() {
        try {
            const response = await fetch('data/index.json');
            if (response.ok) {
                this.data = await response.json();
            }
        } catch (error) {
            console.log('No data file found, using empty data');
            this.data = {};
        }
    }

    renderHeatmap() {
        const grid = document.getElementById('heatmapGrid');
        const monthLabels = document.getElementById('monthLabels');
        grid.innerHTML = '';
        monthLabels.innerHTML = '';

        // Month labels
        const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
        months.forEach(month => {
            const span = document.createElement('span');
            span.textContent = month;
            monthLabels.appendChild(span);
        });

        // Get first day of year
        const yearStart = new Date(this.currentYear, 0, 1);
        const yearEnd = new Date(this.currentYear, 11, 31);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Adjust to start from first Sunday before or on Jan 1
        const startDate = new Date(yearStart);
        startDate.setDate(startDate.getDate() - startDate.getDay());

        // Generate cells for entire year (53 weeks max)
        let currentDate = new Date(startDate);
        
        while (currentDate <= yearEnd || currentDate.getDay() !== 0) {
            const dateStr = this.formatDate(currentDate);
            const dayData = this.data[dateStr] || { level: 0 };
            const isFuture = currentDate > today;
            const isCurrentYear = currentDate.getFullYear() === this.currentYear;

            const cell = document.createElement('div');
            cell.className = `heatmap-cell level-${dayData.level}`;
            
            if (isFuture) {
                cell.classList.add('future');
            }
            
            if (!isCurrentYear) {
                cell.style.visibility = 'hidden';
            }
            
            cell.dataset.date = dateStr;
            cell.dataset.tooltip = this.formatTooltip(currentDate, dayData);
            
            grid.appendChild(cell);
            
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Update year display
        document.getElementById('currentYear').textContent = this.currentYear;
    }

    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    formatTooltip(date, data) {
        const dateStr = date.toLocaleDateString('ko-KR', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'short'
        });
        
        if (data.level > 0) {
            return `${dateStr}: ${data.title || '기록 있음'}`;
        }
        return `${dateStr}: 기록 없음`;
    }

    updateStats() {
        const entries = Object.entries(this.data);
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        // Total days with records
        const totalDays = entries.filter(([_, v]) => v.level > 0).length;
        document.getElementById('totalDays').textContent = totalDays;

        // Current streak
        let streak = 0;
        let checkDate = new Date(today);
        checkDate.setHours(0, 0, 0, 0);
        
        while (true) {
            const dateStr = this.formatDate(checkDate);
            if (this.data[dateStr] && this.data[dateStr].level > 0) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
        document.getElementById('currentStreak').textContent = streak;

        // This month's records
        const thisMonth = entries.filter(([date, v]) => {
            const d = new Date(date);
            return d.getMonth() === currentMonth && 
                   d.getFullYear() === currentYear && 
                   v.level > 0;
        }).length;
        document.getElementById('thisMonth').textContent = thisMonth;
    }

    bindEvents() {
        // Heatmap cell clicks
        document.getElementById('heatmapGrid').addEventListener('click', (e) => {
            if (e.target.classList.contains('heatmap-cell') && 
                !e.target.classList.contains('future')) {
                this.selectDate(e.target.dataset.date);
            }
        });

        // Year navigation
        document.getElementById('prevYear').addEventListener('click', () => {
            if (this.currentYear > this.startYear) {
                this.currentYear--;
                this.renderHeatmap();
            }
        });

        document.getElementById('nextYear').addEventListener('click', () => {
            if (this.currentYear < new Date().getFullYear()) {
                this.currentYear++;
                this.renderHeatmap();
            }
        });
    }

    async selectDate(dateStr) {
        // Update selection
        document.querySelectorAll('.heatmap-cell.selected').forEach(cell => {
            cell.classList.remove('selected');
        });
        
        const cell = document.querySelector(`[data-date="${dateStr}"]`);
        if (cell) {
            cell.classList.add('selected');
        }

        this.selectedDate = dateStr;
        const data = this.data[dateStr] || { level: 0 };

        // Update header
        const date = new Date(dateStr);
        const dateDisplay = date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
        document.getElementById('detailDate').textContent = dateDisplay;

        // Update badge
        const badge = document.getElementById('detailLevel');
        const levelLabels = ['기록 없음', '조금', '보통', '많이', '최고'];
        badge.textContent = levelLabels[data.level];
        badge.className = `detail-badge show`;
        badge.style.background = `var(--level-${data.level})`;
        if (data.level === 0) {
            badge.style.color = 'var(--text-muted)';
            badge.style.border = '1px solid var(--border-color)';
        } else {
            badge.style.color = data.level < 3 ? 'var(--text-primary)' : 'var(--bg-primary)';
            badge.style.border = 'none';
        }

        // Load markdown content
        await this.loadDayContent(dateStr, data);
    }

    async loadDayContent(dateStr, data) {
        const content = document.getElementById('detailContent');
        
        if (data.level === 0) {
            content.innerHTML = `
                <p class="placeholder-text">
                    이 날의 기록이 없습니다.<br>
                    <code>data/${dateStr}.md</code> 파일을 추가하세요.
                </p>
            `;
            return;
        }

        content.innerHTML = '<div class="loading">로딩 중...</div>';

        try {
            const response = await fetch(`data/${dateStr}.md`);
            if (!response.ok) throw new Error('File not found');
            
            let markdown = await response.text();
            
            // Remove frontmatter
            markdown = markdown.replace(/^---[\s\S]*?---\n*/, '');
            
            // Parse markdown
            content.innerHTML = marked.parse(markdown);
        } catch (error) {
            content.innerHTML = `
                <p class="placeholder-text">
                    기록 파일을 불러올 수 없습니다.<br>
                    <code>data/${dateStr}.md</code> 파일을 확인하세요.
                </p>
            `;
        }
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    new DailyTracker();
});
