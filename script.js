document.addEventListener('DOMContentLoaded', () => {
    // Инициализация элементов DOM
    const taskInput = document.getElementById('task-input');
    const createTaskButton = document.getElementById('create-task-button');
    const taskDistribution = document.getElementById('task-distribution');
    const daysWrapper = document.getElementById('days-wrapper');
    const taskModal = document.getElementById('task-modal');
    const closeModal = document.getElementById('close-modal');
    const fullTaskText = document.getElementById('full-task-text');
    const editButton = document.getElementById('edit-button');
    const prevDayButton = document.getElementById('prev-day-button');
    const nextDayButton = document.getElementById('next-day-button');
    const daysSlider = document.getElementById('days-slider');

    // Инициализация переменных
    let tasks = [];
    let currentDate = new Date(); // Текущая дата
    const daysToLoad = 7; // Количество дней для отображения
    let currentEditTask = null;
    let isEditing = false;

    // Функции для работы с локальным хранилищем
    const loadTasks = () => {
        tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    };

    const saveTasks = () => localStorage.setItem('tasks', JSON.stringify(tasks));

    // Функция создания элемента задачи
    function createTaskElement(task) {
        const taskItem = document.createElement('div');
        taskItem.className = 'task-item';
        taskItem.textContent = task.text.length > 20 ? task.text.substring(0, 20) + '...' : task.text;
        taskItem.dataset.fullText = task.text;
        taskItem.dataset.id = task.id;

        const deleteButton = document.createElement('span');
        deleteButton.textContent = '×';
        deleteButton.className = 'delete-button';
        taskItem.appendChild(deleteButton);

        setupTaskItemEventListeners(taskItem, deleteButton);

        return taskItem;
    }

    // Настройка обработчиков событий для элемента задачи
    function setupTaskItemEventListeners(taskItem, deleteButton) {
        deleteButton.addEventListener('click', () => {
            taskItem.remove();
            tasks = tasks.filter(task => task.id !== parseInt(taskItem.dataset.id));
            saveTasks();
            displayTasksForCurrentDays();
        });

        taskItem.addEventListener('dblclick', () => {
            currentEditTask = taskItem;
            fullTaskText.textContent = taskItem.dataset.fullText;
            fullTaskText.contentEditable = "false";
            isEditing = false;
            editButton.textContent = "✎";
            taskModal.style.display = 'block';
        });

        taskItem.draggable = true;
        taskItem.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', taskItem.dataset.fullText);
            e.dataTransfer.setData('task-id', taskItem.dataset.id);
            e.dataTransfer.setData('source-column', e.target.closest('.day-column')?.dataset.date || 'task-distribution');
            e.dataTransfer.effectAllowed = 'move';
        });
    }

    // Функция создания колонки дня
    function createDayColumn(date) {
        const dayColumn = document.createElement('div');
        dayColumn.className = 'day-column';
        dayColumn.dataset.date = date;

        dayColumn.innerHTML = `
            <div class="day-header">${getDayOfWeek(date)}</div>
            <div class="day-date">${date}</div>
        `;

        setupDropEventListeners(dayColumn);

        return dayColumn;
    }

    // Функция для получения названия дня недели
    function getDayOfWeek(dateString) {
        const [day, month, year] = dateString.split('.').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('ru-RU', { weekday: 'long' });
    }

    // Настройка обработчиков событий для колонки дня и распределения задач
    function setupDropEventListeners(dropArea) {
        dropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            const taskText = e.dataTransfer.getData('text/plain');
            const taskId = e.dataTransfer.getData('task-id');
            const sourceColumn = e.dataTransfer.getData('source-column');
            const targetDate = dropArea.dataset.date || null;

            if (sourceColumn === (targetDate || 'task-distribution')) return;

            const taskItem = createTaskElement({ id: taskId, text: taskText });
            dropArea.appendChild(taskItem);

            removeTaskFromPreviousLocation(taskId, sourceColumn);

            // Обновляем массив задач
            const taskIndex = tasks.findIndex(task => task.id === parseInt(taskId));
            if (taskIndex !== -1) {
                tasks[taskIndex].date = targetDate;
            } else {
                tasks.push({ id: parseInt(taskId), text: taskText, date: targetDate });
            }
            saveTasks();
        });
    }

    // Удаление задачи из предыдущего местоположения
    function removeTaskFromPreviousLocation(taskId, sourceColumn) {
        const sourceElement = sourceColumn === 'task-distribution' 
            ? taskDistribution 
            : document.querySelector(`[data-date="${sourceColumn}"]`);
        
        const taskItem = sourceElement.querySelector(`[data-id="${taskId}"]`);
        if (taskItem) {
            taskItem.remove();
            if (sourceColumn === 'task-distribution') {
                tasks = tasks.filter(task => task.id !== parseInt(taskId));
            }
        }
    }

    // Функция отображения задач для текущих дней
    function displayTasksForCurrentDays() {
        const dayColumns = document.querySelectorAll('.day-column');
        dayColumns.forEach(dayColumn => {
            const date = dayColumn.dataset.date;
            dayColumn.innerHTML = `
                <div class="day-header">${getDayOfWeek(date)}</div>
                <div class="day-date">${date}</div>
            `;
            const dayTasks = tasks.filter(task => task.date === date);
            dayTasks.forEach(task => {
                const taskItem = createTaskElement(task);
                dayColumn.appendChild(taskItem);
            });
        });
    }

    // Функция добавления дней
    function addDays(startDate) {
        daysWrapper.innerHTML = ''; // Очищаем предыдущие дни

        for (let i = 0; i < daysToLoad; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i); // Устанавливаем дату
            const formattedDate = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const dayColumn = createDayColumn(formattedDate);
            daysWrapper.appendChild(dayColumn);
        }

        setupDropEventListeners(taskDistribution); // Настраиваем обработчики для распределения задач

        displayTasksForCurrentDays();
    }

    // Обработчики событий для кнопок навигации
    nextDayButton.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() + 1); // Увеличиваем на один день
        addDays(currentDate); // Обновляем отображаемые дни
    });

    prevDayButton.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 1); // Уменьшаем на один день
        addDays(currentDate); // Обновляем отображаемые дни
    });

    // Обработчик ползунка
    daysSlider.addEventListener('input', (e) => {
        const index = parseInt(e.target.value);
        currentDate.setDate(currentDate.getDate() + index - (daysToLoad - 1));
        addDays(currentDate); // Обновляем отображаемые дни
    });

    // Функция сброса состояния модального окна
    function resetModalState() {
        isEditing = false;
        editButton.textContent = "✎";
        fullTaskText.contentEditable = "false";
    }

    // Обработчики событий
    taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') createTaskButton.click();
    });

    createTaskButton.addEventListener('click', () => {
        const taskText = taskInput.value.trim();
        if (taskText) {
            const task = { id: Date.now(), text: taskText, date: null };
            tasks.push(task);
            const taskItem = createTaskElement(task);
            taskDistribution.appendChild(taskItem);
            taskInput.value = '';
            saveTasks();
        }
    });

    editButton.addEventListener('click', () => {
        if (isEditing) {
            // Сохранение изменений
            const newText = fullTaskText.textContent.trim();
            if (newText && currentEditTask) {
                currentEditTask.dataset.fullText = newText;
                currentEditTask.textContent = newText.length > 20 ? newText.substring(0, 20) + '...' : newText;

                // Восстановление кнопок удаления и редактирования
                const deleteButton = currentEditTask.querySelector('.delete-button');
                if (deleteButton) {
                    currentEditTask.appendChild(deleteButton);
                }

                tasks = tasks.map(task => 
                    task.id === parseInt(currentEditTask.dataset.id) ? { ...task, text: newText } : task
                );
                saveTasks();
            }
            // Возвращаем режим просмотра
            fullTaskText.contentEditable = "false";
            editButton.textContent = "✎";
            isEditing = false;
        } else {
            // Начало редактирования
            fullTaskText.contentEditable = "true";
            fullTaskText.focus();
            editButton.textContent = "✓";
            isEditing = true;
        }
    });

    closeModal.addEventListener('click', () => {
        if (isEditing) {
            // Если редактирование не завершено, сохраняем изменения
            editButton.click();
        }
        resetModalState();
        taskModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === taskModal) {
            if (isEditing) {
                // Если редактирование не завершено, сохраняем изменения
                editButton.click();
            }
            resetModalState();
            taskModal.style.display = 'none';
        }
    });

    // Инициализация
    loadTasks();
    addDays(currentDate); // Начальное отображение дней
});
