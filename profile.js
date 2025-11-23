// === profile.js ===
// Логика выбора аватара, редактирования профиля и отображения

const AVATAR_EMOJIS = ['😎', '🦁', '👽', '🦄', '🤖', '👻', '🐼', '🐸', '💀', '🔥'];
let tempSelectedAvatar = null;

// 1. Генерация сетки эмодзи
function initAvatarGrid() {
    const grid = document.getElementById('avatar-grid');
    if (!grid) return;
    
    grid.innerHTML = ''; // Очистка

    AVATAR_EMOJIS.forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = `w-full aspect-square rounded-xl bg-slate-700 flex items-center justify-center text-2xl hover:bg-slate-600 transition active:scale-90 border-2 border-transparent avatar-option`;
        btn.innerHTML = emoji;
        btn.onclick = () => selectAvatar(emoji, btn);
        grid.appendChild(btn);
    });
}

// 2. Логика выбора (клик по эмодзи или кнопке фото)
function selectAvatar(value, btnElement = null) {
    if (value === 'tg_photo') {
        // Берем фото из телеграма
        const user = window.Telegram.WebApp.initDataUnsafe?.user;
        tempSelectedAvatar = user?.photo_url || null;
    } else {
        tempSelectedAvatar = value;
    }

    // Снимаем выделение со всех
    document.querySelectorAll('.avatar-option').forEach(el => {
        el.classList.remove('border-yellow-400', 'bg-slate-800');
        el.classList.add('border-transparent');
    });

    const btnRestore = document.getElementById('btn-restore-photo');

    if (btnElement) {
        // Выделяем выбранный эмодзи
        btnElement.classList.remove('border-transparent');
        btnElement.classList.add('border-yellow-400', 'bg-slate-800');
        // Снимаем выделение с кнопки фото
        if(btnRestore) btnRestore.classList.remove('border-yellow-400', 'text-yellow-400');
    } else if (value === 'tg_photo') {
        // Выделяем кнопку "Вернуть фото"
        if(btnRestore) btnRestore.classList.add('border-yellow-400', 'text-yellow-400');
    }
    
    if (window.Telegram.WebApp.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.selectionChanged();
    }
}

// 3. Открытие/Закрытие модального окна
function toggleEditModal(show) {
    const modal = document.getElementById('edit-modal');
    const content = document.getElementById('edit-modal-content');
    
    if(show) {
        // Заполняем имя текущим значением
        const currentName = document.getElementById('profile-name').innerText;
        const inputName = document.getElementById('input-edit-name');
        if(inputName) inputName.value = currentName;

        initAvatarGrid(); // Рисуем сетку
        
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            content.classList.remove('scale-95');
            content.classList.add('scale-100');
        }, 10);
    } else {
        modal.classList.add('opacity-0');
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 200);
    }
}

// 4. Глобальная отрисовка аватара (в хедере и профиле)
function renderAvatarGlobal(urlOrEmoji) {
    // Дефолт, если ничего нет
    if (!urlOrEmoji) urlOrEmoji = '😎';

    // Проверяем, ссылка это или эмодзи (ссылка длинная и содержит http)
    const isUrl = urlOrEmoji.length > 10 && (urlOrEmoji.includes('http') || urlOrEmoji.includes('tg_file'));

    // --- А. Обновляем аватар в HEADER ---
    const headerAvatarImg = document.getElementById('user-avatar');
    const headerAvatarFallback = document.getElementById('user-avatar-fallback');
    
    if (headerAvatarImg && headerAvatarFallback) {
        if (isUrl) {
            headerAvatarImg.src = urlOrEmoji;
            headerAvatarImg.classList.remove('hidden');
            headerAvatarFallback.classList.add('hidden');
        } else {
            headerAvatarImg.classList.add('hidden');
            headerAvatarFallback.innerText = urlOrEmoji;
            headerAvatarFallback.classList.remove('hidden');
            headerAvatarFallback.style.fontSize = "1.2rem";
        }
    }

    // --- Б. Обновляем большой аватар в PROFILE ---
    const profImg = document.getElementById('profile-avatar-big');
    if (profImg) {
        const parent = profImg.parentElement;
        
        if (isUrl) {
            profImg.src = urlOrEmoji;
            profImg.classList.remove('hidden');
            // Удаляем слой с эмодзи, если он был
            const oldEmoji = parent.querySelector('.emoji-avatar-div');
            if(oldEmoji) oldEmoji.remove();
        } else {
            profImg.classList.add('hidden');
            
            // Проверяем, создан ли уже div для эмодзи
            let emojiDiv = parent.querySelector('.emoji-avatar-div');
            if (!emojiDiv) {
                emojiDiv = document.createElement('div');
                emojiDiv.className = 'emoji-avatar-div w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-5xl select-none cursor-pointer';
                // Вставляем перед картинкой
                parent.insertBefore(emojiDiv, profImg);
            }
            emojiDiv.innerText = urlOrEmoji;
        }
    }
}

// 5. Сохранение изменений
async function saveProfileChanges() {
    const nameInput = document.getElementById('input-edit-name');
    let newName = nameInput.value.trim();
    
    if (!newName) return window.Telegram.WebApp.showAlert("Имя не может быть пустым!");
    if (newName.length > 12) return window.Telegram.WebApp.showAlert("Максимум 12 символов!");

    // Обновляем UI имени
    const nameEl1 = document.getElementById('username');
    const nameEl2 = document.getElementById('profile-name');
    if(nameEl1) nameEl1.innerText = newName;
    if(nameEl2) nameEl2.innerText = newName;
    
    // Формируем данные для отправки
    let updateData = { username: newName };

    // Если выбрали новый аватар
    if (tempSelectedAvatar) {
        updateData.avatar_url = tempSelectedAvatar;
        renderAvatarGlobal(tempSelectedAvatar); // Обновляем визуал сразу
    }

    toggleEditModal(false);

    // Сохраняем в Supabase (используем глобальные переменные sb и currentUserTgId из main файла)
    if (typeof sb !== 'undefined' && typeof currentUserTgId !== 'undefined' && currentUserTgId) {
        const { error } = await sb
            .from('players')
            .update(updateData)
            .eq('tg_id', currentUserTgId);
            
        if (!error && window.Telegram.WebApp.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
    }
}