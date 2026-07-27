// Global Base URL & In-Memory Fallback Store
const API_BASE = 'http://localhost:5000/api/users';
const memoryStore = {};

// ==========================================
// 1. STORAGE & NOTIFICATION HELPERS
// ==========================================
function getStorageItem(key) {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            return localStorage.getItem(key);
        }
    } catch (e) {
        return memoryStore[key] || null;
    }
    return memoryStore[key] || null;
}

function setStorageItem(key, value) {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(key, value);
        }
        memoryStore[key] = value;
    } catch (e) {
        memoryStore[key] = value;
    }
}

function clearStorage() {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.clear();
        }
    } catch (e) {}
    Object.keys(memoryStore).forEach(function(k) { delete memoryStore[k]; });
}

function showNotification(message, type) {
    type = type || 'success';
    if (typeof Toastify !== 'undefined') {
        Toastify({
            text: message,
            duration: 3500,
            close: true,
            gravity: "top", 
            position: "right", 
            style: {
                background: type === 'success' 
                    ? "linear-gradient(to right, #0d6efd, #0b5ed7)" 
                    : "linear-gradient(to right, #dc3545, #b02a37)",
                borderRadius: "8px"
            }
        }).showToast();
    } else {
        // Fallback to standard browser popup if Toastify library missing
        alert((type === 'error' ? 'Error: ' : '') + message);
    }
}

// Function to load real-time user statistics on Dashboard
function loadDashboardStats() {
    const token = getStorageItem('authToken');

    $.ajax({
        url: 'http://localhost:5000/api/dashboard/stats',
        type: 'GET',
        headers: {
            'Authorization': token ? 'Bearer ' + token : ''
        },
        success: function(data) {
            // Bind server counts to corresponding DOM elements
            $('#stat-total-users').text(data.totalUsers ?? 0);
            $('#stat-active-users').text(data.activeUsers ?? 0);
            $('#stat-admin-users').text(data.adminUsers ?? 0);
            $('#stat-standard-users').text(data.standardUsers ?? 0);

            // Update recent signups badge text
            if (data.recentSignups !== undefined) {
                $('#stat-recent-signups').html(`<i class="bi bi-arrow-up-short"></i> +${data.recentSignups} this month`);
            }
        },
        error: function(err) {
            console.error("Dashboard Stats Fetch Error:", err);
        }
    });
}

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// ==========================================
// 2. SECURITY GUARD & ROUTE CHECK
// ==========================================

(function() {
    const sessionToken = getStorageItem('authToken');
    const userRole = getStorageItem('userRole') || "Viewer";
    const savedName = getStorageItem('profileName');
    const currentPage = window.location.pathname.toLowerCase();

    // Pages accessible without logging in
    const isAuthPage = currentPage.includes('login') || currentPage.includes('register') || currentPage.includes('signup') || currentPage === '/' || currentPage.endsWith('/');

    // 1. Not logged in -> Redirect to Login
    if (!sessionToken && !isAuthPage) {
        window.location.href = '/pages/login.html';
        return;
    }

    // 2. Non-Admin user trying to access admin pages -> Silently redirect to Welcome
    if (sessionToken && userRole !== 'Admin') {
        const adminPages = ['dashboard', 'user-list', 'user-add', 'user-edit', 'user-detail'];
        const isTryingAccessAdminPage = adminPages.some(function(page) { return currentPage.includes(page); });

        if (isTryingAccessAdminPage) {
            window.location.href = '/pages/welcome.html';
            return;
        }
    }

    // 3. Populate Welcome Name elements
    document.addEventListener('DOMContentLoaded', function() {
        const welcomeSpan = document.getElementById('user-name-span');
        const userDisplayName = document.getElementById('user-display-name');
        const roleBadge = document.getElementById('user-role-badge');

        if (welcomeSpan) welcomeSpan.textContent = savedName || "User";
        if (userDisplayName) userDisplayName.textContent = savedName || "User";
        if (roleBadge) roleBadge.textContent = userRole;
    });
})();

// ==========================================
// 3. GLOBAL USER LIST LOADER
// ==========================================
function loadUserList() {
    const $tbody = $('#user-table-body');
    if (!$tbody.length) return;

    const token = getStorageItem('authToken');

    $.ajax({
        url: API_BASE + '/list',
        type: 'GET',
        headers: {
            'Authorization': token ? 'Bearer ' + token : ''
        },
        success: function(response) {
            let users = Array.isArray(response) ? response : (response.users || response.data || []);
            $tbody.empty();

            if (users.length === 0) {
                $tbody.append('<tr><td colspan="5" class="text-center py-4 text-muted">No users found in database.</td></tr>');
                return;
            }

            users.forEach(function(user) {
                const name = user.name || 'N/A';
                const email = user.email || 'N/A';
                const role = user.role || 'Viewer';
                const userId = user._id || user.id || '';

                const initials = name !== 'N/A'
                    ? name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)
                    : 'U';

                const formattedDate = user.createdAt 
                    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
                    : 'N/A';

                const rowHtml = `
                    <tr>
                      <td class="ps-4">
                        <div class="d-flex align-items-center">
                          <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3 fw-bold" style="width: 40px; height: 40px;">
                            ${initials}
                          </div>
                          <div>
                            <p class="fw-bold mb-0 text-dark">${name}</p>
                            <span class="text-muted small">${email}</span>
                          </div>
                        </div>
                      </td>
                      <td><span class="badge bg-secondary">${role}</span></td>
                      <td><span class="badge bg-success-subtle text-success border border-success-subtle">Active</span></td>
                      <td class="text-muted">${formattedDate}</td>
                      <td class="text-end pe-4">
                        <div class="btn-group">
                          <a href="/pages/user-detail.html?id=${userId}" class="btn btn-sm btn-outline-primary" title="View Profile"><i class="bi bi-eye"></i></a>
                          <a href="/pages/user-edit.html?id=${userId}" class="btn btn-sm btn-outline-warning" title="Edit Profile"><i class="bi bi-pencil-square"></i></a>
                          <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${userId}" title="Delete Account"><i class="bi bi-trash"></i></button>
                        </div>
                      </td>
                    </tr>
                `;
                $tbody.append(rowHtml);
            });
        },
        error: function(xhr) {
            console.error("Fetch Error:", xhr.status, xhr.responseText);
            $tbody.empty();
            $tbody.append(`<tr><td colspan="5" class="text-center py-4 text-danger">Error loading users (${xhr.status}). Check server logs.</td></tr>`);
        }
    });
}

window.loadUserList = loadUserList;

// ==========================================
// 4. JQUERY EVENT LISTENERS & INITIALIZATION
// ==========================================
$(document).ready(function() {

    // --- 0. DYNAMICALLY LOAD SIDEBAR COMPONENT ---
    if ($('#sidebar-container').length > 0) {
        $('#sidebar-container').load('/pages/sidebar.html', function(response, status, xhr) {
            if (status === "error") {
                console.error("Failed to load sidebar component:", xhr.status, xhr.statusText);
                return;
            }

            // Highlight Active Link dynamically based on current route
            const currentPage = window.location.pathname.split('/').pop().toLowerCase();

            if (currentPage.includes('dashboard') || currentPage === '') {
                $('#nav-dashboard').addClass('active bg-primary').removeClass('text-light-emphasis');
            } else if (currentPage.includes('user-list')) {
                $('#nav-users').addClass('active bg-primary').removeClass('text-light-emphasis');
            } else if (currentPage.includes('user-add')) {
                $('#nav-add-user').addClass('active bg-primary').removeClass('text-light-emphasis');
            }

            // Populate User Info inside Sidebar
            const savedName = getStorageItem('profileName');
            $('#user-name-span').text(savedName || "User");
            if (savedName) {
                const initials = savedName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
                $('#user-avatar-initial').text(initials);
            }
        });
    }

    // --- Dashboard Initializer ---
    if (window.location.pathname.includes('dashboard') || $('#dashboard-stats-container').length > 0) {
        loadDashboardStats();
    }

    // --- A. LOGIN FORM HANDLER ---
    $(document).on('submit', '#login-form, form:has(input[type="password"]):not(#add-user-form):not(#edit-user-form)', function(e) {
      if ($('#edit-user-form').length > 0 || $('#add-user-form').length > 0 || $('#register-form').length > 0) return;
    
    e.preventDefault();

        const emailVal = ($('#email').val() || $('input[type="email"]').val() || '').trim();
        const passwordVal = ($('#password').val() || $('input[type="password"]').val() || '').trim();

        if (!emailVal || !passwordVal) {
            showNotification("Please enter both email and password.", "error");
            return;
        }

        const loginData = { email: emailVal, password: passwordVal };
        const $btn = $(this).find('button[type="submit"]');
        $btn.prop('disabled', true).html('Logging in...');

        $.ajax({
            url: API_BASE + '/login',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(loginData),
           // Inside LOGIN FORM HANDLER success callback:
success: function(response) {
    const role = response.role || (response.user && response.user.role) || "Viewer";
    
    setStorageItem('authToken', response.token || 'demo-token');
    setStorageItem('profileName', response.name || (response.user && response.user.name) || "User");
    setStorageItem('userRole', role);
    setStorageItem('userEmail', loginData.email);
    
    showNotification("Authenticated successfully!", "success");
    
    setTimeout(function() { 
        // Redirect based on user role:
        if (role === 'Admin') {
            window.location.href = '/pages/user-list.html'; 
        } else {
            window.location.href = '/pages/welcome.html';
        }
    }, 1000);
},
            error: function(xhr) {
                $btn.prop('disabled', false).html('Sign In');
                const errorMsg = (xhr.responseJSON && xhr.responseJSON.message) ? xhr.responseJSON.message : "Invalid credentials.";
                showNotification(errorMsg, "error");
            }
        });
    });

    // --- B. USER LIST LOAD ---
    if ($('#user-table-body').length) {
        loadUserList();
    }

    // --- REGISTER / SIGNUP FORM HANDLER ---
$(document).on('submit', '#register-form, #signup-form', function(e) {
    e.preventDefault();

    const nameVal = ($('#name').val() || $('#full-name').val() || $('input[name="name"]').val() || '').trim();
    const emailVal = ($('#email').val() || $('input[type="email"]').val() || '').trim();
    const passwordVal = ($('#password').val() || $('input[type="password"]').val() || '').trim();

    if (!emailVal || !passwordVal || !nameVal) {
        showNotification("Please fill in all fields.", "error");
        return;
    }

    const $btn = $(this).find('button[type="submit"]');
    $btn.prop('disabled', true).html('Registering...');

    $.ajax({
        url: API_BASE + '/register',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ name: nameVal, email: emailVal, password: passwordVal, role: 'Viewer' }),
        success: function(response) {
            showNotification("Account created! Redirecting to login", "success");
            setTimeout(function() {
                window.location.href = '/pages/login.html';
            }, 1200);
        },
        error: function(xhr) {
            $btn.prop('disabled', false).html('Sign Up');
            const errorMsg = (xhr.responseJSON && xhr.responseJSON.message) ? xhr.responseJSON.message : "Registration failed.";
            showNotification(errorMsg, "error");
        }
    });
});
    // --- C. USER DETAIL PAGE LOGIC ---
    const urlParams = new URLSearchParams(window.location.search);
    const userIdFromUrl = urlParams.get('id');

    if (window.location.pathname.includes('user-detail') || $('#user-detail-card').length > 0) {
        if (userIdFromUrl) {
            $.ajax({
                url: API_BASE + '/detail/' + userIdFromUrl,
                type: 'GET',
                headers: { 'Authorization': 'Bearer ' + (getStorageItem('authToken') || '') },
                success: function(user) {
                    const userData = user.user || user;
                    const name = userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'User';
                    const email = userData.email || 'N/A';
                    const role = userData.role || 'Guest';
                    const initials = name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
                    const formattedDate = userData.createdAt 
                        ? new Date(userData.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
                        : 'N/A';

                    $('#detail-user-name, #user-display-name').text(name);
                    $('#detail-user-email').text(email);
                    $('#detail-user-role').text(role);
                    $('#detail-user-avatar').text(initials);
                    $('#detail-user-id').text('ID: #' + (userData._id || userData.id || '').slice(-6));
                    $('#detail-user-joined').text(formattedDate);
                    $('#edit-profile-btn').attr('href', '/pages/user-edit.html?id=' + (userData._id || userData.id));
                },
                error: function() {
                    showNotification("Failed to fetch profile details.", "error");
                }
            });
        }
    }

    // --- D. EDIT USER FORM LOGIC ---
    if ($('#edit-user-form').length > 0) {
        if (!userIdFromUrl) {
            showNotification("No user ID provided in URL!", "error");
        } else {
            $.ajax({
                url: API_BASE + '/detail/' + userIdFromUrl,
                type: 'GET',
                headers: { 'Authorization': 'Bearer ' + (getStorageItem('authToken') || '') },
                success: function(res) {
                    const user = res.user || res;
                    let fName = user.firstName || (user.name ? user.name.split(' ')[0] : '');
                    let lName = user.lastName || (user.name ? user.name.split(' ').slice(1).join(' ') : '');

                    $('#userId').val(user._id || user.id);
                    $('#firstName').val(fName);
                    $('#lastName').val(lName);
                    $('#email').val(user.email || '');
                    $('#role').val(user.role || 'Standard User');
                }
            });

            $(document).on('submit', '#edit-user-form', function(e) {
                e.preventDefault();
                const currentUserId = $('#userId').val() || userIdFromUrl;
                const updatedPayload = {
                    name: `${$('#firstName').val().trim()} ${$('#lastName').val().trim()}`.trim(),
                    email: $('#email').val().trim(),
                    role: $('#role').val()
                };

                $.ajax({
                    url: API_BASE + '/update/' + currentUserId,
                    type: 'PUT',
                    contentType: 'application/json',
                    headers: { 'Authorization': 'Bearer ' + (getStorageItem('authToken') || '') },
                    data: JSON.stringify(updatedPayload),
                    success: function() {
                        showNotification("Updated successfully!", "success");
                        setTimeout(() => window.location.href = '/pages/user-list.html', 1000);
                    },
                    error: function(xhr) {
                        const errorMsg = (xhr.responseJSON && xhr.responseJSON.message) ? xhr.responseJSON.message : "Error updating user!";
                        showNotification(errorMsg, "error");
                    }
                });
            });
        }
    }

    // --- E. ADD USER HANDLER ---
// --- ADD USER HANDLER ---
$(document).on('submit', '#add-user-form', function(e) {
    e.preventDefault();

    const newUser = {
        name: ($('#user-name').val() || $('input[name="name"]').val() || '').trim(),
        email: ($('#user-email').val() || $('input[name="email"]').val() || '').trim(),
        password: ($('#user-password').val() || $('input[name="password"]').val() || '').trim(),
        role: $('#user-role').val() || 'Viewer'
    };

    const $btn = $(this).find('button[type="submit"]');
    $btn.prop('disabled', true).html('Creating...');

    $.ajax({
        url: API_BASE + '/register',
        type: 'POST',
        contentType: 'application/json',
        headers: { 'Authorization': 'Bearer ' + (getStorageItem('authToken') || '') },
        data: JSON.stringify(newUser),
        success: function(response) {
            showNotification("User created successfully!", "success");
            setTimeout(function() {
                window.location.href = '/pages/user-list.html';
            }, 1000);
        },
        error: function(xhr) {
            $btn.prop('disabled', false).html('Save User');
            
            // Extract duplicate email or error message from server response
            let errorMsg = "Failed to create user.";
            if (xhr.responseJSON) {
                errorMsg = xhr.responseJSON.message || xhr.responseJSON.error || errorMsg;
            } else if (xhr.responseText) {
                try {
                    const parsed = JSON.parse(xhr.responseText);
                    errorMsg = parsed.message || parsed.error || errorMsg;
                } catch(e) {}
            }

            // Display Toast notification/alert
            showNotification(errorMsg, "error");
        }
    });
});

    // --- F. DELETE USER HANDLER ---
    $(document).on('click', '.btn-delete', function() {
        const userId = $(this).data('id');
        if (!userId || !confirm("Are you sure?")) return;

        $.ajax({
            url: API_BASE + '/delete/' + userId,
            type: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + (getStorageItem('authToken') || '') },
            success: function() {
                showNotification("Deleted successfully!", "success");
                loadUserList();
            }
        });
    });

    // --- G. GLOBAL DELEGATED LOGOUT LISTENER ---
    $(document).on('click', '#logout-btn', function(e) {
        e.preventDefault();
        clearStorage();
        window.location.href = '/pages/login.html';
    });
});