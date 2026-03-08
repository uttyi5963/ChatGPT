const STORAGE_KEY = "taskDashboard.tasks.v1";

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

const PRIORITY_WEIGHT = {
    high: 3,
    medium: 2,
    low: 1,
};

const state = {
    tasks: [],
    filters: {
        search: "",
        status: "all",
        priority: "all",
        sortBy: "created_desc",
    },
};

const elements = {
    taskForm: document.getElementById("task-form"),
    taskId: document.getElementById("task-id"),
    taskTitle: document.getElementById("task-title"),
    taskDescription: document.getElementById("task-description"),
    taskDueDate: document.getElementById("task-due-date"),
    taskPriority: document.getElementById("task-priority"),
    taskStatus: document.getElementById("task-status"),
    taskCategory: document.getElementById("task-category"),
    saveButton: document.getElementById("save-task-btn"),
    resetButton: document.getElementById("reset-form-btn"),
    searchInput: document.getElementById("search-input"),
    filterStatus: document.getElementById("filter-status"),
    filterPriority: document.getElementById("filter-priority"),
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
    todayLabel: document.getElementById("today-label"),
};

function boot() {
    state.tasks = loadTasks();
    renderTodayLabel();
    attachEventListeners();
    resetForm();
    render();
}

function loadTasks() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
        return [];
    }
}

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function attachEventListeners() {
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

    elements.sortBy.addEventListener("change", (event) => {
        state.filters.sortBy = event.target.value;
        renderTaskList();
    });

    elements.taskList.addEventListener("click", handleTaskListClick);
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
        state.tasks.push(nextTask);
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
    }
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
    elements.saveButton.textContent = "タスクを保存";
}

function render() {
    renderDashboard();
    renderTaskList();
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
}

function renderTaskList() {
    const filteredTasks = getVisibleTasks();

    elements.taskCountText.textContent = `${filteredTasks.length}件表示 / 全${state.tasks.length}件`;
    elements.emptyState.classList.toggle("hidden", filteredTasks.length > 0);
    elements.taskList.classList.toggle("hidden", filteredTasks.length === 0);

    elements.taskList.innerHTML = filteredTasks.map(renderTaskItem).join("");
}

function getVisibleTasks() {
    const searchWord = state.filters.search;

    const filtered = state.tasks.filter((task) => {
        const statusMatch = state.filters.status === "all" || task.status === state.filters.status;
        const priorityMatch = state.filters.priority === "all" || task.priority === state.filters.priority;

        const searchable = `${task.title} ${task.description || ""} ${task.category || ""}`.toLowerCase();
        const searchMatch = !searchWord || searchable.includes(searchWord);

        return statusMatch && priorityMatch && searchMatch;
    });

    const sortType = state.filters.sortBy;
    filtered.sort((a, b) => compareTasks(a, b, sortType));
    return filtered;
}

function compareTasks(a, b, sortType) {
    if (sortType === "created_asc") {
        return (a.createdAt || 0) - (b.createdAt || 0);
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
    return (b.createdAt || 0) - (a.createdAt || 0);
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

    return `
        <li class="task-item ${escapeHtml(task.status)}" data-id="${escapeHtml(task.id)}">
            <div class="task-top">
                <div>
                    <h3 class="task-title">${escapeHtml(task.title)}</h3>
                    <div class="task-meta">
                        <span class="badge status-${escapeHtml(task.status)}">${escapeHtml(STATUS_LABELS[task.status] || task.status)}</span>
                        <span class="badge priority-${escapeHtml(task.priority)}">優先度: ${escapeHtml(PRIORITY_LABELS[task.priority] || task.priority)}</span>
                        <span class="badge">${categoryText}</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button type="button" data-action="cycle-status">進捗変更</button>
                    <button type="button" data-action="edit">編集</button>
                    <button type="button" data-action="delete">削除</button>
                </div>
            </div>
            ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ""}
            <p class="due-text${dueClass}">${escapeHtml(dueInfo.text)}</p>
        </li>
    `;
}

function isTaskOverdue(task) {
    return Boolean(task.dueDate) && task.status !== "done" && task.dueDate < getTodayLocalISO();
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

function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

document.addEventListener("DOMContentLoaded", boot);
