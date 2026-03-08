const STORAGE_KEY = "taskboard.tasks.v1";

const PRIORITY_LABELS = {
    high: "高",
    medium: "中",
    low: "低",
};

const STATUS_LABELS = {
    todo: "未着手",
    in_progress: "進行中",
    completed: "完了",
};

const PRIORITY_ORDER = {
    high: 3,
    medium: 2,
    low: 1,
};

const appState = {
    tasks: [],
    editingTaskId: null,
};

const dom = {};

function initializeDom() {
    dom.searchInput = document.getElementById("search-input");
    dom.taskForm = document.getElementById("task-form");
    dom.taskTitle = document.getElementById("task-title");
    dom.taskDescription = document.getElementById("task-description");
    dom.taskPriority = document.getElementById("task-priority");
    dom.taskDueDate = document.getElementById("task-due-date");
    dom.taskStatus = document.getElementById("task-status");
    dom.formResetBtn = document.getElementById("form-reset-btn");

    dom.filterStatus = document.getElementById("filter-status");
    dom.filterPriority = document.getElementById("filter-priority");
    dom.sortBy = document.getElementById("sort-by");

    dom.kpiTotal = document.getElementById("kpi-total");
    dom.kpiInProgress = document.getElementById("kpi-in-progress");
    dom.kpiCompleted = document.getElementById("kpi-completed");
    dom.kpiOverdue = document.getElementById("kpi-overdue");
    dom.completionBar = document.getElementById("completion-bar");
    dom.completionText = document.getElementById("completion-text");
    dom.priorityBreakdown = document.getElementById("priority-breakdown");

    dom.taskList = document.getElementById("task-list");
    dom.emptyState = document.getElementById("empty-state");
    dom.taskTemplate = document.getElementById("task-item-template");
}

function loadTasks() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        appState.tasks = [];
        return;
    }

    try {
        const parsed = JSON.parse(raw);
        appState.tasks = Array.isArray(parsed) ? parsed.map(normalizeTask).filter(Boolean) : [];
    } catch (_error) {
        appState.tasks = [];
    }
}

function normalizeTask(task) {
    if (!task || typeof task !== "object") return null;
    if (!task.id || !task.title) return null;

    const safePriority = ["high", "medium", "low"].includes(task.priority) ? task.priority : "medium";
    const safeStatus = ["todo", "in_progress", "completed"].includes(task.status) ? task.status : "todo";
    const createdAt = Number(task.createdAt) || Date.now();
    const updatedAt = Number(task.updatedAt) || createdAt;

    return {
        id: String(task.id),
        title: String(task.title),
        description: task.description ? String(task.description) : "",
        priority: safePriority,
        dueDate: task.dueDate ? String(task.dueDate) : "",
        status: safeStatus,
        createdAt,
        updatedAt,
    };
}

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.tasks));
}

function render() {
    const filteredTasks = getFilteredTasks();
    renderDashboard();
    renderTaskList(filteredTasks);
}

function getFilteredTasks() {
    const keyword = dom.searchInput.value.trim().toLowerCase();
    const statusFilter = dom.filterStatus.value;
    const priorityFilter = dom.filterPriority.value;
    const sortBy = dom.sortBy.value;

    const tasks = appState.tasks.filter((task) => {
        const inKeyword =
            keyword === "" ||
            task.title.toLowerCase().includes(keyword) ||
            task.description.toLowerCase().includes(keyword);
        const inStatus = statusFilter === "all" || task.status === statusFilter;
        const inPriority = priorityFilter === "all" || task.priority === priorityFilter;
        return inKeyword && inStatus && inPriority;
    });

    tasks.sort((a, b) => compareTasks(a, b, sortBy));
    return tasks;
}

function compareTasks(a, b, sortBy) {
    if (sortBy === "due_asc") {
        const aDue = toTime(a.dueDate);
        const bDue = toTime(b.dueDate);
        if (aDue === null && bDue === null) return b.createdAt - a.createdAt;
        if (aDue === null) return 1;
        if (bDue === null) return -1;
        return aDue - bDue;
    }

    if (sortBy === "priority_desc") {
        const priorityDiff = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.createdAt - a.createdAt;
    }

    return b.createdAt - a.createdAt;
}

function renderDashboard() {
    const total = appState.tasks.length;
    const inProgress = appState.tasks.filter((task) => task.status === "in_progress").length;
    const completed = appState.tasks.filter((task) => task.status === "completed").length;
    const overdue = appState.tasks.filter((task) => isOverdue(task)).length;
    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

    dom.kpiTotal.textContent = String(total);
    dom.kpiInProgress.textContent = String(inProgress);
    dom.kpiCompleted.textContent = String(completed);
    dom.kpiOverdue.textContent = String(overdue);
    dom.completionBar.style.width = `${completionRate}%`;
    dom.completionText.textContent = `${completionRate}% (${completed}/${total})`;

    const byPriority = {
        high: appState.tasks.filter((task) => task.priority === "high").length,
        medium: appState.tasks.filter((task) => task.priority === "medium").length,
        low: appState.tasks.filter((task) => task.priority === "low").length,
    };
    const maxCount = Math.max(byPriority.high, byPriority.medium, byPriority.low, 1);

    dom.priorityBreakdown.innerHTML = "";
    ["high", "medium", "low"].forEach((priority) => {
        const row = document.createElement("div");
        row.className = "priority-row";

        const ratio = Math.round((byPriority[priority] / maxCount) * 100);
        row.innerHTML = `
            <span>${PRIORITY_LABELS[priority]}</span>
            <div class="priority-track">
                <div class="priority-fill ${priority}" style="width:${ratio}%"></div>
            </div>
            <span>${byPriority[priority]}</span>
        `;
        dom.priorityBreakdown.appendChild(row);
    });
}

function renderTaskList(tasks) {
    dom.taskList.innerHTML = "";

    if (tasks.length === 0) {
        dom.emptyState.classList.remove("hidden");
        return;
    }
    dom.emptyState.classList.add("hidden");

    tasks.forEach((task) => {
        const fragment = dom.taskTemplate.content.cloneNode(true);
        const item = fragment.querySelector(".task-item");
        const titleEl = fragment.querySelector(".task-title");
        const descriptionEl = fragment.querySelector(".task-description");
        const metaEl = fragment.querySelector(".task-meta");
        const priorityChip = fragment.querySelector(".chip.priority");
        const statusChip = fragment.querySelector(".chip.status");
        const toggleButton = fragment.querySelector(".toggle-btn");
        const editButton = fragment.querySelector(".edit-btn");
        const deleteButton = fragment.querySelector(".delete-btn");

        titleEl.textContent = task.title;
        descriptionEl.textContent = task.description || "説明なし";
        metaEl.textContent = getTaskMetaText(task);

        priorityChip.textContent = `優先度: ${PRIORITY_LABELS[task.priority]}`;
        priorityChip.classList.add(task.priority);

        statusChip.textContent = `状態: ${STATUS_LABELS[task.status]}`;
        statusChip.classList.add(task.status);

        if (isOverdue(task)) {
            item.style.borderColor = "#fb7185";
        }

        toggleButton.dataset.action = "toggle";
        editButton.dataset.action = "edit";
        deleteButton.dataset.action = "delete";
        item.dataset.id = task.id;
        item.dataset.status = task.status;

        dom.taskList.appendChild(fragment);
    });
}

function getTaskMetaText(task) {
    const created = new Date(task.createdAt);
    const dueText = task.dueDate ? formatDate(task.dueDate) : "期限なし";
    const createdText = `${created.getFullYear()}/${String(created.getMonth() + 1).padStart(2, "0")}/${String(created.getDate()).padStart(2, "0")}`;
    return `期限: ${dueText} | 作成日: ${createdText}`;
}

function isOverdue(task) {
    if (!task.dueDate || task.status === "completed") {
        return false;
    }
    const due = new Date(`${task.dueDate}T23:59:59`);
    return due.getTime() < Date.now();
}

function toTime(dateString) {
    if (!dateString) return null;
    return new Date(`${dateString}T00:00:00`).getTime();
}

function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(`${dateString}T00:00:00`);
    return date.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

function resetForm() {
    appState.editingTaskId = null;
    dom.taskForm.reset();
    dom.taskPriority.value = "medium";
    dom.taskStatus.value = "todo";
    dom.taskForm.querySelector('button[type="submit"]').textContent = "追加";
}

function upsertTaskFromForm() {
    const title = dom.taskTitle.value.trim();
    if (!title) return;

    const description = dom.taskDescription.value.trim();
    const priority = dom.taskPriority.value;
    const dueDate = dom.taskDueDate.value || "";
    const status = dom.taskStatus.value;
    const now = Date.now();

    if (appState.editingTaskId) {
        appState.tasks = appState.tasks.map((task) =>
            task.id === appState.editingTaskId
                ? {
                      ...task,
                      title,
                      description,
                      priority,
                      dueDate,
                      status,
                      updatedAt: now,
                  }
                : task
        );
    } else {
        appState.tasks.push({
            id: crypto.randomUUID(),
            title,
            description,
            priority,
            dueDate,
            status,
            createdAt: now,
            updatedAt: now,
        });
    }

    saveTasks();
    resetForm();
    render();
}

function editTask(taskId) {
    const task = appState.tasks.find((item) => item.id === taskId);
    if (!task) return;

    appState.editingTaskId = task.id;
    dom.taskTitle.value = task.title;
    dom.taskDescription.value = task.description;
    dom.taskPriority.value = task.priority;
    dom.taskDueDate.value = task.dueDate;
    dom.taskStatus.value = task.status;
    dom.taskForm.querySelector('button[type="submit"]').textContent = "更新";
    dom.taskTitle.focus();
}

function deleteTask(taskId) {
    const task = appState.tasks.find((item) => item.id === taskId);
    if (!task) return;

    const shouldDelete = window.confirm(`「${task.title}」を削除しますか？`);
    if (!shouldDelete) return;

    appState.tasks = appState.tasks.filter((item) => item.id !== taskId);
    if (appState.editingTaskId === taskId) {
        resetForm();
    }
    saveTasks();
    render();
}

function toggleTaskStatus(taskId) {
    appState.tasks = appState.tasks.map((task) => {
        if (task.id !== taskId) return task;

        const nextStatus =
            task.status === "todo"
                ? "in_progress"
                : task.status === "in_progress"
                  ? "completed"
                  : "todo";

        return { ...task, status: nextStatus, updatedAt: Date.now() };
    });

    saveTasks();
    render();
}

function registerEventListeners() {
    dom.taskForm.addEventListener("submit", (event) => {
        event.preventDefault();
        upsertTaskFromForm();
    });

    dom.formResetBtn.addEventListener("click", () => {
        resetForm();
    });

    dom.searchInput.addEventListener("input", render);
    dom.filterStatus.addEventListener("change", render);
    dom.filterPriority.addEventListener("change", render);
    dom.sortBy.addEventListener("change", render);

    dom.taskList.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button) return;
        const item = event.target.closest(".task-item");
        if (!item) return;

        const taskId = item.dataset.id;
        const action = button.dataset.action;

        if (action === "toggle") {
            toggleTaskStatus(taskId);
        } else if (action === "edit") {
            editTask(taskId);
        } else if (action === "delete") {
            deleteTask(taskId);
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initializeDom();
    loadTasks();
    registerEventListeners();
    resetForm();
    render();
});
