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

        // 목표 기한 설정
        this.goalStartDate = new Date(2026, 0, 1); // 2026.01.01
        this.goalEndDate = new Date(2029, 11, 31); // 2029.12.31

        this.init();
    }

    async init() {
        await this.loadData();
        this.updateProgress();
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

    updateProgress() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Calculate total period in days
        const totalMs = this.goalEndDate.getTime() - this.goalStartDate.getTime();
        const totalDays = Math.ceil(totalMs / (1000 * 60 * 60 * 24));

        // Calculate elapsed days
        const elapsedMs = today.getTime() - this.goalStartDate.getTime();
        const elapsedDays = Math.max(0, Math.ceil(elapsedMs / (1000 * 60 * 60 * 24)));

        // Calculate remaining days
        const remainingMs = this.goalEndDate.getTime() - today.getTime();
        const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

        // Calculate percentage
        const percentage = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

        // Update UI
        document.getElementById('elapsedDays').textContent = elapsedDays.toLocaleString();
        document.getElementById('remainingDays').textContent = remainingDays.toLocaleString();
        document.getElementById('totalPeriod').textContent = totalDays.toLocaleString() + '일';
        document.getElementById('daysRemaining').textContent = remainingDays.toLocaleString() + '일 남음';

        // Update progress bar
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        progressBar.style.width = `${Math.max(percentage, 5)}%`;
        progressText.textContent = `${percentage.toFixed(1)}%`;

        // Update date displays
        document.getElementById('startDate').textContent = this.formatDisplayDate(this.goalStartDate);
        document.getElementById('endDate').textContent = this.formatDisplayDate(this.goalEndDate);

        // Update rocket phase based on progress
        this.updateRocketPhase(percentage);
    }

    updateRocketPhase(percentage) {
        // Phase thresholds (5 phases)
        // Phase 1: 0-20% - 발사대 건설
        // Phase 2: 20-40% - 로켓 조립
        // Phase 3: 40-60% - 연료 주입
        // Phase 4: 60-80% - 카운트다운
        // Phase 5: 80-100% - 발사!

        let phase = 1;
        if (percentage >= 80) phase = 5;
        else if (percentage >= 60) phase = 4;
        else if (percentage >= 40) phase = 3;
        else if (percentage >= 20) phase = 2;

        const phaseNames = [
            'Phase 1: 발사대 건설',
            'Phase 2: 로켓 조립',
            'Phase 3: 연료 주입',
            'Phase 4: 카운트다운',
            'Phase 5: 발사! 🔥'
        ];

        // Update phase text
        const phaseLabel = document.getElementById('rocketPhase');
        if (phaseLabel) {
            phaseLabel.textContent = phaseNames[phase - 1];
        }

        // Update phase indicators
        const phaseItems = document.querySelectorAll('.phase-item');
        const phaseLines = document.querySelectorAll('.phase-line');

        phaseItems.forEach((item, index) => {
            item.classList.remove('active', 'completed');
            if (index + 1 < phase) {
                item.classList.add('completed');
            } else if (index + 1 === phase) {
                item.classList.add('active');
            }
        });

        phaseLines.forEach((line, index) => {
            line.classList.remove('completed');
            if (index + 1 < phase) {
                line.classList.add('completed');
            }
        });

        // Update rocket visuals
        const launchPad = document.getElementById('launchPad');
        const launchTower = document.getElementById('launchTower');
        const rocket = document.getElementById('rocket');
        const rocketFlame = document.getElementById('rocketFlame');
        const smokeCloud = document.getElementById('smokeCloud');
        const towerArm = document.querySelector('.tower-arm');

        if (!launchPad) return;

        // Phase 1: Show launch pad
        if (phase >= 1) {
            launchPad.classList.add('visible');
        }

        // Phase 2: Show tower and rocket
        if (phase >= 2) {
            launchTower.classList.add('visible');
            rocket.classList.add('visible');
        }

        // Phase 3: Keep rocket visible (fueling animation could be added)

        // Phase 4: Retract tower arm
        if (phase >= 4 && towerArm) {
            towerArm.classList.add('retracted');
        }

        // Phase 5: Launch!
        if (phase >= 5) {
            rocketFlame.classList.add('active');
            smokeCloud.classList.add('active');
            rocket.classList.add('launching');
        }
    }

    formatDisplayDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}.${month}.${day}`;
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
