(function () {
    const DEFAULT_SECTION_ID = 'cat-design';
    const HANDLE = '.rectangle-parent';
    const DRAG_FLAG = 'data-drag-from-handle';
    const STORAGE_KEY = 'todo-state-v1';

    const storage = {
        save(state) {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
            catch (e) { console.warn('LocalStorage save error:', e); }
        },
        load() {
            try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
            catch { return null; }
        }
    };


    // ініціалізація списків
    document.querySelectorAll('.section').forEach(sec => {
        if (!sec.querySelector('.todo')) {
            const ul = document.createElement('ul');
            ul.className = 'todo';
            sec.appendChild(ul);
        }
    });
    document.querySelectorAll('.todo').forEach(addListListeners);
    updateAllEmptyStates();

    const saved = storage.load();
    if (saved && saved.lists) {
        hydrateDOM(saved);
    } else if (!document.querySelector('.task')) {
        const firstList = getTargetList();
        if (firstList) {
            firstList.appendChild(makeTask('Polish icon set', 1));
            firstList.appendChild(makeTask('Wireframe homepage', 2));
            const personal = document.querySelector('section[aria-labelledby="cat-personal"] .todo') || firstList;
            personal.appendChild(makeTask('Gym at 18:00', 3));
            const house = document.querySelector('section[aria-labelledby="cat-house"] .todo') || firstList;
            house.appendChild(makeTask('Buy detergent', 4));
            storage.save(serializeDOM());
            updateAllEmptyStates();
        }
    }

    initAllCheckboxes();

    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
            const state = storage.load();
            if (state) hydrateDOM(state);
        }
    });


    // перетягування
    document.addEventListener('pointerdown', (e) => {
        const handle = e.target.closest(HANDLE);
        const task = handle && handle.closest('.task');
        if (!task) return;
        const card = task.querySelector('.property-1default');
        card.setAttribute('draggable', 'true');
        task.setAttribute(DRAG_FLAG, '1');
    }, true);

    ['pointerup', 'pointercancel', 'blur'].forEach(ev =>
        window.addEventListener(ev, clearFlags, true)
    );

    function clearFlags() {
        document.querySelectorAll('[' + DRAG_FLAG + ']').forEach(t => t.removeAttribute(DRAG_FLAG));
        document.querySelectorAll('.property-1default[draggable]').forEach(c => c.removeAttribute('draggable'));
    }

    document.addEventListener('dragstart', (e) => {
        const task = e.target.closest('.task');
        if (!task || !task.hasAttribute(DRAG_FLAG)) {
            e.preventDefault();
            return;
        }
        task.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        const img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
        e.dataTransfer.setDragImage(img, 0, 0);
    });

    document.addEventListener('dragend', (e) => {
        const task = e.target.closest('.task');
        if (task) task.classList.remove('dragging');
        clearDropHints();
        updateAllEmptyStates();
        storage.save(serializeDOM());
    });

    function addListListeners(list) {
        if (list.dataset.dndInited) return;
        list.dataset.dndInited = '1';

        list.addEventListener('dragover', (e) => {
            e.preventDefault();
            const dragging = document.querySelector('.task.dragging');
            if (!dragging) return;

            const after = getAfterElement(list, e.clientY);
            clearDropHints(list);
            if (after) {
                list.insertBefore(dragging, after);
                after.classList.add('drop-target');
            } else {
                list.appendChild(dragging);
            }
        });

        list.addEventListener('drop', (e) => {
            e.preventDefault();
            clearDropHints(list);
            updateAllEmptyStates();
            storage.save(serializeDOM());
        });

        list.addEventListener('dragleave', () => clearDropHints(list));
    }

    function clearDropHints(scope = document) {
        scope.querySelectorAll('.task.drop-target').forEach(el => el.classList.remove('drop-target'));
    }

    function getAfterElement(container, y) {
        const items = [...container.querySelectorAll('.task:not(.dragging)')];
        return items.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - (box.top + box.height / 2);
            return (offset < 0 && offset > closest.offset)
                ? { offset, element: child }
                : closest;
        }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
    }

    //кнопка done
    function initAllCheckboxes() {
        document.querySelectorAll('.task .frame-child').forEach(applyCheckboxA11y);
    }

    function applyCheckboxA11y(box) {
        if (!box || box.getAttribute('role') === 'checkbox') return;
        box.setAttribute('role', 'checkbox');
        box.setAttribute('aria-checked', 'false');
        box.setAttribute('tabindex', '0');
        box.setAttribute('aria-label', 'Mark task as done');
    }

    // делеговані обробники
    document.addEventListener('click', (e) => {
        const box = e.target.closest('.frame-child');
        const task = box && box.closest('.task');
        if (!task) return;
        toggleDone(task, box);
        storage.save(serializeDOM());
    });

    document.addEventListener('keydown', (e) => {
        const box = e.target.closest?.('.frame-child');
        if (!box) return;
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            const task = box.closest('.task');
            if (task) {
                toggleDone(task, box);
                storage.save(serializeDOM());
            }
        }
    });

    function toggleDone(task, box) {
        const done = task.classList.toggle('done');
        (box || task.querySelector('.frame-child'))?.setAttribute('aria-checked', done ? 'true' : 'false');
    }

    // 4) додавання нової задачі
    const form = document.querySelector('.add-form');
    const input = document.getElementById('new-task');
    if (form && input) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = (input.value || '').trim();
            if (!title) return;
            const list = getTargetList();
            const li = makeTask(title, newId());
            list.appendChild(li);
            input.value = '';
            input.focus();
            updateAllEmptyStates();
            storage.save(serializeDOM());
        });
    }

    function makeTask(title, id) {
        const li = document.createElement('li');
        li.className = 'task';
        li.dataset.id = id;
        li.innerHTML = `
      <div class="property-1default">
        <div class="frame-parent">
          <div class="frame-child"></div>
          <div class="my-first-task"></div>
        </div>
        <div class="rectangle-parent" aria-label="Перетягнути, щоб змінити порядок" role="button" tabindex="0">
          <div class="frame-item"></div><div class="frame-inner"></div>
          <div class="rectangle-div"></div><div class="frame-child1"></div>
          <div class="frame-child2"></div><div class="frame-child3"></div>
        </div>
      </div>`;
        li.querySelector('.my-first-task').textContent = title;
        applyCheckboxA11y(li.querySelector('.frame-child'));
        return li;
    }

    function newId() {
        const ids = [...document.querySelectorAll('.task')].map(li => +li.dataset.id || 0);
        return (ids.length ? Math.max(...ids) : 0) + 1;
    }

    function getTargetList() {
        const fromDefaultSection = document.querySelector(`section[aria-labelledby="${DEFAULT_SECTION_ID}"] .todo`);
        return fromDefaultSection || document.querySelector('.todo');
    }

    //localstorage
    function serializeDOM() {
        const lists = {};
        document.querySelectorAll('section.section').forEach(sec => {
            const catId = sec.getAttribute('aria-labelledby'); // напр. "cat-design"
            const key = (catId || '').replace(/^cat-/, '');    // "design"
            const arr = [...sec.querySelectorAll('.todo > .task')].map((li, i) => ({
                id: li.dataset.id || null,
                title: li.querySelector('.my-first-task')?.textContent?.trim() || '',
                done: li.classList.contains('done'),
                order: i
            }));
            lists[key] = arr;
        });
        return { lists };
    }

    function hydrateDOM(state) {
        if (!state?.lists) return;

        Object.entries(state.lists).forEach(([key, items]) => {
            const ul = document.querySelector(`section[aria-labelledby="cat-${key}"] .todo`);
            if (!ul) return;
            ul.innerHTML = '';
            items
                .slice()
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .forEach(t => {
                    const li = makeTask(t.title, t.id || newId());
                    if (t.done) {
                        li.classList.add('done');
                        li.querySelector('.frame-child')?.setAttribute('aria-checked', 'true');
                    }
                    ul.appendChild(li);
                });
            addListListeners(ul);
        });

        updateAllEmptyStates();
    }

    function updateEmptyState(list) {
        list.classList.toggle('empty', !list.querySelector('.task'));
    }
    function updateAllEmptyStates() {
        document.querySelectorAll('.todo').forEach(updateEmptyState);
    }
})();
