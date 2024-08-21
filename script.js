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
    const lowPriorityButton = document.getElementById('low-priority-button');
    const mediumPriorityButton = document.getElementById('medium-priority-button');
    const highPriorityButton = document.getElementById('high-priority-button');
    
    
    

    

    const priorityButtons = [lowPriorityButton, mediumPriorityButton, highPriorityButton];
    
    function clearActivePriority() {
        priorityButtons.forEach(button => button.classList.remove('active'));
    }
    function setTaskPriority(taskItem, priority) {
        taskItem.dataset.priority = priority;
        switch (priority) {
            case 'low':
                taskItem.style.backgroundColor = '#d4d4d4';
                break;
            case 'medium':
                taskItem.style.backgroundColor = '#F9ECA4';
                break;
            case 'high':
                taskItem.style.backgroundColor = '#F6768E';
                break;
            default:
                taskItem.style.backgroundColor = ''; // Вернуть в исходное состояние
        }
    }
    function handlePriorityButtonClick(button, priority) {
        clearActivePriority();
        button.classList.add('active');
        if (currentEditTask) {
            setTaskPriority(currentEditTask, priority);

            // Обновляем задачу в массиве tasks
            tasks = tasks.map(task => 
                task.id === parseInt(currentEditTask.dataset.id) ? { ...task, priority: priority } : task
            );
            saveTasks();
        }
    }
    lowPriorityButton.addEventListener('click', () => handlePriorityButtonClick(lowPriorityButton, 'low'));
    mediumPriorityButton.addEventListener('click', () => handlePriorityButtonClick(mediumPriorityButton, 'medium'));
    highPriorityButton.addEventListener('click', () => handlePriorityButtonClick(highPriorityButton, 'high'));



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
        taskItem.textContent = task.text.length > 15 ? task.text.substring(0, 15) + '...' : task.text;
        taskItem.dataset.fullText = task.text;
        taskItem.dataset.id = task.id;

        // Применяем приоритет при создании задачи
        if (task.priority) {
            setTaskPriority(taskItem, task.priority);
        }

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
    
            // Устанавливаем активную кнопку при открытии
            clearActivePriority();
            switch (taskItem.dataset.priority) {
                case 'low':
                    lowPriorityButton.classList.add('active');
                    break;
                case 'medium':
                    mediumPriorityButton.classList.add('active');
                    break;
                case 'high':
                    highPriorityButton.classList.add('active');
                    break;
            }
    
            taskModal.style.display = 'block';
        });

        taskItem.draggable = true;
        taskItem.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', taskItem.dataset.fullText);
            e.dataTransfer.setData('task-id', taskItem.dataset.id);
            e.dataTransfer.setData('source-column', e.target.closest('.day-column')?.dataset.date || 'task-distribution');
            e.dataTransfer.effectAllowed = 'move';
            
            taskItem.classList.add('dragging'); // Добавляем класс
        });
        
        taskItem.addEventListener('dragend', (e) => {
            taskItem.classList.remove('dragging'); // Удаляем класс
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
            const taskId = e.dataTransfer.getData('task-id');
            const sourceColumn = e.dataTransfer.getData('source-column');
            const targetDate = dropArea.dataset.date || null;
        
            if (sourceColumn === (targetDate || 'task-distribution')) return;
        
            const taskItem = document.querySelector(`[data-id='${taskId}']`); // Найти текущий элемент
        
            dropArea.appendChild(taskItem); // Переместить элемент
        
            removeTaskFromPreviousLocation(taskId, sourceColumn);
        
            // Обновляем массив задач
            const taskIndex = tasks.findIndex(task => task.id === parseInt(taskId));
            if (taskIndex !== -1) {
                tasks[taskIndex].date = targetDate;
            } else {
                tasks.push({ id: parseInt(taskId), date: targetDate });
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
// При начале перетаскивания сохраняем текущий цвет задачи
document.addEventListener('dragstart', function(event) {
    if (event.target.classList.contains('task-item')) {
        const taskElement = event.target;
        // Сохраняем текущий цвет фона в data-атрибут
        taskElement.setAttribute('data-bgcolor', taskElement.style.backgroundColor);
    }
});

// При завершении перетаскивания восстанавливаем сохранённый цвет
document.addEventListener('drop', function(event) {
    const taskElement = document.querySelector('.dragging'); // Найдите перемещаемый элемент
    if (taskElement && taskElement.classList.contains('task-item')) {
        // Восстанавливаем цвет фона из data-атрибута
        const savedColor = taskElement.getAttribute('data-bgcolor');
        taskElement.style.backgroundColor = savedColor;
    }
});
document.addEventListener('DOMContentLoaded', () => {
    const containers = document.querySelectorAll('.task-container');

    containers.forEach(container => {
        container.addEventListener('dragover', (event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
        });

        container.addEventListener('drop', (event) => {
            event.preventDefault();
            const task = document.querySelector('.dragging');
            if (task) {
                container.appendChild(task);
                task.classList.remove('dragging');
            }
        });
    });

    document.querySelectorAll('.task-item').forEach(task => {
        task.addEventListener('dragstart', (event) => {
            event.target.classList.add('dragging');
            event.dataTransfer.setData('text/plain', event.target.textContent); // Не обязательно, но может быть полезно
        });

        task.addEventListener('dragend', (event) => {
            event.target.classList.remove('dragging');
        });
    });
});
