const STORAGE_KEY = "taskDashboard.tasks.v1";
const ORG_STORAGE_KEY = "taskDashboard.organization.v1";
const SETTINGS_KEY = "taskDashboard.settings.v1";
const ALERT_SENT_KEY = "taskDashboard.alerts.sent.v1";
const ALERT_CHECK_INTERVAL_MS = 60 * 1000;

const STATUS_LABELS = {
    todo: "未着手",
    doing: "進行中",
    done: "完了",
};

const PRIORITY_LABELS = {
    high: "高",
    medium: "中",
    low: "低",
};

const IMPORTANCE_LABELS = {
    s: "S",
    a: "A",
    b: "B",
    c: "C",
};

const PRIORITY_WEIGHT = {
    high: 3,
    medium: 2,
    low: 1,
};

const IMPORTANCE_WEIGHT = {
    s: 4,
    a: 3,
    b: 2,
    c: 1,
};

const STATUS_WEIGHT = {
    todo: 1,
    doing: 2,
    done: 3,
};

const state = {
    tasks: [],
    organization: {
        teams: [],
        members: [],
    },
    activeDetailTaskId: null,
    settings: {
        alertsEnabled: false,
    },
    alertSentMap: {},
    alertTimerId: null,
    filters: {
        search: "",
        status: "all",
        priority: "all",
        importance: "all",
        sortBy: "created_desc",
    },
};

const elements = {
    teamForm: document.getElementById("team-form"),
    teamNameInput: document.getElementById("team-name-input"),
    teamList: document.getElementById("team-list"),
    memberForm: document.getElementById("member-form"),
    memberNameInput: document.getElementById("member-name-input"),
    memberTeamSelect: document.getElementById("member-team-select"),
    memberList: document.getElementById("member-list"),
    quickTaskForm: document.getElementById("quick-task-form"),
    quickTaskTitle: document.getElementById("quick-task-title"),
    quickTaskDueDate: document.getElementById("quick-task-due-date"),
    quickTaskTeam: document.getElementById("quick-task-team"),
    quickTaskMember: document.getElementById("quick-task-member"),
    quickChecklistContainer: document.getElementById("quick-checklist-container"),
    quickAddCheckItemButton: document.getElementById("quick-add-check-item-btn"),
    taskForm: document.getElementById("task-form"),
    taskId: document.getElementById("task-id"),
    taskTitle: document.getElementById("task-title"),
    taskDescription: document.getElementById("task-description"),
    taskDueDate: document.getElementById("task-due-date"),
    taskPriority: document.getElementById("task-priority"),
    taskStatus: document.getElementById("task-status"),
    taskImportance: document.getElementById("task-importance"),
    taskCategory: document.getElementById("task-category"),
    saveButton: document.getElementById("save-task-btn"),
    resetButton: document.getElementById("reset-form-btn"),
    searchInput: document.getElementById("search-input"),
    filterStatus: document.getElementById("filter-status"),
    filterPriority: document.getElementById("filter-priority"),
    filterImportance: document.getElementById("filter-importance"),
    sortBy: document.getElementById("sort-by"),
    taskList: document.getElementById("task-list"),
    emptyState: document.getElementById("empty-state"),
    taskCountText: document.getElementById("task-count-text"),
    metricTotal: document.getElementById("metric-total"),
    metricDoing: document.getElementById("metric-doing"),
    metricDone: document.getElementById("metric-done"),
    metricOverdue: document.getElementById("metric-overdue"),
    completionText: document.getElementById("completion-text"),
    completionBar: document.getElementById("completion-bar"),
    priorityBreakdown: document.getElementById("priority-breakdown"),
    importanceBreakdown: document.getElementById("importance-breakdown"),
    todayLabel: document.getElementById("today-label"),
    alertEnabled: document.getElementById("alert-enabled"),
    notificationPermissionButton: document.getElementById("notification-permission-btn"),
    alertPermissionText: document.getElementById("alert-permission-text"),
    alertList: document.getElementById("alert-list"),
    detailModal: document.getElementById("task-detail-modal"),
    detailModalTitle: document.getElementById("detail-modal-title"),
    detailModalSummary: document.getElementById("detail-modal-summary"),
    detailModalCloseButton: document.getElementById("detail-modal-close-btn"),
    detailNoteForm: document.getElementById("detail-note-form"),
    detailNoteInput: document.getElementById("detail-note-input"),
    detailNoteList: document.getElementById("detail-note-list"),
    bossQuestionForm: document.getElementById("boss-question-form"),
    bossQuestionInput: document.getElementById("boss-question-input"),
    bossQuestionList: document.getElementById("boss-question-list"),
};

function boot() {
    state.tasks = loadTasks();
    state.organization = loadOrganization();
    state.settings = loadSettings();
    state.alertSentMap = loadAlertSentMap();
    renderTodayLabel();
    attachEventListeners();
    renderOrganizationSection();
    ensureQuickChecklistRows();
    syncAlertControls();
    scheduleAlertCheck();
    resetForm();
    render();
}

function loadTasks() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.map((task) => ({
            ...task,
            importance: isValidImportance(task.importance) ? task.importance : "b",
            detailNotes: Array.isArray(task.detailNotes) ? task.detailNotes : [],
            bossQuestions: Array.isArray(task.bossQuestions) ? task.bossQuestions : [],
            checklist: normalizeChecklist(task.checklist),
            teamId: typeof task.teamId === "string" ? task.teamId : "",
            memberId: typeof task.memberId === "string" ? task.memberId : "",
        }));
    } catch (_error) {
        return [];
    }
}

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function loadOrganization() {
    const defaults = {
        teams: [],
        members: [],
    };
    try {
        const raw = localStorage.getItem(ORG_STORAGE_KEY);
        if (!raw) return defaults;
        const parsed = JSON.parse(raw);
        const teams = Array.isArray(parsed?.teams) ? parsed.teams : [];
        const members = Array.isArray(parsed?.members) ? parsed.members : [];
        return {
            teams: teams
                .filter((team) => team && typeof team.id === "string" && typeof team.name === "string")
                .map((team) => ({
                    id: team.id,
                    name: team.name,
                    createdAt: team.createdAt || Date.now(),
                })),
            members: members
                .filter((member) => member && typeof member.id === "string" && typeof member.name === "string")
                .map((member) => ({
                    id: member.id,
                    name: member.name,
                    teamId: typeof member.teamId === "string" ? member.teamId : "",
                    createdAt: member.createdAt || Date.now(),
                })),
        };
    } catch (_error) {
        return defaults;
    }
}

function saveOrganization() {
    localStorage.setItem(ORG_STORAGE_KEY, JSON.stringify(state.organization));
}

function loadSettings() {
    const defaults = { alertsEnabled: false };
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) return defaults;
        const parsed = JSON.parse(raw);
        return {
            ...defaults,
            ...parsed,
        };
    } catch (_error) {
        return defaults;
    }
}

function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

function loadAlertSentMap() {
    try {
        const raw = localStorage.getItem(ALERT_SENT_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_error) {
        return {};
    }
}

function saveAlertSentMap() {
    localStorage.setItem(ALERT_SENT_KEY, JSON.stringify(state.alertSentMap));
}

function attachEventListeners() {
    elements.teamForm.addEventListener("submit", handleTeamSubmit);
    elements.memberForm.addEventListener("submit", handleMemberSubmit);
    elements.teamList.addEventListener("click", handleTeamListClick);
    elements.memberList.addEventListener("click", handleMemberListClick);
    elements.quickTaskForm.addEventListener("submit", handleQuickTaskSubmit);
    elements.quickAddCheckItemButton.addEventListener("click", () => addQuickChecklistRow());
    elements.quickChecklistContainer.addEventListener("click", handleQuickChecklistClick);
    elements.quickTaskTeam.addEventListener("change", () => {
        renderQuickMemberSelect(elements.quickTaskTeam.value, "");
    });

    elements.taskForm.addEventListener("submit", handleSubmitTask);
    elements.resetButton.addEventListener("click", resetForm);

    elements.searchInput.addEventListener("input", (event) => {
        state.filters.search = event.target.value.trim().toLowerCase();
        renderTaskList();
    });

    elements.filterStatus.addEventListener("change", (event) => {
        state.filters.status = event.target.value;
        renderTaskList();
    });

    elements.filterPriority.addEventListener("change", (event) => {
        state.filters.priority = event.target.value;
        renderTaskList();
    });

    elements.filterImportance.addEventListener("change", (event) => {
        state.filters.importance = event.target.value;
        renderTaskList();
    });

    elements.sortBy.addEventListener("change", (event) => {
        state.filters.sortBy = event.target.value;
        renderTaskList();
    });

    elements.taskList.addEventListener("click", handleTaskListClick);

    elements.alertEnabled.addEventListener("change", (event) => {
        state.settings.alertsEnabled = event.target.checked;
        saveSettings();
        renderAlertPermissionText();
        runAlertCheck();
    });

    elements.notificationPermissionButton.addEventListener("click", requestNotificationPermission);
    elements.detailModalCloseButton.addEventListener("click", closeDetailModal);
    elements.detailModal.addEventListener("click", (event) => {
        if (event.target === elements.detailModal) {
            closeDetailModal();
        }
    });
    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !elements.detailModal.classList.contains("hidden")) {
            closeDetailModal();
        }
    });
    elements.detailNoteForm.addEventListener("submit", handleDetailNoteSubmit);
    elements.bossQuestionForm.addEventListener("submit", handleBossQuestionSubmit);
    elements.bossQuestionList.addEventListener("click", handleBossQuestionListClick);
}

function handleTeamSubmit(event) {
    event.preventDefault();
    const name = elements.teamNameInput.value.trim();
    if (!name) {
        elements.teamNameInput.focus();
        return;
    }
    const duplicate = state.organization.teams.some((team) => team.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
        window.alert("同じチーム名がすでに存在します。");
        return;
    }
    state.organization.teams.push({
        id: generateId("team"),
        name,
        createdAt: Date.now(),
    });
    saveOrganization();
    elements.teamNameInput.value = "";
    renderOrganizationSection();
    renderTaskList();
}

function handleMemberSubmit(event) {
    event.preventDefault();
    const name = elements.memberNameInput.value.trim();
    const teamId = elements.memberTeamSelect.value;
    if (!name) {
        elements.memberNameInput.focus();
        return;
    }
    if (!teamId) {
        window.alert("先にチームを登録してください。");
        return;
    }
    state.organization.members.push({
        id: generateId("member"),
        name,
        teamId,
        createdAt: Date.now(),
    });
    saveOrganization();
    elements.memberNameInput.value = "";
    renderOrganizationSection();
    renderTaskList();
}

function handleTeamListClick(event) {
    if (event.target.dataset.action !== "delete-team") return;
    const teamId = event.target.dataset.teamId;
    if (!teamId) return;

    state.organization.teams = state.organization.teams.filter((team) => team.id !== teamId);
    state.organization.members = state.organization.members.filter((member) => member.teamId !== teamId);
    state.tasks = state.tasks.map((task) => ({
        ...task,
        teamId: task.teamId === teamId ? "" : task.teamId,
        memberId: state.organization.members.some((member) => member.id === task.memberId) ? task.memberId : "",
    }));
    saveOrganization();
    saveTasks();
    renderOrganizationSection();
    render();
}

function handleMemberListClick(event) {
    if (event.target.dataset.action !== "delete-member") return;
    const memberId = event.target.dataset.memberId;
    if (!memberId) return;

    state.organization.members = state.organization.members.filter((member) => member.id !== memberId);
    state.tasks = state.tasks.map((task) => ({
        ...task,
        memberId: task.memberId === memberId ? "" : task.memberId,
    }));
    saveOrganization();
    saveTasks();
    renderOrganizationSection();
    render();
}

function renderOrganizationSection() {
    const teams = state.organization.teams.slice().sort((a, b) => a.name.localeCompare(b.name, "ja"));
    elements.teamList.innerHTML = teams.length
        ? teams
              .map(
                  (team) => `
            <li class="compact-item">
                <span>${escapeHtml(team.name)}</span>
                <button type="button" data-action="delete-team" data-team-id="${escapeHtml(team.id)}">削除</button>
            </li>
        `
              )
              .join("")
        : '<li class="compact-item"><span>チームが未登録です</span></li>';

    const members = state.organization.members.slice().sort((a, b) => a.name.localeCompare(b.name, "ja"));
    elements.memberList.innerHTML = members.length
        ? members
              .map((member) => {
                  const teamName = getTeamName(member.teamId) || "未所属";
                  return `
                    <li class="compact-item">
                        <span>${escapeHtml(member.name)} <span class="muted">(${escapeHtml(teamName)})</span></span>
                        <button type="button" data-action="delete-member" data-member-id="${escapeHtml(member.id)}">削除</button>
                    </li>
                `;
              })
              .join("")
        : '<li class="compact-item"><span>メンバーが未登録です</span></li>';

    renderMemberTeamSelect();
    renderQuickTeamSelect();
    renderQuickMemberSelect(elements.quickTaskTeam.value, elements.quickTaskMember.value);
}

function renderMemberTeamSelect() {
    const options = ['<option value="">チームを選択</option>'];
    const teams = state.organization.teams.slice().sort((a, b) => a.name.localeCompare(b.name, "ja"));
    for (const team of teams) {
        options.push(`<option value="${escapeHtml(team.id)}">${escapeHtml(team.name)}</option>`);
    }
    elements.memberTeamSelect.innerHTML = options.join("");
}

function renderQuickTeamSelect() {
    const previous = elements.quickTaskTeam.value || "";
    const options = ['<option value="">未指定</option>'];
    const teams = state.organization.teams.slice().sort((a, b) => a.name.localeCompare(b.name, "ja"));
    for (const team of teams) {
        const selected = previous === team.id ? " selected" : "";
        options.push(`<option value="${escapeHtml(team.id)}"${selected}>${escapeHtml(team.name)}</option>`);
    }
    elements.quickTaskTeam.innerHTML = options.join("");
}

function renderQuickMemberSelect(teamId, previousMemberId) {
    const options = ['<option value="">未指定</option>'];
    const members = state.organization.members
        .filter((member) => !teamId || member.teamId === teamId)
        .sort((a, b) => a.name.localeCompare(b.name, "ja"));

    for (const member of members) {
        const selected = previousMemberId === member.id ? " selected" : "";
        options.push(`<option value="${escapeHtml(member.id)}"${selected}>${escapeHtml(member.name)}</option>`);
    }
    elements.quickTaskMember.innerHTML = options.join("");
}

function ensureQuickChecklistRows() {
    if (elements.quickChecklistContainer.children.length > 0) return;
    addQuickChecklistRow();
}

function addQuickChecklistRow(text = "", checked = false) {
    const row = document.createElement("li");
    row.className = "quick-check-row";
    row.innerHTML = `
        <input type="checkbox" class="quick-check-done" ${checked ? "checked" : ""}>
        <input type="text" class="quick-check-text" maxlength="120" placeholder="チェック項目を入力" value="${escapeHtml(text)}">
        <button type="button" class="quick-check-remove" data-action="remove-quick-row">削除</button>
    `;
    elements.quickChecklistContainer.appendChild(row);
}

function handleQuickChecklistClick(event) {
    if (event.target.dataset.action !== "remove-quick-row") return;
    const row = event.target.closest(".quick-check-row");
    if (!row) return;
    if (elements.quickChecklistContainer.children.length === 1) {
        row.querySelector(".quick-check-text").value = "";
        row.querySelector(".quick-check-done").checked = false;
        return;
    }
    row.remove();
}

function handleQuickTaskSubmit(event) {
    event.preventDefault();

    const inputTitle = elements.quickTaskTitle.value.trim();
    const checklist = getQuickChecklistDraftItems();
    const title = inputTitle || checklist[0]?.text || "クイックタスク";

    if (!title) {
        elements.quickTaskTitle.focus();
        return;
    }

    const now = Date.now();
    const task = {
        id: generateId("task"),
        title,
        description: "",
        dueDate: elements.quickTaskDueDate.value || "",
        priority: "medium",
        status: "todo",
        importance: "b",
        category: "クイック追加",
        teamId: elements.quickTaskTeam.value || "",
        memberId: elements.quickTaskMember.value || "",
        checklist,
        detailNotes: [],
        bossQuestions: [],
        createdAt: now,
        updatedAt: now,
    };

    state.tasks.push(task);
    saveTasks();
    resetQuickTaskForm();
    render();
}

function getQuickChecklistDraftItems() {
    const rows = Array.from(elements.quickChecklistContainer.querySelectorAll(".quick-check-row"));
    return rows
        .map((row) => ({
            id: generateId("item"),
            checked: Boolean(row.querySelector(".quick-check-done")?.checked),
            text: row.querySelector(".quick-check-text")?.value.trim() || "",
        }))
        .filter((item) => item.text);
}

function resetQuickTaskForm() {
    elements.quickTaskForm.reset();
    elements.quickChecklistContainer.innerHTML = "";
    addQuickChecklistRow();
    renderQuickTeamSelect();
    renderQuickMemberSelect("", "");
}

function handleSubmitTask(event) {
    event.preventDefault();

    const title = elements.taskTitle.value.trim();
    if (!title) {
        elements.taskTitle.focus();
        return;
    }

    const now = Date.now();
    const editingId = elements.taskId.value;
    const nextTask = {
        id: editingId || String(now),
        title,
        description: elements.taskDescription.value.trim(),
        dueDate: elements.taskDueDate.value || "",
        priority: elements.taskPriority.value,
        status: elements.taskStatus.value,
        importance: elements.taskImportance.value,
        category: elements.taskCategory.value.trim(),
        createdAt: editingId ? undefined : now,
        updatedAt: now,
    };

    if (editingId) {
        state.tasks = state.tasks.map((task) => {
            if (task.id !== editingId) return task;
            return {
                ...task,
                ...nextTask,
                createdAt: task.createdAt || now,
            };
        });
    } else {
        state.tasks.push({
            ...nextTask,
            checklist: [],
            teamId: "",
            memberId: "",
            detailNotes: [],
            bossQuestions: [],
        });
    }

    saveTasks();
    resetForm();
    render();
}

function handleTaskListClick(event) {
    const action = event.target.dataset.action;
    if (!action) return;

    const listItem = event.target.closest(".task-item");
    if (!listItem) return;
    const taskId = listItem.dataset.id;

    if (action === "delete") {
        deleteTask(taskId);
        return;
    }

    if (action === "edit") {
        beginEditTask(taskId);
        return;
    }

    if (action === "cycle-status") {
        cycleTaskStatus(taskId);
        return;
    }

    if (action === "detail") {
        openDetailModal(taskId);
        return;
    }

    if (action === "toggle-check-item") {
        const checkId = event.target.dataset.checkId;
        toggleChecklistItem(taskId, checkId, event.target.checked);
    }
}

function toggleChecklistItem(taskId, checkId, checked) {
    if (!checkId) return;
    updateTaskById(taskId, (current) => ({
        ...current,
        checklist: normalizeChecklist(current.checklist).map((item) => {
            if (item.id !== checkId) return item;
            return {
                ...item,
                checked,
            };
        }),
    }));
    render();
}

function deleteTask(taskId) {
    state.tasks = state.tasks.filter((task) => task.id !== taskId);
    saveTasks();
    render();
}

function beginEditTask(taskId) {
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task) return;

    elements.taskId.value = task.id;
    elements.taskTitle.value = task.title;
    elements.taskDescription.value = task.description || "";
    elements.taskDueDate.value = task.dueDate || "";
    elements.taskPriority.value = task.priority;
    elements.taskStatus.value = task.status;
    elements.taskImportance.value = isValidImportance(task.importance) ? task.importance : "b";
    elements.taskCategory.value = task.category || "";
    elements.saveButton.textContent = "更新する";
    elements.taskTitle.focus();
}

function cycleTaskStatus(taskId) {
    const order = ["todo", "doing", "done"];

    state.tasks = state.tasks.map((task) => {
        if (task.id !== taskId) return task;
        const currentIndex = order.indexOf(task.status);
        const nextStatus = order[(currentIndex + 1) % order.length];
        return {
            ...task,
            status: nextStatus,
            updatedAt: Date.now(),
        };
    });

    saveTasks();
    render();
}

function resetForm() {
    elements.taskForm.reset();
    elements.taskId.value = "";
    elements.taskPriority.value = "medium";
    elements.taskStatus.value = "todo";
    elements.taskImportance.value = "b";
    elements.saveButton.textContent = "タスクを保存";
}

function render() {
    renderDashboard();
    renderAlerts();
    renderTaskList();
    runAlertCheck();
}

function renderDashboard() {
    const total = state.tasks.length;
    const done = state.tasks.filter((task) => task.status === "done").length;
    const doing = state.tasks.filter((task) => task.status === "doing").length;
    const overdue = state.tasks.filter(isTaskOverdue).length;
    const completionRate = total === 0 ? 0 : Math.round((done / total) * 100);

    elements.metricTotal.textContent = String(total);
    elements.metricDoing.textContent = String(doing);
    elements.metricDone.textContent = String(done);
    elements.metricOverdue.textContent = String(overdue);
    elements.completionText.textContent = `${completionRate}%`;
    elements.completionBar.style.width = `${completionRate}%`;

    const counts = {
        high: 0,
        medium: 0,
        low: 0,
    };
    state.tasks.forEach((task) => {
        if (counts[task.priority] !== undefined) counts[task.priority] += 1;
    });

    elements.priorityBreakdown.innerHTML = [
        `高: ${counts.high}`,
        `中: ${counts.medium}`,
        `低: ${counts.low}`,
    ]
        .map((text) => `<li><span>${text.split(": ")[0]}</span><strong>${text.split(": ")[1]}</strong></li>`)
        .join("");

    const importanceCounts = {
        s: 0,
        a: 0,
        b: 0,
        c: 0,
    };
    state.tasks.forEach((task) => {
        const rank = isValidImportance(task.importance) ? task.importance : "b";
        importanceCounts[rank] += 1;
    });
    elements.importanceBreakdown.innerHTML = [
        `S: ${importanceCounts.s}`,
        `A: ${importanceCounts.a}`,
        `B: ${importanceCounts.b}`,
        `C: ${importanceCounts.c}`,
    ]
        .map((text) => `<li><span>${text.split(": ")[0]}</span><strong>${text.split(": ")[1]}</strong></li>`)
        .join("");
}

function renderTaskList() {
    const filteredTasks = getVisibleTasks();

    elements.taskCountText.textContent = `${filteredTasks.length}件表示 / 全${state.tasks.length}件`;
    elements.emptyState.classList.toggle("hidden", filteredTasks.length > 0);
    elements.taskList.classList.toggle("hidden", filteredTasks.length === 0);

    elements.taskList.innerHTML = filteredTasks.map(renderTaskItem).join("");
}

function renderAlerts() {
    const alertTasks = getAlertTasks();
    const items = [];

    if (alertTasks.length === 0) {
        items.push('<li class="alert-item empty">現在、期限アラート対象のタスクはありません。</li>');
    } else {
        for (const task of alertTasks) {
            const kind = getAlertKind(task);
            const label = kind === "overdue" ? "期限切れ" : "本日期限";
            items.push(
                `<li class="alert-item ${kind}">[${label}] ${escapeHtml(task.title)}（期限: ${escapeHtml(task.dueDate)}）</li>`
            );
        }
    }

    elements.alertList.innerHTML = items.join("");
    renderAlertPermissionText();
}

function getVisibleTasks() {
    const searchWord = state.filters.search;

    const filtered = state.tasks.filter((task) => {
        const statusMatch = state.filters.status === "all" || task.status === state.filters.status;
        const priorityMatch = state.filters.priority === "all" || task.priority === state.filters.priority;
        const importance = isValidImportance(task.importance) ? task.importance : "b";
        const importanceMatch = state.filters.importance === "all" || importance === state.filters.importance;
        const teamName = getTeamName(task.teamId);
        const memberName = getMemberName(task.memberId);
        const checklistText = normalizeChecklist(task.checklist)
            .map((item) => item.text)
            .join(" ");
        const searchable = `${task.title} ${task.description || ""} ${task.category || ""} ${teamName} ${memberName} ${checklistText}`.toLowerCase();
        const searchMatch = !searchWord || searchable.includes(searchWord);

        return statusMatch && priorityMatch && importanceMatch && searchMatch;
    });

    const sortType = state.filters.sortBy;
    filtered.sort((a, b) => compareTasks(a, b, sortType));
    return filtered;
}

function compareTasks(a, b, sortType) {
    if (sortType === "created_asc") {
        return (a.createdAt || 0) - (b.createdAt || 0);
    }
    if (sortType === "updated_desc") {
        return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
    }
    if (sortType === "updated_asc") {
        return (a.updatedAt || a.createdAt || 0) - (b.updatedAt || b.createdAt || 0);
    }
    if (sortType === "due_asc") {
        return compareDueDate(a.dueDate, b.dueDate);
    }
    if (sortType === "due_desc") {
        return compareDueDate(b.dueDate, a.dueDate);
    }
    if (sortType === "priority_desc") {
        return (PRIORITY_WEIGHT[b.priority] || 0) - (PRIORITY_WEIGHT[a.priority] || 0);
    }
    if (sortType === "importance_desc") {
        const bImportance = isValidImportance(b.importance) ? b.importance : "b";
        const aImportance = isValidImportance(a.importance) ? a.importance : "b";
        return (IMPORTANCE_WEIGHT[bImportance] || 0) - (IMPORTANCE_WEIGHT[aImportance] || 0);
    }
    if (sortType === "status_asc") {
        return (STATUS_WEIGHT[a.status] || 99) - (STATUS_WEIGHT[b.status] || 99);
    }
    if (sortType === "title_asc") {
        return String(a.title || "").localeCompare(String(b.title || ""), "ja");
    }
    if (sortType === "title_desc") {
        return String(b.title || "").localeCompare(String(a.title || ""), "ja");
    }
    if (sortType === "importance_due_asc") {
        const importanceCompare = compareImportanceDesc(a, b);
        if (importanceCompare !== 0) return importanceCompare;
        const dueCompare = compareDueDate(a.dueDate, b.dueDate);
        if (dueCompare !== 0) return dueCompare;
        return compareUpdatedDesc(a, b);
    }
    if (sortType === "priority_due_asc") {
        const priorityCompare = comparePriorityDesc(a, b);
        if (priorityCompare !== 0) return priorityCompare;
        const dueCompare = compareDueDate(a.dueDate, b.dueDate);
        if (dueCompare !== 0) return dueCompare;
        return compareUpdatedDesc(a, b);
    }
    if (sortType === "status_importance_due_asc") {
        const statusCompare = (STATUS_WEIGHT[a.status] || 99) - (STATUS_WEIGHT[b.status] || 99);
        if (statusCompare !== 0) return statusCompare;
        const importanceCompare = compareImportanceDesc(a, b);
        if (importanceCompare !== 0) return importanceCompare;
        const dueCompare = compareDueDate(a.dueDate, b.dueDate);
        if (dueCompare !== 0) return dueCompare;
        return compareUpdatedDesc(a, b);
    }
    return (b.createdAt || 0) - (a.createdAt || 0);
}

function comparePriorityDesc(a, b) {
    return (PRIORITY_WEIGHT[b.priority] || 0) - (PRIORITY_WEIGHT[a.priority] || 0);
}

function compareImportanceDesc(a, b) {
    const bImportance = isValidImportance(b.importance) ? b.importance : "b";
    const aImportance = isValidImportance(a.importance) ? a.importance : "b";
    return (IMPORTANCE_WEIGHT[bImportance] || 0) - (IMPORTANCE_WEIGHT[aImportance] || 0);
}

function compareUpdatedDesc(a, b) {
    return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
}

function compareDueDate(aDue, bDue) {
    if (!aDue && !bDue) return 0;
    if (!aDue) return 1;
    if (!bDue) return -1;
    return aDue.localeCompare(bDue);
}

function renderTaskItem(task) {
    const dueInfo = getDueInfo(task);
    const dueClass = dueInfo.kind !== "normal" ? ` ${dueInfo.kind}` : "";
    const categoryText = task.category ? `カテゴリ: ${escapeHtml(task.category)}` : "カテゴリなし";
    const importance = isValidImportance(task.importance) ? task.importance : "b";
    const teamName = getTeamName(task.teamId);
    const memberName = getMemberName(task.memberId);
    const assignmentText = memberName || teamName ? `担当: ${memberName || "未指定"} / ${teamName || "未指定"}` : "";
    const checklistHtml = renderTaskChecklist(task);

    return `
        <li class="task-item ${escapeHtml(task.status)}" data-id="${escapeHtml(task.id)}">
            <div class="task-top">
                <div>
                    <h3 class="task-title">${escapeHtml(task.title)}</h3>
                    <div class="task-meta">
                        <span class="badge status-${escapeHtml(task.status)}">${escapeHtml(STATUS_LABELS[task.status] || task.status)}</span>
                        <span class="badge importance-${escapeHtml(importance)}">重要度: ${escapeHtml(IMPORTANCE_LABELS[importance])}</span>
                        <span class="badge priority-${escapeHtml(task.priority)}">優先度: ${escapeHtml(PRIORITY_LABELS[task.priority] || task.priority)}</span>
                        <span class="badge">${categoryText}</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button type="button" data-action="detail">詳細</button>
                    <button type="button" data-action="cycle-status">進捗変更</button>
                    <button type="button" data-action="edit">編集</button>
                    <button type="button" data-action="delete">削除</button>
                </div>
            </div>
            ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ""}
            ${assignmentText ? `<p class="task-sub-meta">${escapeHtml(assignmentText)}</p>` : ""}
            ${checklistHtml}
            <p class="task-sub-meta">詳細メモ: ${(task.detailNotes || []).length}件 / 上司への質問: ${(task.bossQuestions || []).length}件</p>
            <p class="due-text${dueClass}">${escapeHtml(dueInfo.text)}</p>
        </li>
    `;
}

function renderTaskChecklist(task) {
    const checklist = normalizeChecklist(task.checklist);
    if (checklist.length === 0) return "";

    return `
        <ul class="task-checklist">
            ${checklist
                .map(
                    (item) => `
                <li>
                    <label>
                        <input type="checkbox" data-action="toggle-check-item" data-check-id="${escapeHtml(item.id)}" ${item.checked ? "checked" : ""}>
                        <span class="task-check-text ${item.checked ? "checked" : ""}">${escapeHtml(item.text)}</span>
                    </label>
                </li>
            `
                )
                .join("")}
        </ul>
    `;
}

function openDetailModal(taskId) {
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task) return;
    state.activeDetailTaskId = taskId;
    renderDetailModal();
    elements.detailModal.classList.remove("hidden");
}

function closeDetailModal() {
    state.activeDetailTaskId = null;
    elements.detailModal.classList.add("hidden");
    elements.detailNoteInput.value = "";
    elements.bossQuestionInput.value = "";
}

function renderDetailModal() {
    const task = getActiveDetailTask();
    if (!task) return;

    const importance = isValidImportance(task.importance) ? task.importance : "b";
    const teamName = getTeamName(task.teamId) || "未指定";
    const memberName = getMemberName(task.memberId) || "未指定";
    elements.detailModalTitle.textContent = task.title;
    elements.detailModalSummary.textContent = [
        `ステータス: ${STATUS_LABELS[task.status] || task.status}`,
        `重要度: ${IMPORTANCE_LABELS[importance]}`,
        `優先度: ${PRIORITY_LABELS[task.priority] || task.priority}`,
        `カテゴリ: ${task.category || "カテゴリなし"}`,
        `担当チーム: ${teamName}`,
        `担当メンバー: ${memberName}`,
        `チェック項目: ${normalizeChecklist(task.checklist).length}件`,
        `期限: ${task.dueDate || "指定なし"}`,
        "",
        `詳細: ${task.description || "詳細説明なし"}`,
    ].join("\n");

    const notes = (task.detailNotes || []).slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    elements.detailNoteList.innerHTML = notes.length
        ? notes
              .map(
                  (note) => `
            <li class="timeline-item">
                <div class="timeline-meta">${escapeHtml(formatDateTime(note.createdAt))}</div>
                <p class="timeline-text">${escapeHtml(note.text || "")}</p>
            </li>
        `
              )
              .join("")
        : '<li class="timeline-item"><p class="timeline-text">まだ詳細メモはありません。</p></li>';

    const questions = (task.bossQuestions || []).slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    elements.bossQuestionList.innerHTML = questions.length
        ? questions
              .map((question) => {
                  const statusClass = question.status === "answered" ? "answered" : "open";
                  const answerBlock = question.answer
                      ? `<p class="timeline-text">回答: ${escapeHtml(question.answer)}</p>`
                      : "";
                  const actionButton =
                      question.status === "answered"
                          ? `<button type="button" data-action="reopen-question" data-question-id="${escapeHtml(question.id)}">未回答に戻す</button>`
                          : `<button type="button" data-action="answer-question" data-question-id="${escapeHtml(question.id)}">回答を記録</button>`;

                  return `
                    <li class="timeline-item">
                        <div class="timeline-meta">
                            ${escapeHtml(formatDateTime(question.createdAt))}
                            <span class="question-status ${statusClass}">${question.status === "answered" ? "回答済み" : "未回答"}</span>
                        </div>
                        <p class="timeline-text">${escapeHtml(question.text || "")}</p>
                        ${answerBlock}
                        <div class="timeline-actions">
                            ${actionButton}
                        </div>
                    </li>
                `;
              })
              .join("")
        : '<li class="timeline-item"><p class="timeline-text">まだ上司への質問はありません。</p></li>';
}

function handleDetailNoteSubmit(event) {
    event.preventDefault();
    const task = getActiveDetailTask();
    if (!task) return;

    const text = elements.detailNoteInput.value.trim();
    if (!text) return;

    const note = {
        id: String(Date.now()),
        text,
        createdAt: Date.now(),
    };

    updateTaskById(task.id, (current) => ({
        ...current,
        detailNotes: [...(current.detailNotes || []), note],
    }));

    elements.detailNoteInput.value = "";
    render();
    renderDetailModal();
}

function handleBossQuestionSubmit(event) {
    event.preventDefault();
    const task = getActiveDetailTask();
    if (!task) return;

    const text = elements.bossQuestionInput.value.trim();
    if (!text) return;

    const question = {
        id: String(Date.now()),
        text,
        status: "open",
        answer: "",
        createdAt: Date.now(),
        answeredAt: null,
    };

    updateTaskById(task.id, (current) => ({
        ...current,
        bossQuestions: [...(current.bossQuestions || []), question],
    }));

    elements.bossQuestionInput.value = "";
    render();
    renderDetailModal();
}

function handleBossQuestionListClick(event) {
    const action = event.target.dataset.action;
    if (!action) return;
    const questionId = event.target.dataset.questionId;
    if (!questionId) return;

    const task = getActiveDetailTask();
    if (!task) return;

    if (action === "answer-question") {
        const answer = window.prompt("上司からの回答を入力してください");
        if (!answer || !answer.trim()) return;
        updateTaskById(task.id, (current) => ({
            ...current,
            bossQuestions: (current.bossQuestions || []).map((question) => {
                if (question.id !== questionId) return question;
                return {
                    ...question,
                    status: "answered",
                    answer: answer.trim(),
                    answeredAt: Date.now(),
                };
            }),
        }));
        render();
        renderDetailModal();
        return;
    }

    if (action === "reopen-question") {
        updateTaskById(task.id, (current) => ({
            ...current,
            bossQuestions: (current.bossQuestions || []).map((question) => {
                if (question.id !== questionId) return question;
                return {
                    ...question,
                    status: "open",
                    answer: "",
                    answeredAt: null,
                };
            }),
        }));
        render();
        renderDetailModal();
    }
}

function isTaskOverdue(task) {
    return Boolean(task.dueDate) && task.status !== "done" && task.dueDate < getTodayLocalISO();
}

function getAlertTasks() {
    const today = getTodayLocalISO();
    return state.tasks
        .filter((task) => task.status !== "done" && task.dueDate && task.dueDate <= today)
        .sort((a, b) => compareDueDate(a.dueDate, b.dueDate));
}

function getAlertKind(task) {
    return task.dueDate < getTodayLocalISO() ? "overdue" : "today";
}

function scheduleAlertCheck() {
    if (state.alertTimerId) {
        clearInterval(state.alertTimerId);
    }
    state.alertTimerId = setInterval(runAlertCheck, ALERT_CHECK_INTERVAL_MS);
}

function runAlertCheck() {
    if (!state.settings.alertsEnabled) return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const today = getTodayLocalISO();
    const alertTasks = getAlertTasks();
    let hasUpdate = false;

    for (const task of alertTasks) {
        const kind = getAlertKind(task);
        const key = `${today}|${task.id}|${kind}|${task.dueDate}`;
        if (state.alertSentMap[key]) continue;

        notifyTaskAlert(task, kind);
        state.alertSentMap[key] = Date.now();
        hasUpdate = true;
    }

    if (hasUpdate) {
        pruneAlertSentMap(today);
        saveAlertSentMap();
    }
}

function notifyTaskAlert(task, kind) {
    const title = kind === "overdue" ? "期限切れタスクがあります" : "本日期限のタスクがあります";
    const body = `${task.title}（期限: ${task.dueDate}）`;
    const notification = new Notification(title, { body });
    notification.onclick = () => window.focus();
}

function pruneAlertSentMap(todayIso) {
    const nextMap = {};
    for (const [key, value] of Object.entries(state.alertSentMap)) {
        const day = key.split("|")[0];
        if (day === todayIso) {
            nextMap[key] = value;
        }
    }
    state.alertSentMap = nextMap;
}

async function requestNotificationPermission() {
    if (!("Notification" in window)) {
        renderAlertPermissionText();
        return;
    }
    try {
        await Notification.requestPermission();
    } catch (_error) {
        // ignore
    }
    renderAlertPermissionText();
    runAlertCheck();
}

function syncAlertControls() {
    elements.alertEnabled.checked = Boolean(state.settings.alertsEnabled);
    renderAlertPermissionText();
}

function renderAlertPermissionText() {
    if (!("Notification" in window)) {
        elements.alertPermissionText.textContent = "このブラウザは通知に対応していません。";
        elements.notificationPermissionButton.disabled = true;
        return;
    }

    const permission = Notification.permission;
    if (permission === "granted") {
        elements.alertPermissionText.textContent = state.settings.alertsEnabled
            ? "ブラウザ通知は有効です。期限切れ/本日期限タスクを通知します。"
            : "通知は許可済みです。チェックをONにすると通知します。";
        elements.notificationPermissionButton.textContent = "通知許可済み";
        elements.notificationPermissionButton.disabled = true;
        return;
    }

    if (permission === "denied") {
        elements.alertPermissionText.textContent = "通知がブロックされています。ブラウザ設定から許可してください。";
        elements.notificationPermissionButton.textContent = "通知がブロック中";
        elements.notificationPermissionButton.disabled = true;
        return;
    }

    elements.alertPermissionText.textContent = "通知を使うには「通知を許可」を押してください。";
    elements.notificationPermissionButton.textContent = "通知を許可";
    elements.notificationPermissionButton.disabled = false;
}

function getDueInfo(task) {
    if (!task.dueDate) {
        return { text: "期限: 指定なし", kind: "normal" };
    }

    const today = getTodayLocalISO();
    if (task.dueDate < today && task.status !== "done") {
        return { text: `期限: ${task.dueDate} (期限切れ)`, kind: "overdue" };
    }
    if (task.dueDate === today && task.status !== "done") {
        return { text: `期限: ${task.dueDate} (今日まで)`, kind: "today" };
    }
    return { text: `期限: ${task.dueDate}`, kind: "normal" };
}

function renderTodayLabel() {
    const date = new Date();
    const formatted = new Intl.DateTimeFormat("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
    }).format(date);
    elements.todayLabel.textContent = formatted;
}

function getTodayLocalISO() {
    const now = new Date();
    const tzOffsetMs = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 10);
}

function normalizeChecklist(checklist) {
    if (!Array.isArray(checklist)) return [];
    return checklist
        .filter((item) => item && typeof item.text === "string")
        .map((item) => ({
            id: typeof item.id === "string" ? item.id : generateId("item"),
            text: item.text.trim(),
            checked: Boolean(item.checked),
        }))
        .filter((item) => item.text);
}

function isValidImportance(value) {
    return value === "s" || value === "a" || value === "b" || value === "c";
}

function getTeamName(teamId) {
    if (!teamId) return "";
    const team = state.organization.teams.find((item) => item.id === teamId);
    return team ? team.name : "";
}

function getMemberName(memberId) {
    if (!memberId) return "";
    const member = state.organization.members.find((item) => item.id === memberId);
    return member ? member.name : "";
}

function getActiveDetailTask() {
    if (!state.activeDetailTaskId) return null;
    return state.tasks.find((task) => task.id === state.activeDetailTaskId) || null;
}

function updateTaskById(taskId, updater) {
    state.tasks = state.tasks.map((task) => {
        if (task.id !== taskId) return task;
        return {
            ...updater(task),
            updatedAt: Date.now(),
        };
    });
    saveTasks();
}

function formatDateTime(timestamp) {
    if (!timestamp) return "日時不明";
    return new Intl.DateTimeFormat("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(timestamp));
}

function generateId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

document.addEventListener("DOMContentLoaded", boot);
