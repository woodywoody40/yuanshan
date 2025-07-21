// --- CONSTANTS ---
// The SheetDB URL is now securely stored on the backend.
const HEAR_ABOUT_US_OPTIONS = [
    { value: 'friend_family', label: '親友介紹' },
    { value: 'social_media', label: '網站 / 社群媒體' },
    { value: 'passing_by', label: '路過' },
    { value: 'event', label: '教會活動' },
    { value: 'other', label: '其他' },
];

// --- HELPER FUNCTIONS ---
const showAlert = (elementId, message, type = 'error') => {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.classList.remove('hidden');
        
        // 根據類型設定樣式
        el.className = el.className.replace(/bg-\w+-\d+/g, '');
        el.className = el.className.replace(/border-\w+-\d+/g, '');
        el.className = el.className.replace(/text-\w+-\d+/g, '');
        
        switch (type) {
            case 'success':
                el.classList.add('bg-green-50', 'border-green-400', 'text-green-700');
                break;
            case 'warning':
                el.classList.add('bg-yellow-50', 'border-yellow-400', 'text-yellow-700');
                break;
            case 'info':
                el.classList.add('bg-blue-50', 'border-blue-400', 'text-blue-700');
                break;
            default: // error
                el.classList.add('bg-red-50', 'border-red-400', 'text-red-700');
        }
    }
};

const hideAlert = (elementId) => {
    const el = document.getElementById(elementId);
    if (el) el.classList.add('hidden');
};

const toggleButtonLoader = (button, isLoading, loaderText = '處理中...') => {
    if (!button) return;
    const btnText = button.querySelector('.btn-text');
    const btnLoader = button.querySelector('.btn-loader');
    
    if (!btnText || !btnLoader) return;

    const loaderTextSpan = btnLoader.querySelector('span');

    button.disabled = isLoading;
    if (isLoading) {
        btnText.classList.add('hidden');
        btnLoader.classList.remove('hidden');
        if (loaderTextSpan) loaderTextSpan.textContent = loaderText;
    } else {
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
    }
};

const populateHearAboutUsSelect = (selectElement) => {
    if (!selectElement) return;
    selectElement.innerHTML = ''; // Clear existing options
    HEAR_ABOUT_US_OPTIONS.forEach(option => {
        const optionEl = document.createElement('option');
        optionEl.value = option.value;
        optionEl.textContent = option.label;
        selectElement.appendChild(optionEl);
    });
};

// --- API SERVICE FUNCTIONS ---
// All API calls now go through our secure backend proxy.
async function apiFetch(url, options = {}) {
    // Ensure headers object exists and set Content-Type if a body is present
    if (options.body) {
        options.headers = options.headers || {};
        options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/json';
    }

    const response = await fetch(url, options);
    const responseText = await response.text().catch(() => ''); // Read body once

    if (!response.ok) {
        if (response.status === 401) {
            alert('您的登入已逾時，請重新登入。');
            window.location.href = '/admin.html';
            return; // Stop execution
        }
        
        let errorBody;
        try {
            errorBody = JSON.parse(responseText);
        } catch (e) {
            errorBody = { error: responseText || `請求失敗，狀態碼: ${response.status}` };
        }
        
        const errorMessage = errorBody.error || errorBody.message || `請求失敗，狀態碼：${response.status}`;
        console.error(`API call failed: ${response.status}`, errorBody);
        throw new Error(errorMessage);
    }
    
    if (responseText) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            try {
                return JSON.parse(responseText);
            } catch (e) {
                console.error('Failed to parse successful JSON response:', e, responseText);
                return {}; 
            }
        }
    }

    return {}; // Return empty object for successful non-json or empty responses
}


const getVisitors = () => apiFetch('/api/visitors');
const addVisitorToDB = (visitor) => apiFetch('/api/visitors', { method: 'POST', body: JSON.stringify(visitor) });
const updateVisitorInDB = (visitor) => apiFetch('/api/visitors', { method: 'PUT', body: JSON.stringify(visitor) });
const deleteVisitorFromDB = async (id) => {
    const response = await fetch(`/api/visitors?id=${encodeURIComponent(id)}`, { 
        method: 'DELETE',
        credentials: 'include'
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
    }
    
    return await response.json();
};

// --- PAGE INITIALIZERS ---

/**
 * Logic for the admin login page (admin.html)
 */
function initAdminLoginPage() {
    const loginForm = document.getElementById('login-form');
    const errorDiv = document.getElementById('login-error');

    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const loginBtn = document.getElementById('login-btn');
        hideAlert('login-error');
        toggleButtonLoader(loginBtn, true, '登入中...');

        const password = loginForm.elements.password.value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password }),
            });

            if (!response.ok) {
                const errorText = await response.text().catch(()=>'');
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    errorData = { error: errorText || `伺服器回傳了非預期的錯誤 (狀態碼 ${response.status})。` };
                }
                throw new Error(errorData.error || `請求失敗，狀態碼：${response.status}`);
            }

            window.location.href = '/admin/dashboard.html';
        } catch (err) {
            console.error('Login failed:', err);
            showAlert(errorDiv.id, `登入失敗：${err.message}`);
            toggleButtonLoader(loginBtn, false);
        }
    });
}

/**
 * Logic for the main visitor form page (index.html)
 */
function initMainPage() {
    const mainForm = document.getElementById('main-form');
    const howDidYouHearSelect = document.getElementById('howDidYouHear');
    const howDidYouHearOtherInput = document.getElementById('howDidYouHearOther');
    
    populateHearAboutUsSelect(howDidYouHearSelect);

    howDidYouHearSelect.addEventListener('change', (e) => {
        howDidYouHearOtherInput.classList.toggle('hidden', e.target.value !== 'other');
    });

    document.getElementById('go-to-admin-btn-1').addEventListener('click', () => {
        window.location.href = '/admin.html';
    });

    mainForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const button = document.getElementById('submit-main-form');
        
        if (!mainForm.elements['name'].value.trim()) {
            showAlert('form-error', '姓名為必填欄位。');
            return;
        }

        hideAlert('form-error');
        toggleButtonLoader(button, true);

        const formData = new FormData(mainForm);
        const newVisitor = Object.fromEntries(formData.entries());
        newVisitor.id = new Date().toISOString();

        try {
            await addVisitorToDB(newVisitor);
            localStorage.setItem('visitorName', newVisitor.name);
            window.location.href = '/success.html';
        } catch (err) {
            console.error('Submission error:', err);
            showAlert('form-error', `提交失敗，請稍後再試。 ${err.message}`);
            toggleButtonLoader(button, false);
        }
    });
}

/**
 * Logic for the success page (success.html)
 */
function initSuccessPage() {
    const visitorName = localStorage.getItem('visitorName');
    const welcomeEl = document.getElementById('welcome-message');

    if (visitorName) {
        welcomeEl.textContent = `親愛的 ${visitorName}，非常歡迎您來到我們當中！願您在這裡找到平安與喜樂。`;
        localStorage.removeItem('visitorName');
    } else {
        welcomeEl.textContent = "感謝您的留名，願您有美好的一天！";
    }
    
    document.getElementById('go-to-admin-btn-2').addEventListener('click', () => {
        window.location.href = '/admin.html';
    });
    document.getElementById('add-another-btn').addEventListener('click', () => {
        window.location.href = '/index.html';
    });
}

/**
 * Logic for the new admin dashboard page (/admin/dashboard.html)
 */
function initDashboardPage() {
    // --- DOM ELEMENTS ---
    const visitorListTable = document.getElementById('visitor-list-table');
    const visitorListBody = visitorListTable.querySelector('tbody');
    const visitorListLoader = document.getElementById('visitor-list-loader');
    const visitorListEmpty = document.getElementById('visitor-list-empty');
    const searchInput = document.getElementById('visitor-search-input');
    
    // Modal elements
    const adminFormModal = document.getElementById('admin-form-modal');
    const adminForm = document.getElementById('admin-form');
    const adminHowDidYouHearSelect = document.getElementById('admin-howDidYouHear');
    const adminHowDidYouHearOtherInput = document.getElementById('admin-howDidYouHearOther');

    // --- STATE ---
    let allVisitors = [];
    let searchQuery = '';
    let currentModalMode = 'add';
    
    // --- RENDER FUNCTION ---
    const renderVisitorList = () => {
        visitorListLoader.style.display = 'none';
        visitorListTable.style.display = 'table';

        const filteredVisitors = allVisitors.filter(v => 
            v && v.name && (
                v.name.toLowerCase().includes(searchQuery) ||
                (v.email && v.email.toLowerCase().includes(searchQuery))
            )
        );

        if (filteredVisitors.length === 0) {
            visitorListEmpty.classList.remove('hidden');
            visitorListBody.innerHTML = '';
        } else {
            visitorListEmpty.classList.add('hidden');
            visitorListBody.innerHTML = filteredVisitors.slice().reverse().map(visitor => `
                <tr class="hover:bg-gray-50 transition-colors duration-150">
                    <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${visitor.name || ''}</td>
                    <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>${visitor.phone || ''}</div>
                        <div>${visitor.email || ''}</div>
                    </td>
                    <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">${visitor.isFirstVisit === 'yes' ? '是' : '否'}</td>
                    <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${visitor.wantsContact === 'yes' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                          ${visitor.wantsContact === 'yes' ? '是' : '否'}
                        </span>
                    </td>
                    <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500" title="${visitor.prayerRequest || ''}">${(visitor.prayerRequest || '無').substring(0, 20)}${ (visitor.prayerRequest || '').length > 20 ? '...' : '' }</td>
                    <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        ${visitor.id ? `
                            <button data-action="edit" data-id="${visitor.id}" class="text-indigo-600 hover:text-indigo-900" aria-label="編輯">編輯</button>
                            <button data-action="delete" data-id="${visitor.id}" class="text-red-600 hover:text-red-900" aria-label="刪除">刪除</button>
                        ` : `
                            <span class="text-gray-400 text-xs">無 ID (無法編輯)</span>
                        `}
                    </td>
                </tr>
            `).join('');
        }
    };

    // --- MODAL HANDLING ---
    const closeModal = () => adminFormModal.classList.remove('is-open');
    const openModal = (mode, visitor = null) => {
        currentModalMode = mode;
        hideAlert('modal-error');
        const title = adminFormModal.querySelector('#modal-title');
        adminForm.reset();
        
        // Always populate select options
        populateHearAboutUsSelect(adminHowDidYouHearSelect);

        if (mode === 'add') {
            title.textContent = '新增留名紀錄';
            adminForm.elements['id'].value = new Date().toISOString(); // Pre-fill new ID
            adminHowDidYouHearOtherInput.classList.add('hidden');
            adminForm.querySelector('input[name="isFirstVisit"][value="yes"]').checked = true;
            adminForm.querySelector('input[name="wantsContact"][value="no"]').checked = true;
        } else {
            title.textContent = '編輯留名紀錄';
            const formElements = adminForm.elements;
            formElements['id'].value = visitor.id;
            formElements['name'].value = visitor.name || '';
            formElements['phone'].value = visitor.phone || '';
            formElements['email'].value = visitor.email || '';
            formElements['howDidYouHear'].value = visitor.howDidYouHear || 'friend_family';
            formElements['howDidYouHearOther'].value = visitor.howDidYouHearOther || '';
            adminHowDidYouHearOtherInput.classList.toggle('hidden', visitor.howDidYouHear !== 'other');
            formElements['prayerRequest'].value = visitor.prayerRequest || '';
            
            adminForm.querySelector(`input[name="isFirstVisit"][value="${visitor.isFirstVisit || 'yes'}"]`).checked = true;
            adminForm.querySelector(`input[name="wantsContact"][value="${visitor.wantsContact || 'no'}"]`).checked = true;
        }
        adminFormModal.classList.add('is-open');
    };
    
    // --- DATA HANDLING ---
    const refreshVisitorList = async () => {
        hideAlert('list-error');
        visitorListLoader.style.display = 'block';
        visitorListTable.style.display = 'none';
        visitorListEmpty.classList.add('hidden');

        try {
            allVisitors = await getVisitors();
            console.log('Loaded visitors:', allVisitors); // 除錯日誌
            renderVisitorList();
        } catch (err) {
            console.error('Error loading visitors:', err);
            showAlert('list-error', `無法讀取訪客紀錄：${err.message}`);
            visitorListLoader.style.display = 'none';
        }
    };

    // --- EVENT LISTENERS ---
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderVisitorList();
    });

    document.getElementById('add-visitor-btn').addEventListener('click', () => openModal('add'));
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
    adminFormModal.addEventListener('click', (e) => { if (e.target === adminFormModal) closeModal(); });
    
    adminHowDidYouHearSelect.addEventListener('change', (e) => {
        adminHowDidYouHearOtherInput.classList.toggle('hidden', e.target.value !== 'other');
    });

    adminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const button = document.getElementById('modal-save-btn');
        if (!adminForm.elements['name'].value.trim()) {
            showAlert('modal-error', '姓名為必填欄位。');
            return;
        }
        hideAlert('modal-error');
        toggleButtonLoader(button, true);

        const formData = new FormData(adminForm);
        const visitorData = Object.fromEntries(formData.entries());

        try {
            if (currentModalMode === 'edit') {
                await updateVisitorInDB(visitorData);
            } else {
                await addVisitorToDB(visitorData);
            }
            closeModal();
            await refreshVisitorList();
        } catch (err) {
            showAlert('modal-error', `儲存失敗：${err.message}`);
        } finally {
            toggleButtonLoader(button, false);
        }
    });

    visitorListBody.addEventListener('click', async (e) => {
        const button = e.target.closest('button[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;
        const visitor = allVisitors.find(v => v && v.id === id);
        
        // 檢查是否有有效的 ID
        if (!id || id === '') {
            alert('此記錄沒有有效的 ID，無法進行編輯或刪除操作。');
            return;
        }

        if (action === 'edit' && visitor) {
            openModal('edit', visitor);
        } else if (action === 'delete' && visitor) {
            if (confirm(`您確定要刪除「${visitor.name}」的紀錄嗎？此操作無法復原。`)) {
                button.disabled = true;
                button.textContent = '刪除中...';
                
                try {
                    // 立即從本地數據中移除記錄（樂觀更新）
                    console.log('開始刪除記錄:', visitor.name, 'ID:', id);
                    
                    // 立即更新本地數據
                    allVisitors = allVisitors.filter(v => v.id !== id);
                    console.log('本地數據已更新，剩餘記錄數:', allVisitors.length);
                    
                    // 立即重新渲染列表
                    renderVisitorList();
                    console.log('UI 已重新渲染');
                    
                    // 顯示刪除中訊息
                    showAlert('list-error', '🗑️ 正在刪除記錄...', 'info');
                    
                    // 在背景執行實際的刪除操作
                    deleteVisitorFromDB(id).then(result => {
                        console.log('刪除操作完成:', result);
                        
                        // 檢查刪除結果類型並顯示訊息
                        let message = '✅ 記錄已成功刪除';
                        if (result && result.method) {
                            switch (result.method) {
                                case 'hard_delete':
                                    message = '✅ 記錄已成功刪除';
                                    break;
                                case 'soft_delete':
                                    message = '✅ 記錄已標記為刪除';
                                    break;
                                case 'simulated_delete':
                                    message = '⚠️ 刪除操作已記錄，請手動從 Google Sheets 中移除此記錄';
                                    break;
                            }
                        }
                        
                        // 顯示成功訊息
                        showAlert('list-error', message, 'success');
                        
                        // 3秒後自動隱藏訊息
                        setTimeout(() => {
                            hideAlert('list-error');
                        }, 3000);
                        
                    }).catch(err => {
                        console.error('刪除操作失敗:', err);
                        
                        // 如果刪除失敗，恢復記錄到本地數據
                        allVisitors.push(visitor);
                        allVisitors.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
                        renderVisitorList();
                        
                        showAlert('list-error', `刪除失敗：${err.message}`);
                    });
                    
                } catch(err) {
                    console.error('刪除操作異常:', err);
                    showAlert('list-error', `刪除失敗：${err.message}`);
                    button.disabled = false;
                    button.textContent = '刪除';
                }
            }
        }
    });

    // --- INITIALIZATION ---
    refreshVisitorList();
}


// --- ROUTING ---
document.addEventListener('DOMContentLoaded', () => {
    // Robust routing based on unique element IDs on each page
    if (document.getElementById('form-view')) {
        initMainPage();
    } else if (document.getElementById('success-view')) {
        initSuccessPage();
    } else if (document.getElementById('visitor-list-view')) {
        initDashboardPage();
    } else if (document.getElementById('admin-login-view')) {
        initAdminLoginPage();
    }
});