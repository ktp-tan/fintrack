// ============================================
// EXPENSE TRACKER PRO - Full Featured App
// ============================================

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyDEXwayAQivp-F7ZwXII1MMVz_w9XtSfcM",
    authDomain: "record-income-outcome.firebaseapp.com",
    databaseURL: "https://record-income-outcome-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "record-income-outcome",
    storageBucket: "record-income-outcome.firebasestorage.app",
    messagingSenderId: "852602417717",
    appId: "1:852602417717:web:dca79780db3bb796ebf77c",
    measurementId: "G-FFSVQKSMD7"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ============================================
// STATE & CONSTANTS
// ============================================

let userId = localStorage.getItem('expense_tracker_uid');
if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('expense_tracker_uid', userId);
}

let currentDate = new Date();
let currentYear = new Date().getFullYear();
let allTransactions = [];
let allBudgets = [];
let customCategories = { expense: [], income: [] };

const DEFAULT_CATEGORIES = {
    expense: [
        { id: 'food', name: 'อาหาร', icon: 'fa-utensils' },
        { id: 'transport', name: 'เดินทาง', icon: 'fa-car' },
        { id: 'shopping', name: 'ช้อปปิ้ง', icon: 'fa-bag-shopping' },
        { id: 'entertainment', name: 'บันเทิง', icon: 'fa-film' },
        { id: 'bill', name: 'บิล/ค่าน้ำไฟ', icon: 'fa-file-invoice-dollar' },
        { id: 'health', name: 'สุขภาพ', icon: 'fa-heart-pulse' },
        { id: 'education', name: 'การศึกษา', icon: 'fa-graduation-cap' },
        { id: 'other', name: 'อื่นๆ', icon: 'fa-ellipsis' }
    ],
    income: [
        { id: 'salary', name: 'เงินเดือน', icon: 'fa-money-bill-wave' },
        { id: 'bonus', name: 'โบนัส', icon: 'fa-gift' },
        { id: 'freelance', name: 'ฟรีแลนซ์', icon: 'fa-laptop-code' },
        { id: 'investment', name: 'ลงทุน', icon: 'fa-chart-line' },
        { id: 'other_in', name: 'อื่นๆ', icon: 'fa-plus-circle' }
    ]
};

const ICON_OPTIONS = [
    'fa-utensils', 'fa-car', 'fa-bus', 'fa-train', 'fa-plane',
    'fa-bag-shopping', 'fa-cart-shopping', 'fa-store', 'fa-film', 'fa-gamepad',
    'fa-music', 'fa-tv', 'fa-file-invoice-dollar', 'fa-bolt', 'fa-droplet',
    'fa-wifi', 'fa-phone', 'fa-heart-pulse', 'fa-pills', 'fa-hospital',
    'fa-graduation-cap', 'fa-book', 'fa-laptop-code', 'fa-home', 'fa-wrench',
    'fa-gift', 'fa-baby', 'fa-dog', 'fa-dumbbell', 'fa-coffee',
    'fa-beer-mug-empty', 'fa-money-bill-wave', 'fa-coins', 'fa-chart-line', 'fa-piggy-bank',
    'fa-briefcase', 'fa-building', 'fa-tag', 'fa-ellipsis', 'fa-plus-circle'
];

// Chart instances
let expenseChart = null;
let budgetBarChart = null;
let yearlyChart = null;

// ============================================
// DOM ELEMENTS
// ============================================

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    console.log('App initializing...');
    loadTheme();
    setupEventListeners();
    fetchData();
    updateDateDisplay();
    document.getElementById('userIdDisplay').textContent = userId;
    document.getElementById('date').valueAsDate = new Date();
    updateYear();
    console.log('App initialized successfully!');
});

function loadTheme() {
    const dark = localStorage.getItem('darkMode') === 'true';
    if (dark) {
        document.body.classList.add('dark-mode');
        $('#darkModeSwitch').checked = true;
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Tab Navigation
    $$('.nav-item, .mobile-nav-item[data-tab]').forEach(function (item) {
        item.addEventListener('click', function () {
            const tab = this.dataset.tab;
            if (tab) switchTab(tab);
        });
    });

    // Links with data-goto
    $$('[data-goto]').forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            switchTab(this.dataset.goto);
        });
    });

    // Mobile menu toggle
    $('#menuToggle').addEventListener('click', function () {
        $('.sidebar').classList.toggle('open');
    });

    // Close sidebar on outside click (mobile)
    document.addEventListener('click', function (e) {
        if (window.innerWidth <= 768) {
            const sidebar = $('.sidebar');
            const menuBtn = $('#menuToggle');
            if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });

    // Add Transaction buttons
    $('#addBtn').addEventListener('click', function () {
        openTransactionModal();
    });

    $('#mobileAddBtn').addEventListener('click', function () {
        openTransactionModal();
    });

    // Transaction type toggle
    $$('input[name="type"]').forEach(function (radio) {
        radio.addEventListener('change', function (e) {
            renderCategories(e.target.value);
            $('#selectedCategory').value = '';
        });
    });

    // Transaction form
    $('#transactionForm').addEventListener('submit', handleTransactionSubmit);

    // Delete transaction button
    $('#deleteTransactionBtn').addEventListener('click', function () {
        confirmDeleteTransaction();
    });

    // Date navigation
    $('#prevMonth').addEventListener('click', function () { changeMonth(-1); });
    $('#nextMonth').addEventListener('click', function () { changeMonth(1); });

    // Search & Filter
    $('#searchInput').addEventListener('input', debounce(renderFullTransactionList, 300));
    $('#filterType').addEventListener('change', renderFullTransactionList);
    $('#filterCategory').addEventListener('change', renderFullTransactionList);

    // Export CSV
    $('#exportCsv').addEventListener('click', exportToCSV);

    // Dark mode
    $('#darkModeToggle').addEventListener('click', toggleDarkMode);
    $('#darkModeSwitch').addEventListener('change', toggleDarkMode);

    // Year navigation
    $('#prevYear').addEventListener('click', function () { currentYear--; updateYear(); });
    $('#nextYear').addEventListener('click', function () { currentYear++; updateYear(); });

    // Budget
    $('#addBudgetBtn').addEventListener('click', function () { openBudgetModal(); });
    $('#budgetForm').addEventListener('submit', handleBudgetSubmit);

    // Delete budget button
    $('#deleteBudgetBtn').addEventListener('click', function () {
        confirmDeleteBudget();
    });

    // Category
    $('#addCategoryBtn').addEventListener('click', function () { openCategoryModal(); });
    $('#categoryForm').addEventListener('submit', handleCategorySubmit);

    // Export all
    $('#exportAllBtn').addEventListener('click', exportAllData);

    // Multi-device sync
    $('#copyUserIdBtn').addEventListener('click', copyUserId);
    $('#setUserIdBtn').addEventListener('click', setCustomUserId);

    // Close modals on backdrop click
    $$('.modal').forEach(function (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeAllModals();
        });
    });
}

// ============================================
// TAB NAVIGATION
// ============================================

function switchTab(tabName) {
    // Update nav items
    $$('.nav-item').forEach(function (item) {
        item.classList.toggle('active', item.dataset.tab === tabName);
    });
    $$('.mobile-nav-item[data-tab]').forEach(function (item) {
        item.classList.toggle('active', item.dataset.tab === tabName);
    });

    // Update tab content
    $$('.tab-content').forEach(function (tab) {
        tab.classList.toggle('active', tab.id === 'tab-' + tabName);
    });

    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        transactions: 'รายการทั้งหมด',
        budget: 'งบประมาณ',
        reports: 'รายงาน',
        settings: 'ตั้งค่า'
    };
    $('#pageTitle').textContent = titles[tabName] || tabName;

    // Close mobile sidebar
    $('.sidebar').classList.remove('open');

    // Refresh charts if needed
    if (tabName === 'dashboard') {
        setTimeout(function () {
            renderExpenseChart();
            renderBudgetOverview();
        }, 100);
    } else if (tabName === 'budget') {
        renderBudgetList();
        renderBudgetBarChart();
    } else if (tabName === 'reports') {
        renderYearlyChart();
        renderMonthlyGrid();
    }
}

// ============================================
// DATA FETCHING
// ============================================

function fetchData() {
    // Transactions
    db.ref('users/' + userId + '/transactions').on('value', function (snapshot) {
        const data = snapshot.val();
        allTransactions = [];
        if (data) {
            Object.keys(data).forEach(function (key) {
                allTransactions.push({ id: key, ...data[key] });
            });
        }
        renderAll();
    }, function (error) {
        console.error('Firebase error:', error);
        showToast('ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาตรวจสอบ Firebase Rules');
    });

    // Budgets
    db.ref('users/' + userId + '/budgets').on('value', function (snapshot) {
        const data = snapshot.val();
        allBudgets = [];
        if (data) {
            Object.keys(data).forEach(function (key) {
                allBudgets.push({ id: key, ...data[key] });
            });
        }
        renderBudgetOverview();
        renderBudgetList();
    });

    // Custom Categories
    db.ref('users/' + userId + '/categories').on('value', function (snapshot) {
        const data = snapshot.val();
        customCategories = { expense: [], income: [] };
        if (data) {
            Object.keys(data).forEach(function (key) {
                const cat = { id: key, ...data[key] };
                if (customCategories[cat.type]) {
                    customCategories[cat.type].push(cat);
                }
            });
        }
        populateFilterCategories();
        renderCustomCategoriesList();
    });
}

function renderAll() {
    renderDashboard();
    renderFullTransactionList();
    renderBudgetOverview();
    populateFilterCategories();
}

// ============================================
// DASHBOARD
// ============================================

function renderDashboard() {
    const filtered = getFilteredByMonth(allTransactions, currentDate);

    let totalIncome = 0;
    let totalExpense = 0;

    filtered.forEach(function (t) {
        if (t.type === 'income') totalIncome += t.amount;
        else totalExpense += t.amount;
    });

    $('#totalBalance').textContent = formatCurrency(totalIncome - totalExpense);
    $('#totalIncome').textContent = formatCurrency(totalIncome);
    $('#totalExpense').textContent = formatCurrency(totalExpense);

    // Recent transactions (last 5)
    const sorted = filtered.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    const recent = sorted.slice(0, 5);
    renderTransactionListTo('#recentTransactions', recent);

    // Expense chart
    renderExpenseChart(filtered.filter(function (t) { return t.type === 'expense'; }));
}

function renderExpenseChart(expenses) {
    if (!expenses) {
        expenses = getFilteredByMonth(allTransactions, currentDate).filter(function (t) { return t.type === 'expense'; });
    }

    // Group by category
    const byCategory = {};
    expenses.forEach(function (t) {
        const cat = getCategoryInfo(t.type, t.categoryId);
        byCategory[cat.name] = (byCategory[cat.name] || 0) + t.amount;
    });

    const labels = Object.keys(byCategory);
    const data = Object.values(byCategory);
    const colors = generateColors(labels.length);

    const ctx = document.getElementById('expenseChart');
    if (!ctx) return;

    if (expenseChart) expenseChart.destroy();

    if (labels.length === 0) {
        ctx.style.display = 'none';
        $('#chartLegend').innerHTML = '<p class="empty-text">ยังไม่มีข้อมูล</p>';
        return;
    }

    ctx.style.display = 'block';
    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: { display: false }
            }
        }
    });

    // Custom legend
    let legendHTML = '';
    labels.forEach(function (label, i) {
        legendHTML += '<div class="legend-item"><span class="legend-color" style="background: ' + colors[i] + '"></span><span>' + label + '</span></div>';
    });
    $('#chartLegend').innerHTML = legendHTML;
}

// ============================================
// TRANSACTION LIST
// ============================================

function renderTransactionListTo(containerSel, transactions) {
    const container = $(containerSel);
    if (!container) return;

    if (transactions.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>ยังไม่มีรายการ</p></div>';
        return;
    }

    // Group by date
    const grouped = {};
    transactions.forEach(function (t) {
        if (!grouped[t.date]) grouped[t.date] = [];
        grouped[t.date].push(t);
    });

    let html = '';
    Object.keys(grouped).sort(function (a, b) { return new Date(b) - new Date(a); }).forEach(function (dateStr) {
        html += '<div class="transaction-group-date">' + formatDateLabel(dateStr) + '</div>';
        grouped[dateStr].forEach(function (t) {
            const cat = getCategoryInfo(t.type, t.categoryId);
            html += '<div class="transaction-item" data-id="' + t.id + '">' +
                '<div class="t-left">' +
                '<div class="t-icon"><i class="fas ' + cat.icon + '"></i></div>' +
                '<div class="t-details">' +
                '<h4>' + cat.name + '</h4>' +
                '<p>' + (t.note || '') + '</p>' +
                '</div>' +
                '</div>' +
                '<div class="t-amount ' + (t.type === 'income' ? 'amount-income' : 'amount-expense') + '">' +
                (t.type === 'income' ? '+' : '-') + formatNumber(t.amount) +
                '</div>' +
                '</div>';
        });
    });

    container.innerHTML = html;

    // Click to edit
    container.querySelectorAll('.transaction-item').forEach(function (item) {
        item.addEventListener('click', function () {
            openTransactionModal(this.dataset.id);
        });
    });
}

function renderFullTransactionList() {
    const search = ($('#searchInput').value || '').toLowerCase();
    const typeFilter = $('#filterType').value;
    const catFilter = $('#filterCategory').value;

    let filtered = getFilteredByMonth(allTransactions, currentDate);

    // Apply filters
    if (typeFilter !== 'all') {
        filtered = filtered.filter(function (t) { return t.type === typeFilter; });
    }
    if (catFilter !== 'all') {
        filtered = filtered.filter(function (t) { return t.categoryId === catFilter; });
    }
    if (search) {
        filtered = filtered.filter(function (t) {
            const cat = getCategoryInfo(t.type, t.categoryId);
            return (t.note && t.note.toLowerCase().includes(search)) || cat.name.toLowerCase().includes(search);
        });
    }

    filtered.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    renderTransactionListTo('#transactionList', filtered);
}

// ============================================
// TRANSACTION MODAL
// ============================================

function openTransactionModal(transactionId) {
    const modal = $('#transactionModal');
    const form = $('#transactionForm');
    form.reset();

    if (transactionId) {
        const t = allTransactions.find(function (x) { return x.id === transactionId; });
        if (t) {
            $('#modalTitle').textContent = 'แก้ไขรายการ';
            $('#editTransactionId').value = t.id;
            document.getElementById('type' + capitalize(t.type)).checked = true;
            $('#amount').value = t.amount;
            $('#date').value = t.date;
            $('#note').value = t.note || '';
            renderCategories(t.type);
            setTimeout(function () { selectCategory(t.categoryId); }, 50);
            $('#deleteTransactionBtn').classList.remove('hidden');
        }
    } else {
        $('#modalTitle').textContent = 'เพิ่มรายการใหม่';
        $('#editTransactionId').value = '';
        $('#date').valueAsDate = new Date();
        // Reset to expense type by default
        document.getElementById('typeExpense').checked = true;
        document.getElementById('typeIncome').checked = false;
        renderCategories('expense');
        $('#deleteTransactionBtn').classList.add('hidden');
    }

    modal.classList.add('show');
}

function renderCategories(type) {
    const grid = $('#categoryGrid');
    const allCats = DEFAULT_CATEGORIES[type].concat(customCategories[type] || []);

    grid.innerHTML = allCats.map(function (cat) {
        return '<div class="cat-item" data-id="' + cat.id + '">' +
            '<i class="fas ' + cat.icon + ' cat-icon"></i>' +
            '<span class="cat-name">' + cat.name + '</span>' +
            '</div>';
    }).join('');

    grid.querySelectorAll('.cat-item').forEach(function (item) {
        item.addEventListener('click', function () {
            grid.querySelectorAll('.cat-item').forEach(function (el) { el.classList.remove('selected'); });
            item.classList.add('selected');
            $('#selectedCategory').value = item.dataset.id;
        });
    });
}

function selectCategory(catId) {
    const grid = $('#categoryGrid');
    grid.querySelectorAll('.cat-item').forEach(function (el) {
        el.classList.toggle('selected', el.dataset.id === catId);
    });
    $('#selectedCategory').value = catId;
}

function handleTransactionSubmit(e) {
    e.preventDefault();

    const id = $('#editTransactionId').value;
    const type = document.querySelector('input[name="type"]:checked').value;
    const amount = parseFloat($('#amount').value);
    const categoryId = $('#selectedCategory').value;
    const date = $('#date').value;
    const note = $('#note').value;

    if (!categoryId) {
        showToast('กรุณาเลือกหมวดหมู่');
        return;
    }

    const data = {
        type: type,
        amount: amount,
        categoryId: categoryId,
        date: date,
        note: note,
        updatedAt: new Date().toISOString()
    };

    if (id) {
        // Update
        db.ref('users/' + userId + '/transactions/' + id).update(data)
            .then(function () {
                showToast('อัพเดทสำเร็จ!');
                closeAllModals();
            })
            .catch(function (err) {
                showToast('เกิดข้อผิดพลาด: ' + err.message);
            });
    } else {
        // Create
        data.createdAt = new Date().toISOString();
        db.ref('users/' + userId + '/transactions').push(data)
            .then(function () {
                showToast('บันทึกสำเร็จ!');
                closeAllModals();
            })
            .catch(function (err) {
                showToast('เกิดข้อผิดพลาด: ' + err.message);
            });
    }
}

function confirmDeleteTransaction() {
    const id = $('#editTransactionId').value;
    if (id) {
        if (confirm('ต้องการลบรายการนี้?')) {
            db.ref('users/' + userId + '/transactions/' + id).remove()
                .then(function () {
                    showToast('ลบรายการสำเร็จ!');
                    closeAllModals();
                })
                .catch(function (err) {
                    showToast('เกิดข้อผิดพลาด: ' + err.message);
                });
        }
    }
}

// ============================================
// BUDGET
// ============================================

function renderBudgetOverview() {
    const container = $('#budgetOverview');
    if (!container) return;

    const monthExpenses = getFilteredByMonth(allTransactions, currentDate).filter(function (t) { return t.type === 'expense'; });

    const expenseByCategory = {};
    let totalExpense = 0;
    monthExpenses.forEach(function (t) {
        expenseByCategory[t.categoryId] = (expenseByCategory[t.categoryId] || 0) + t.amount;
        totalExpense += t.amount;
    });

    if (allBudgets.length === 0) {
        container.innerHTML = '<p class="empty-text">ยังไม่ได้ตั้งงบประมาณ</p>';
        return;
    }

    let html = '';
    allBudgets.slice(0, 3).forEach(function (budget) {
        let spent = 0;
        if (budget.categoryId === '_total') {
            spent = totalExpense;
        } else {
            spent = expenseByCategory[budget.categoryId] || 0;
        }

        const percent = Math.min((spent / budget.amount) * 100, 100);
        const status = percent >= 100 ? 'danger' : percent >= 80 ? 'warning' : 'safe';
        const catName = budget.categoryId === '_total' ? 'รวมทั้งหมด' : getCategoryInfo('expense', budget.categoryId).name;

        html += '<div class="budget-item">' +
            '<div class="budget-item-header">' +
            '<span>' + catName + '</span>' +
            '<span>' + formatNumber(spent) + ' / ' + formatNumber(budget.amount) + '</span>' +
            '</div>' +
            '<div class="progress-bar">' +
            '<div class="progress-fill ' + status + '" style="width: ' + percent + '%"></div>' +
            '</div>' +
            '</div>';
    });

    container.innerHTML = html;
}

function renderBudgetList() {
    const container = $('#budgetList');
    if (!container) return;

    const monthExpenses = getFilteredByMonth(allTransactions, currentDate).filter(function (t) { return t.type === 'expense'; });
    const expenseByCategory = {};
    let totalExpense = 0;
    monthExpenses.forEach(function (t) {
        expenseByCategory[t.categoryId] = (expenseByCategory[t.categoryId] || 0) + t.amount;
        totalExpense += t.amount;
    });

    if (allBudgets.length === 0) {
        container.innerHTML = '<p class="empty-text">ยังไม่มีงบประมาณ คลิก "เพิ่มงบ" เพื่อเริ่มต้น</p>';
        return;
    }

    let html = '';
    allBudgets.forEach(function (budget) {
        let spent = budget.categoryId === '_total' ? totalExpense : (expenseByCategory[budget.categoryId] || 0);
        const percent = Math.min((spent / budget.amount) * 100, 100);
        const status = percent >= 100 ? 'danger' : percent >= 80 ? 'warning' : 'safe';
        const catName = budget.categoryId === '_total' ? 'รวมทั้งหมด' : getCategoryInfo('expense', budget.categoryId).name;

        html += '<div class="budget-item-row" data-id="' + budget.id + '">' +
            '<div class="budget-item-content">' +
            '<div class="budget-item-header">' +
            '<span>' + catName + '</span>' +
            '<span>' + formatNumber(spent) + ' / ' + formatNumber(budget.amount) + ' บาท</span>' +
            '</div>' +
            '<div class="progress-bar">' +
            '<div class="progress-fill ' + status + '" style="width: ' + percent + '%"></div>' +
            '</div>' +
            '</div>' +
            '<button class="btn-edit-budget" title="แก้ไข"><i class="fas fa-pen"></i></button>' +
            '</div>';
    });

    container.innerHTML = html;

    container.querySelectorAll('.budget-item-row').forEach(function (item) {
        item.querySelector('.btn-edit-budget').addEventListener('click', function () {
            openBudgetModal(item.dataset.id);
        });
        item.querySelector('.budget-item-content').addEventListener('click', function () {
            openBudgetModal(item.dataset.id);
        });
    });

    renderBudgetSummaryBars();
}


function renderBudgetSummaryBars() {
    const container = $('#budgetSummaryBars');
    if (!container) return;

    const monthExpenses = getFilteredByMonth(allTransactions, currentDate).filter(function (t) { return t.type === 'expense'; });
    const expenseByCategory = {};
    let totalExpense = 0;
    monthExpenses.forEach(function (t) {
        expenseByCategory[t.categoryId] = (expenseByCategory[t.categoryId] || 0) + t.amount;
        totalExpense += t.amount;
    });

    if (allBudgets.length === 0) {
        container.innerHTML = '<p class="empty-text">ยังไม่มีงบประมาณ</p>';
        return;
    }

    let html = '';
    allBudgets.forEach(function (budget) {
        const catName = budget.categoryId === '_total' ? 'รวมทั้งหมด' : getCategoryInfo('expense', budget.categoryId).name;
        const spent = budget.categoryId === '_total' ? totalExpense : (expenseByCategory[budget.categoryId] || 0);
        const percent = Math.min((spent / budget.amount) * 100, 100);
        const remaining = Math.max(budget.amount - spent, 0);
        const status = percent >= 100 ? 'danger' : percent >= 80 ? 'warning' : 'safe';
        const icon = budget.categoryId === '_total' ? 'fa-wallet' : getCategoryInfo('expense', budget.categoryId).icon;

        html += '<div class="budget-summary-item">' +
            '<div class="budget-summary-header">' +
            '<div class="budget-summary-name"><i class="fas ' + icon + '"></i> ' + catName + '</div>' +
            '<div class="budget-summary-values">' + formatNumber(spent) + ' / ' + formatNumber(budget.amount) + ' บาท</div>' +
            '</div>' +
            '<div class="budget-bar-container">' +
            '<div class="budget-bar-track">' +
            '<div class="budget-bar-fill ' + status + '" style="width: ' + percent + '%"></div>' +
            '</div>' +
            '<div class="budget-bar-percent ' + status + '">' + Math.round(percent) + '%</div>' +
            '</div>' +
            '<div class="budget-summary-footer">' +
            '<span>ใช้ไป ฿' + formatNumber(spent) + '</span>' +
            '<span>เหลือ ฿' + formatNumber(remaining) + '</span>' +
            '</div>' +
            '</div>';
    });

    container.innerHTML = html;
}


function openBudgetModal(budgetId) {
    const modal = $('#budgetModal');
    const form = $('#budgetForm');
    form.reset();

    // Populate category select
    const select = $('#budgetCategory');
    const allCats = DEFAULT_CATEGORIES.expense.concat(customCategories.expense || []);
    select.innerHTML = '<option value="">-- เลือกหมวดหมู่ --</option><option value="_total">รวมทั้งหมด</option>';
    allCats.forEach(function (cat) {
        select.innerHTML += '<option value="' + cat.id + '">' + cat.name + '</option>';
    });

    if (budgetId) {
        const b = allBudgets.find(function (x) { return x.id === budgetId; });
        if (b) {
            $('#editBudgetId').value = b.id;
            $('#budgetCategory').value = b.categoryId;
            $('#budgetAmount').value = b.amount;
            $('#deleteBudgetBtn').classList.remove('hidden');
        }
    } else {
        $('#editBudgetId').value = '';
        $('#deleteBudgetBtn').classList.add('hidden');
    }

    modal.classList.add('show');
}

function handleBudgetSubmit(e) {
    e.preventDefault();

    const id = $('#editBudgetId').value;
    const categoryId = $('#budgetCategory').value;
    const amount = parseFloat($('#budgetAmount').value);

    if (!categoryId) {
        showToast('กรุณาเลือกหมวดหมู่');
        return;
    }

    const data = { categoryId: categoryId, amount: amount };

    if (id) {
        db.ref('users/' + userId + '/budgets/' + id).update(data)
            .then(function () {
                showToast('อัพเดทงบประมาณสำเร็จ!');
                closeAllModals();
            })
            .catch(function (err) {
                showToast('เกิดข้อผิดพลาด: ' + err.message);
            });
    } else {
        db.ref('users/' + userId + '/budgets').push(data)
            .then(function () {
                showToast('เพิ่มงบประมาณสำเร็จ!');
                closeAllModals();
            })
            .catch(function (err) {
                showToast('เกิดข้อผิดพลาด: ' + err.message);
            });
    }
}

function confirmDeleteBudget() {
    const id = $('#editBudgetId').value;
    if (id) {
        if (confirm('ต้องการลบงบประมาณนี้?')) {
            db.ref('users/' + userId + '/budgets/' + id).remove()
                .then(function () {
                    showToast('ลบงบประมาณสำเร็จ!');
                    closeAllModals();
                })
                .catch(function (err) {
                    showToast('เกิดข้อผิดพลาด: ' + err.message);
                });
        }
    }
}

// ============================================
// REPORTS
// ============================================

function updateYear() {
    $('#currentYear').textContent = currentYear;
    renderYearlyChart();
    renderMonthlyGrid();
}

function renderYearlyChart() {
    const ctx = document.getElementById('yearlyChart');
    if (!ctx) return;

    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const incomeData = new Array(12).fill(0);
    const expenseData = new Array(12).fill(0);

    allTransactions.forEach(function (t) {
        const d = new Date(t.date);
        if (d.getFullYear() === currentYear) {
            const m = d.getMonth();
            if (t.type === 'income') incomeData[m] += t.amount;
            else expenseData[m] += t.amount;
        }
    });

    if (yearlyChart) yearlyChart.destroy();

    yearlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'รายรับ',
                    data: incomeData,
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderRadius: 4
                },
                {
                    label: 'รายจ่าย',
                    data: expenseData,
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function renderMonthlyGrid() {
    const container = $('#monthlyGrid');
    if (!container) return;

    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const now = new Date();
    const currentMonth = now.getMonth();
    const thisYear = now.getFullYear();

    let html = '';
    for (let m = 0; m < 12; m++) {
        const filtered = allTransactions.filter(function (t) {
            const d = new Date(t.date);
            return d.getFullYear() === currentYear && d.getMonth() === m;
        });

        let income = 0, expense = 0;
        filtered.forEach(function (t) {
            if (t.type === 'income') income += t.amount;
            else expense += t.amount;
        });

        const balance = income - expense;
        const isCurrent = currentYear === thisYear && m === currentMonth;

        html += '<div class="month-card ' + (isCurrent ? 'current' : '') + '" data-month="' + m + '">' +
            '<h4>' + months[m] + '</h4>' +
            '<div class="amount ' + (balance >= 0 ? 'positive' : 'negative') + '">' +
            (balance >= 0 ? '+' : '') + formatNumber(balance) +
            '</div>' +
            '</div>';
    }

    container.innerHTML = html;

    container.querySelectorAll('.month-card').forEach(function (card) {
        card.addEventListener('click', function () {
            currentDate = new Date(currentYear, parseInt(this.dataset.month), 1);
            updateDateDisplay();
            switchTab('transactions');
        });
    });
}

// ============================================
// SETTINGS
// ============================================

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    $('#darkModeSwitch').checked = isDark;

    if (expenseChart) renderExpenseChart();
    if (budgetBarChart) renderBudgetBarChart();
    if (yearlyChart) renderYearlyChart();
}

function renderCustomCategoriesList() {
    const container = $('#customCategoriesList');
    if (!container) return;

    const allCustom = (customCategories.expense || []).concat(customCategories.income || []);

    if (allCustom.length === 0) {
        container.innerHTML = '<p class="empty-text">ยังไม่มีหมวดหมู่ที่กำหนดเอง</p>';
        return;
    }

    let html = '';
    allCustom.forEach(function (cat) {
        html += '<div class="transaction-item">' +
            '<div class="t-left">' +
            '<div class="t-icon"><i class="fas ' + cat.icon + '"></i></div>' +
            '<div class="t-details">' +
            '<h4>' + cat.name + '</h4>' +
            '<p>' + (cat.type === 'income' ? 'รายรับ' : 'รายจ่าย') + '</p>' +
            '</div>' +
            '</div>' +
            '<button class="btn-delete" onclick="deleteCustomCategory(\'' + cat.id + '\')">' +
            '<i class="fas fa-trash"></i>' +
            '</button>' +
            '</div>';
    });

    container.innerHTML = html;
}

function openCategoryModal() {
    const modal = $('#categoryModal');
    $('#categoryForm').reset();

    const iconPicker = $('#iconPicker');
    iconPicker.innerHTML = ICON_OPTIONS.map(function (icon) {
        return '<div class="icon-option ' + (icon === 'fa-tag' ? 'selected' : '') + '" data-icon="' + icon + '">' +
            '<i class="fas ' + icon + '"></i>' +
            '</div>';
    }).join('');

    iconPicker.querySelectorAll('.icon-option').forEach(function (opt) {
        opt.addEventListener('click', function () {
            iconPicker.querySelectorAll('.icon-option').forEach(function (el) { el.classList.remove('selected'); });
            opt.classList.add('selected');
            $('#selectedIcon').value = opt.dataset.icon;
        });
    });

    modal.classList.add('show');
}

function handleCategorySubmit(e) {
    e.preventDefault();

    const type = $('#categoryType').value;
    const name = $('#categoryName').value;
    const icon = $('#selectedIcon').value;

    const data = { type: type, name: name, icon: icon };

    db.ref('users/' + userId + '/categories').push(data)
        .then(function () {
            showToast('เพิ่มหมวดหมู่สำเร็จ!');
            closeAllModals();
        })
        .catch(function (err) {
            showToast('เกิดข้อผิดพลาด: ' + err.message);
        });
}

function deleteCustomCategory(catId) {
    if (confirm('ต้องการลบหมวดหมู่นี้?')) {
        db.ref('users/' + userId + '/categories/' + catId).remove()
            .then(function () {
                showToast('ลบหมวดหมู่สำเร็จ!');
            })
            .catch(function (err) {
                showToast('เกิดข้อผิดพลาด: ' + err.message);
            });
    }
}

function populateFilterCategories() {
    const select = $('#filterCategory');
    if (!select) return;

    const allCats = DEFAULT_CATEGORIES.expense
        .concat(DEFAULT_CATEGORIES.income)
        .concat(customCategories.expense || [])
        .concat(customCategories.income || []);

    select.innerHTML = '<option value="all">ทุกหมวดหมู่</option>';
    allCats.forEach(function (cat) {
        select.innerHTML += '<option value="' + cat.id + '">' + cat.name + '</option>';
    });
}

// ============================================
// EXPORT
// ============================================

function exportToCSV() {
    const filtered = getFilteredByMonth(allTransactions, currentDate);

    if (filtered.length === 0) {
        showToast('ไม่มีข้อมูลให้ส่งออก');
        return;
    }

    const headers = ['วันที่', 'ประเภท', 'หมวดหมู่', 'จำนวนเงิน', 'บันทึก'];
    const rows = filtered.map(function (t) {
        const cat = getCategoryInfo(t.type, t.categoryId);
        return [t.date, t.type === 'income' ? 'รายรับ' : 'รายจ่าย', cat.name, t.amount, t.note || ''];
    });

    let csvContent = headers.map(function (h) { return '"' + h + '"'; }).join(',') + '\n';
    rows.forEach(function (row) {
        csvContent += row.map(function (cell) { return '"' + cell + '"'; }).join(',') + '\n';
    });

    downloadFile(csvContent, 'transactions_' + formatMonthFile(currentDate) + '.csv', 'text/csv;charset=utf-8;');
    showToast('ส่งออก CSV สำเร็จ!');
}

function exportAllData() {
    const data = {
        transactions: allTransactions,
        budgets: allBudgets,
        customCategories: customCategories,
        exportDate: new Date().toISOString()
    };

    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, 'expense_tracker_backup_' + Date.now() + '.json', 'application/json');
    showToast('ส่งออกข้อมูลทั้งหมดสำเร็จ!');
}

function copyUserId() {
    navigator.clipboard.writeText(userId).then(function () {
        showToast('คัดลอก User ID สำเร็จ!');
    }).catch(function () {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = userId;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('คัดลอก User ID สำเร็จ!');
    });
}

function setCustomUserId() {
    const newUserId = prompt('กรอก User ID ที่ต้องการใช้:\n\n(คัดลอกจาก device หลักแล้ววางที่นี่)', '');

    if (newUserId === null) return; // User cancelled

    const trimmedId = newUserId.trim();
    if (!trimmedId) {
        showToast('กรุณากรอก User ID');
        return;
    }

    if (trimmedId === userId) {
        showToast('User ID นี้ใช้งานอยู่แล้ว');
        return;
    }

    if (confirm('เปลี่ยนเป็น User ID: ' + trimmedId + '?\n\nหน้าเว็บจะโหลดใหม่เพื่อดึงข้อมูลจาก ID นี้')) {
        localStorage.setItem('userId', trimmedId);
        location.reload();
    }
}


function downloadFile(content, filename, mimeType) {
    const blob = new Blob(['\ufeff' + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============================================
// UTILITIES
// ============================================

function closeAllModals() {
    $$('.modal').forEach(function (m) { m.classList.remove('show'); });
}

function updateDateDisplay() {
    const formatter = new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' });
    $('#currentMonthYear').textContent = formatter.format(currentDate);
    renderAll();
}

function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    updateDateDisplay();
}

function getFilteredByMonth(transactions, date) {
    return transactions.filter(function (t) {
        const d = new Date(t.date);
        return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
    });
}

function getCategoryInfo(type, id) {
    const allCats = (DEFAULT_CATEGORIES[type] || []).concat(customCategories[type] || []);
    let found = allCats.find(function (c) { return c.id === id; });
    if (found) return found;

    const allAll = DEFAULT_CATEGORIES.expense
        .concat(DEFAULT_CATEGORIES.income)
        .concat(customCategories.expense || [])
        .concat(customCategories.income || []);
    found = allAll.find(function (c) { return c.id === id; });
    return found || { name: 'ไม่ระบุ', icon: 'fa-question' };
}

function formatCurrency(num) {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(num);
}

function formatNumber(num) {
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(num);
}

function formatDateLabel(dateStr) {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('th-TH', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
}

function formatMonthFile(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateColors(count) {
    const palette = [
        '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F97316',
        '#FBBF24', '#84CC16', '#22C55E', '#14B8A6', '#06B6D4',
        '#3B82F6', '#A855F7'
    ];
    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(palette[i % palette.length]);
    }
    return colors;
}

function debounce(fn, delay) {
    let timer;
    return function () {
        const args = arguments;
        const context = this;
        clearTimeout(timer);
        timer = setTimeout(function () { fn.apply(context, args); }, delay);
    };
}

function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 3000);
}
