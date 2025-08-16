const API_URL = 'http://localhost:3000/api';
let currentUser = null;
let currentTestRun = null;
let testCasesForRun = [];

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('appLoader').style.display = 'none'; // Hide the loader

    // Event Listeners
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('themeSwitch').addEventListener('change', toggleTheme);
    document.getElementById('themeSwitchNav').addEventListener('change', toggleTheme);
    document.getElementById('sidebarToggler').addEventListener('click', () => document.getElementById('sideNavbar').classList.toggle('show'));

    document.querySelector('.execution').addEventListener('click', () => showDashboard('execution'));
    document.querySelector('.audit').addEventListener('click', () => showDashboard('audit'));
    document.querySelector('.status').addEventListener('click', () => showDashboard('status'));
});

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-bs-theme');
    document.documentElement.setAttribute('data-bs-theme', currentTheme === 'dark' ? 'light' : 'dark');
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('mainMenu').style.display = 'block';
            document.querySelector('#mainMenu h2').textContent = `Welcome, ${currentUser.username}`;
            // Based on role, you can customize the main menu view if needed
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Login failed:', error);
        alert('Login failed. Please try again.');
    }
}

function logout() {
    currentUser = null;
    document.getElementById('loginScreen').style.display = 'block';
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('executionDashboard').style.display = 'none';
    document.getElementById('auditDashboard').style.display = 'none';
    document.getElementById('projectStatusDashboard').style.display = 'none';
}

function showDashboard(type) {
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('executionDashboard').style.display = 'none';
    document.getElementById('auditDashboard').style.display = 'none';
    document.getElementById('projectStatusDashboard').style.display = 'none';

    const dashboardId = `${type}Dashboard`;
    document.getElementById(dashboardId).style.display = 'block';

    // Load data for the specific dashboard
    if (type === 'execution') loadExecutionDashboard();
    if (type === 'audit') loadAuditDashboard();
    if (type === 'status') loadStatusDashboard();
}

// --- Execution Dashboard ---
async function loadExecutionDashboard() {
    if (!currentUser) return;
    try {
        const response = await fetch(`${API_URL}/test-runs/user/${currentUser.id}`);
        const tasks = await response.json();

        const inProgressList = document.querySelector('#inprogress .task-list');
        const pendingList = document.querySelector('#pending .task-list');
        const completedList = document.querySelector('#completed .task-list');

        inProgressList.innerHTML = '';
        pendingList.innerHTML = '';
        completedList.innerHTML = '';

        tasks.forEach(task => {
            const taskItem = `
                <div class="task-item">
                    <h6>${task.device_name} - ${task.suite_name} Testing</h6>
                    <div class="task-meta">
                        <span><i class="fas fa-layer-group"></i> Project: ${task.project_name}</span>
                        <span><i class="fas fa-code-branch"></i> Build: ${task.build}</span>
                    </div>
                    <div class="d-flex justify-content-end mt-3">
                        <button class="btn btn-sm btn-amazon" onclick="startExecution(${task.id})">
                            <i class="fas fa-play me-1"></i>
                            ${task.status === 'Pending' ? 'Start' : 'Continue'}
                        </button>
                    </div>
                </div>`;
            if (task.status === 'In Progress') inProgressList.innerHTML += taskItem;
            else if (task.status === 'Pending') pendingList.innerHTML += taskItem;
            else if (task.status === 'Completed') completedList.innerHTML += taskItem;
        });
    } catch (error) {
        console.error('Failed to load tasks:', error);
    }
}

async function startExecution(runId) {
    try {
        const response = await fetch(`${API_URL}/test-runs/${runId}/test-cases`);
        testCasesForRun = await response.json();
        currentTestRun = { id: runId }; // Simplified for now

        // Populate test cases list
        const testCaseListDiv = document.querySelector('#executionActiveTab .test-cases-list');
        testCaseListDiv.innerHTML = '';
        testCasesForRun.forEach((tc, index) => {
            testCaseListDiv.innerHTML += `
                <div class="test-case-item ${index === 0 ? 'active' : ''}" onclick="toggleTestCase(this)">
                    <div class="test-case-header">
                        <div>
                            <h6>${tc.name}</h6>
                            <span class="text-muted small">${tc.n_points} N-Points</span>
                        </div>
                        <div><i class="fas fa-chevron-down ms-2"></i></div>
                    </div>
                    <div class="test-case-body">
                        <div class="test-step"><h6>Steps:</h6><p>${tc.steps.replace(/\\n/g, '<br>')}</p></div>
                    </div>
                </div>`;
        });

        showExecutionTab('active');
    } catch (error) {
        console.error('Failed to start execution:', error);
    }
}

// --- Audit Dashboard ---
async function loadAuditDashboard() {
    try {
        const summaryRes = await fetch(`${API_URL}/reports/summary`);
        const summary = await summaryRes.json();
        document.querySelector('#auditDashboardTab .stat-card-value').textContent = summary.totalRuns; // Example update

        const reportsRes = await fetch(`${API_URL}/test-runs`);
        const reports = await reportsRes.json();
        const reportTableBody = document.querySelector('#auditDashboardTab tbody');
        reportTableBody.innerHTML = '';
        reports.slice(0, 4).forEach(report => {
            reportTableBody.innerHTML += `
                <tr>
                    <td>${report.project_name} - ${report.suite_name} - ${report.device_name}</td>
                    <td>${report.project_name}</td>
                    <td>${new Date(report.created_at).toLocaleDateString()}</td>
                    <td><span class="badge bg-success">${report.status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" title="View"><i class="fas fa-eye"></i></button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Failed to load audit dashboard:', error);
    }
}

// --- Project Status Dashboard ---
async function loadStatusDashboard() {
    try {
        const statusRes = await fetch(`${API_URL}/projects/status`);
        const statuses = await statusRes.json();

        const projectProgressDiv = document.querySelector('#projectStatusDashboard .card-body');
        projectProgressDiv.innerHTML = ''; // Clear existing
        statuses.forEach(proj => {
            projectProgressDiv.innerHTML += `
                <div class="mb-4">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="mb-0">${proj.name}</h6>
                        <span class="badge bg-success">On Track</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="text-muted small">Progress</span>
                        <span class="text-muted small">${proj.progress.toFixed(0)}%</span>
                    </div>
                    <div class="progress">
                        <div class="progress-bar bg-success" role="progressbar" style="width: ${proj.progress}%"></div>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Failed to load project status:', error);
    }
}


function showExecutionTab(tab) {
    document.getElementById('executionDashboardTab').style.display = 'none';
    document.getElementById('executionNewTab').style.display = 'none';
    document.getElementById('executionActiveTab').style.display = 'none';
    document.getElementById('executionHistoryTab').style.display = 'none';

    document.getElementById('execution' + tab.charAt(0).toUpperCase() + tab.slice(1) + 'Tab').style.display = 'block';
}

function toggleTestCase(elem) {
    const item = elem.closest('.test-case-item');
    item.classList.toggle('active');
    const icon = item.querySelector('.fa-chevron-right, .fa-chevron-down');
    if (item.classList.contains('active')) {
        icon?.classList.replace('fa-chevron-right', 'fa-chevron-down');
    } else {
        icon?.classList.replace('fa-chevron-down', 'fa-chevron-right');
    }
}

// Other functions (stopwatch, etc.) would need to be updated to post results to the backend
// This is a simplified integration to show the concept. A full integration would be more involved.
