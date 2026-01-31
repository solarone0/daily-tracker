/**
 * Daily Tracker App
 * GitHub-style heatmap with GitHub API storage
 */

class DailyTracker {
    constructor() {
        this.currentYear = new Date().getFullYear();
        this.selectedDate = null;
        this.data = {};
        this.startYear = 2026;
        this.selectedLevel = 3;
        this.githubToken = localStorage.getItem(CONFIG.GITHUB_TOKEN_KEY) || '';

        // 목표 기한 설정
        this.goalStartDate = new Date(2026, 0, 1);
        this.goalEndDate = new Date(2029, 11, 31);

        this.init();
    }

    async init() {
        await this.loadData();
        this.updateProgress();
        this.renderHeatmap();
        this.updateStats();
        this.bindEvents();
        this.initEntryForm();
        this.initSettings();
    }

    async loadData() {
        // Try to load from GitHub if token exists
        if (this.githubToken) {
            const githubData = await this.fetchFromGithub();
            if (githubData) {
                this.data = githubData;
                this.saveToLocalStorage();
                return;
            }
        }

        // Try to load from localStorage
        const localData = this.loadFromLocalStorage();
        if (localData && Object.keys(localData).length > 0) {
            this.data = localData;
            return;
        }

        // Fall back to static JSON file (initial load)
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

    async fetchFromGithub() {
        const { OWNER, REPO, FILE_PATH, BRANCH } = CONFIG.GITHUB;
        const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`;

        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Cache-Control': 'no-cache'
                }
            });

            if (response.ok) {
                const result = await response.json();
                const content = decodeURIComponent(atob(result.content).split('').map(c => {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                return JSON.parse(content);
            }
        } catch (error) {
            console.error('GitHub fetch failed:', error);
        }
        return null;
    }

    async saveToGithub(entryData) {
        const { OWNER, REPO, FILE_PATH, BRANCH } = CONFIG.GITHUB;
        const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;

        try {
            // 1. Get current file for SHA
            const getResponse = await fetch(`${url}?ref=${BRANCH}`, {
                headers: {
                    'Authorization': `Bearer ${this.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Cache-Control': 'no-cache'
                }
            });

            let sha = '';
            let currentContent = {};

            if (getResponse.ok) {
                const result = await getResponse.json();
                sha = result.sha;
                const decoded = decodeURIComponent(atob(result.content).split('').map(c => {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                currentContent = JSON.parse(decoded);
            }

            // 2. Update content
            currentContent[entryData.date] = {
                title: entryData.title,
                level: entryData.level,
                content: entryData.content
            };

            const updatedContentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(currentContent, null, 2))));

            // 3. Push update
            const putResponse = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `update: tracker entry for ${entryData.date}`,
                    content: updatedContentBase64,
                    sha: sha,
                    branch: BRANCH
                })
            });

            if (putResponse.ok) {
                this.data = currentContent;
                this.saveToLocalStorage();
                return true;
            }
            return false;
        } catch (error) {
            console.error('GitHub save failed:', error);
            return false;
        }
    }

    loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem(CONFIG.LOCAL_STORAGE_KEY);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            return null;
        }
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem(CONFIG.LOCAL_STORAGE_KEY, JSON.stringify(this.data));
        } catch (error) {
            console.log('Failed to save to localStorage');
        }
    }

    renderHeatmap() {
        const grid = document.getElementById('heatmapGrid');
        const monthLabels = document.getElementById('monthLabels');
        if (!grid || !monthLabels) return;

        grid.innerHTML = '';
        monthLabels.innerHTML = '';

        const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
        months.forEach(month => {
            const span = document.createElement('span');
            span.textContent = month;
            monthLabels.appendChild(span);
        });

        const yearStart = new Date(this.currentYear, 0, 1);
        const yearEnd = new Date(this.currentYear, 11, 31);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startDate = new Date(yearStart);
        startDate.setDate(startDate.getDate() - startDate.getDay());

        let currentDate = new Date(startDate);

        while (currentDate <= yearEnd || currentDate.getDay() !== 0) {
            const dateStr = this.formatDate(currentDate);
            const dayData = this.data[dateStr] || { level: 0 };
            const isFuture = currentDate > today;
            const isCurrentYear = currentDate.getFullYear() === this.currentYear;

            const cell = document.createElement('div');
            cell.className = `heatmap-cell level-${dayData.level}`;

            if (isFuture) cell.classList.add('future');
            if (!isCurrentYear) cell.style.visibility = 'hidden';

            cell.dataset.date = dateStr;
            cell.dataset.tooltip = this.formatTooltip(currentDate, dayData);

            grid.appendChild(cell);
            currentDate.setDate(currentDate.getDate() + 1);
        }

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
            year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
        });
        return data.level > 0 ? `${dateStr}: ${data.title || '기록 있음'}` : `${dateStr}: 기록 없음`;
    }

    updateProgress() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const totalMs = this.goalEndDate.getTime() - this.goalStartDate.getTime();
        const totalDays = Math.ceil(totalMs / (1000 * 60 * 60 * 24));
        const elapsedMs = today.getTime() - this.goalStartDate.getTime();
        const elapsedDays = Math.max(0, Math.ceil(elapsedMs / (1000 * 60 * 60 * 24)));
        const remainingMs = this.goalEndDate.getTime() - today.getTime();
        const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
        const percentage = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

        document.getElementById('elapsedDays').textContent = elapsedDays.toLocaleString();
        document.getElementById('remainingDays').textContent = remainingDays.toLocaleString();
        document.getElementById('totalPeriod').textContent = totalDays.toLocaleString() + '일';
        document.getElementById('daysRemaining').textContent = remainingDays.toLocaleString() + '일 남음';

        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const progressDays = document.getElementById('progressDays');

        if (progressBar) progressBar.style.width = `${Math.max(percentage, 12)}%`;
        if (progressText) progressText.textContent = `${percentage.toFixed(1)}%`;
        if (progressDays) progressDays.textContent = elapsedDays.toLocaleString();

        document.getElementById('startDate').textContent = this.formatDisplayDate(this.goalStartDate);
        document.getElementById('endDate').textContent = this.formatDisplayDate(this.goalEndDate);
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

        const totalDays = entries.filter(([_, v]) => v.level > 0).length;
        document.getElementById('totalDays').textContent = totalDays;

        let streak = 0;
        let checkDate = new Date(today);
        checkDate.setHours(0, 0, 0, 0);
        while (true) {
            const dateStr = this.formatDate(checkDate);
            if (this.data[dateStr] && this.data[dateStr].level > 0) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else { break; }
        }
        document.getElementById('currentStreak').textContent = streak;

        const thisMonth = entries.filter(([date, v]) => {
            const d = new Date(date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear && v.level > 0;
        }).length;
        document.getElementById('thisMonth').textContent = thisMonth;
    }

    bindEvents() {
        document.getElementById('heatmapGrid')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('heatmap-cell') && !e.target.classList.contains('future')) {
                const dateStr = e.target.dataset.date;
                this.selectDate(dateStr);
                this.entryDate = dateStr;
                const datePicker = document.getElementById('entryDatePicker');
                if (datePicker) datePicker.value = dateStr;
                this.loadEntryForDate(dateStr);
                this.updateFormTitle(dateStr);
                document.getElementById('entryPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });

        document.getElementById('prevYear')?.addEventListener('click', () => {
            if (this.currentYear > this.startYear) { this.currentYear--; this.renderHeatmap(); }
        });

        document.getElementById('nextYear')?.addEventListener('click', () => {
            if (this.currentYear < new Date().getFullYear()) { this.currentYear++; this.renderHeatmap(); }
        });

        document.getElementById('syncBtn')?.addEventListener('click', () => this.forceSync());
    }

    async forceSync() {
        const syncBtn = document.getElementById('syncBtn');
        if (!syncBtn) return;

        const originalText = syncBtn.textContent;
        syncBtn.textContent = '⏳ 동기화 중...';
        syncBtn.disabled = true;

        if (!this.githubToken) {
            this.showStatus('error', 'GitHub 토큰이 설정되지 않았습니다.');
            syncBtn.textContent = '❌ 토큰 필요';
            setTimeout(() => { syncBtn.textContent = originalText; syncBtn.disabled = false; }, 2000);
            return;
        }

        try {
            const githubData = await this.fetchFromGithub();
            if (githubData) {
                this.data = githubData;
                this.saveToLocalStorage();
                this.renderHeatmap();
                this.updateStats();
                syncBtn.textContent = '✅ 완료!';
            } else {
                syncBtn.textContent = '❌ 실패';
            }
        } catch (error) {
            syncBtn.textContent = '❌ 오류';
        }

        setTimeout(() => { syncBtn.textContent = originalText; syncBtn.disabled = false; }, 2000);
    }

    initSettings() {
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsModal = document.getElementById('settingsModal');
        const closeSettingsBtn = document.getElementById('closeSettingsBtn');
        const saveSettingsBtn = document.getElementById('saveSettingsBtn');
        const clearTokenBtn = document.getElementById('clearTokenBtn');
        const tokenInput = document.getElementById('githubToken');

        settingsBtn?.addEventListener('click', () => {
            tokenInput.value = this.githubToken;
            settingsModal.classList.add('show');
        });

        closeSettingsBtn?.addEventListener('click', () => {
            settingsModal.classList.remove('show');
        });

        saveSettingsBtn?.addEventListener('click', () => {
            const token = tokenInput.value.trim();
            if (token) {
                this.githubToken = token;
                localStorage.setItem(CONFIG.GITHUB_TOKEN_KEY, token);
                settingsModal.classList.remove('show');
                this.forceSync();
            }
        });

        clearTokenBtn?.addEventListener('click', () => {
            if (confirm('토큰을 삭제하시겠습니까?')) {
                this.githubToken = '';
                localStorage.removeItem(CONFIG.GITHUB_TOKEN_KEY);
                tokenInput.value = '';
            }
        });
    }

    initEntryForm() {
        const today = new Date();
        const todayStr = this.formatDate(today);
        this.entryDate = todayStr;

        const datePicker = document.getElementById('entryDatePicker');
        if (datePicker) {
            datePicker.value = todayStr;
            datePicker.max = todayStr;
            datePicker.addEventListener('change', (e) => {
                this.entryDate = e.target.value;
                this.loadEntryForDate(e.target.value);
                this.updateFormTitle(e.target.value);
            });
        }

        document.getElementById('todayBtn')?.addEventListener('click', () => {
            const nowStr = this.formatDate(new Date());
            this.entryDate = nowStr;
            if (datePicker) datePicker.value = nowStr;
            this.loadEntryForDate(nowStr);
            this.updateFormTitle(nowStr);
        });

        document.getElementById('levelSelector')?.addEventListener('click', (e) => {
            const btn = e.target.closest('.level-btn');
            if (btn) {
                document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedLevel = parseInt(btn.dataset.level);
            }
        });

        const entryContent = document.getElementById('entryContent');
        const previewBtn = document.getElementById('previewBtn');
        const entryPreview = document.getElementById('entryPreview');
        const previewContent = document.getElementById('previewContent');

        previewBtn?.addEventListener('click', () => {
            previewContent.innerHTML = marked.parse(entryContent.value || '내용이 없습니다.');
            entryPreview.style.display = 'block';
        });

        document.getElementById('closePreviewBtn')?.addEventListener('click', () => {
            entryPreview.style.display = 'none';
        });

        document.getElementById('entryForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveEntry();
        });

        this.loadEntryForDate(todayStr);
    }

    updateFormTitle(dateStr) {
        const formTitle = document.getElementById('entryFormTitle');
        if (!formTitle) return;
        if (dateStr === this.formatDate(new Date())) {
            formTitle.textContent = '📝 오늘의 기록';
        } else {
            const date = new Date(dateStr);
            formTitle.textContent = `📝 ${date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 기록`;
        }
    }

    loadEntryForDate(dateStr) {
        const titleInput = document.getElementById('entryTitle');
        const contentInput = document.getElementById('entryContent');
        if (titleInput) titleInput.value = '';
        if (contentInput) contentInput.value = '';
        this.selectedLevel = 3;
        document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('[data-level="3"]')?.classList.add('active');

        if (this.data[dateStr]) {
            const d = this.data[dateStr];
            if (titleInput) titleInput.value = d.title || '';
            if (contentInput) contentInput.value = d.content || '';
            if (d.level) {
                this.selectedLevel = d.level;
                document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
                document.querySelector(`[data-level="${d.level}"]`)?.classList.add('active');
            }
        }
    }

    async saveEntry() {
        const title = document.getElementById('entryTitle').value.trim();
        const content = document.getElementById('entryContent').value;
        const level = this.selectedLevel;
        const dateStr = this.entryDate;
        const saveBtn = document.getElementById('saveBtn');

        if (!title) { this.showStatus('error', '제목을 입력해주세요.'); return; }
        if (!this.githubToken) {
            this.showStatus('error', '설정(⚙️)에서 GitHub 토큰을 먼저 등록해주세요.');
            document.getElementById('settingsModal').classList.add('show');
            return;
        }

        this.showStatus('loading', 'GitHub에 저장 중...');
        saveBtn.disabled = true;

        const success = await this.saveToGithub({ date: dateStr, title, level, content });

        if (success) {
            this.renderHeatmap();
            this.updateStats();
            this.showStatus('success', '✅ GitHub에 성공적으로 저장되었습니다!');
        } else {
            this.showStatus('error', '❌ 저장 실패. 토큰 권한이나 네트워크를 확인하세요.');
        }
        saveBtn.disabled = false;
    }

    showStatus(type, message) {
        const formStatus = document.getElementById('formStatus');
        if (!formStatus) return;
        formStatus.className = 'form-status ' + type;
        formStatus.textContent = message;
        formStatus.style.display = 'block';
        if (type === 'success') setTimeout(() => { formStatus.style.display = 'none'; }, 3000);
    }

    async selectDate(dateStr) {
        document.querySelectorAll('.heatmap-cell.selected').forEach(cell => cell.classList.remove('selected'));
        const cell = document.querySelector(`[data-date="${dateStr}"]`);
        if (cell) cell.classList.add('selected');

        this.selectedDate = dateStr;
        const data = this.data[dateStr] || { level: 0 };

        const date = new Date(dateStr);
        document.getElementById('detailDate').textContent = date.toLocaleDateString('ko-KR', {
            year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
        });

        const badge = document.getElementById('detailLevel');
        const levelLabels = ['기록 없음', '조금', '보통', '많이', '최고'];
        badge.textContent = levelLabels[data.level];
        badge.className = `detail-badge show`;
        badge.style.background = `var(--level-${data.level})`;
        badge.style.color = data.level < 3 ? 'var(--text-primary)' : 'var(--bg-primary)';

        const content = document.getElementById('detailContent');
        if (data.level === 0) {
            content.innerHTML = `<p class="placeholder-text">이 날의 기록이 없습니다.</p>`;
        } else {
            content.innerHTML = marked.parse(data.content || `### ${data.title}\n상세 내용이 없습니다.`);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => { new DailyTracker(); });
