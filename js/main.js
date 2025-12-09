/* ==========================================
   Wedding Website - JavaScript
   Countdown Timer, Wishes Form (Firebase), Animations
   ========================================== */

document.addEventListener('DOMContentLoaded', function () {
    // Initialize AOS (Animate on Scroll)
    AOS.init({
        duration: 800,
        easing: 'ease-out',
        once: true,
        offset: 100
    });

    // Initialize all components
    initCountdown();
    initNavbarScroll();
    initSmoothScroll();
    initGalleryLightbox();
    initSidebar();

    // Firebase Init Logic
    if (window.firebaseDB) {
        console.log('Firebase already ready');
        initFirebaseWishes();
    } else {
        window.addEventListener('firebaseReady', function () {
            console.log('Firebase ready event');
            initFirebaseWishes();
        });
    }
});

/* ==========================================
   Countdown Timer
   ========================================== */
function initCountdown() {
    // Wedding date: February 13, 2026, 10:00 AM
    const weddingDate = new Date('2026-02-13T10:00:00').getTime();

    function updateCountdown() {
        const now = new Date().getTime();
        const distance = weddingDate - now;

        if (distance < 0) {
            // Wedding day has passed
            document.getElementById('days').textContent = '🎉';
            document.getElementById('hours').textContent = 'Đã';
            document.getElementById('minutes').textContent = 'cưới';
            document.getElementById('seconds').textContent = '💍';
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        document.getElementById('days').textContent = padNumber(days);
        document.getElementById('hours').textContent = padNumber(hours);
        document.getElementById('minutes').textContent = padNumber(minutes);
        document.getElementById('seconds').textContent = padNumber(seconds);
    }

    // Update immediately and then every second
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

function padNumber(num) {
    return num < 10 ? '0' + num : num;
}

/* ==========================================
   Navbar Scroll Effect
   ========================================== */
function initNavbarScroll() {
    const navbar = document.getElementById('mainNav');

    window.addEventListener('scroll', function () {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Update active nav link based on scroll position
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', function () {
        let current = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.offsetHeight;

            if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });
    });
}

/* ==========================================
   Smooth Scroll
   ========================================== */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                const navHeight = document.getElementById('mainNav').offsetHeight;
                const targetPosition = targetElement.offsetTop - navHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });

                // Close mobile menu if open
                const navbarCollapse = document.querySelector('.navbar-collapse');
                if (navbarCollapse.classList.contains('show')) {
                    const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
                    if (bsCollapse) {
                        bsCollapse.hide();
                    }
                }
            }
        });
    });
}

/* ==========================================
   Firebase Wishes Logic
   ========================================== */
function initFirebaseWishes() {
    const db = window.firebaseDB;

    // 1. Handle Form Submission
    const form = document.getElementById('wishForm');
    const submitBtn = form.querySelector('button[type="submit"]');

    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const name = document.getElementById('wishName').value.trim();
            const message = document.getElementById('wishMessage').value.trim();

            if (name && message) {
                // Disable button and show loading state
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Đang gửi...';

                // Add to Firestore
                db.collection("wishes").add({
                    name: name,
                    message: message,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                })
                    .then(() => {
                        form.reset();
                        showToast('Cảm ơn bạn đã gửi lời chúc! 💕');
                    })
                    .catch((error) => {
                        console.error("Error adding wish: ", error);
                        alert("Lỗi: " + error.message);
                        showToast('Có lỗi xảy ra: ' + error.message);
                    })
                    .finally(() => {
                        // Reset button
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i class="bi bi-send"></i> Gửi lời chúc';
                    });
            }
        });
    }

    // 2. Listen for Realtime Updates
    db.collection("wishes")
        .orderBy("createdAt", "desc")
        .onSnapshot((snapshot) => {
            const wishes = [];
            snapshot.forEach((doc) => {
                wishes.push({ id: doc.id, ...doc.data() });
            });

            // Update UI
            updateWishesUI(wishes);
            updateWishesSidebar(wishes);
            updateWishesCount(wishes.length);
        }, (error) => {
            console.error("Error getting wishes: ", error);
        });
}

function updateWishesUI(wishes) {
    const container = document.getElementById('wishesContainer');

    // Show loading state initially
    container.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';

    if (wishes.length === 0) {
        container.innerHTML = `
            <div class="no-wishes">
                <i class="bi bi-envelope-heart"></i>
                <p>Hãy là người đầu tiên gửi lời chúc!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    // Display recent 10 wishes
    const recentWishes = wishes.slice(0, 10);

    recentWishes.forEach(wish => {
        const wishCard = createWishCard(wish);
        container.appendChild(wishCard);
    });
}

function updateWishesSidebar(wishes) {
    const container = document.getElementById('sidebarWishesContainer');
    container.innerHTML = '';

    if (wishes.length === 0) {
        container.innerHTML = '<p class="text-center text-muted mt-5">Chưa có lời chúc nào.</p>';
        return;
    }

    wishes.forEach(wish => {
        const wishCard = createWishCard(wish);
        container.appendChild(wishCard);
    });
}

function updateWishesCount(count) {
    const badge = document.getElementById('wishesCount');
    if (badge) {
        badge.textContent = count > 99 ? '99+' : count;
        // Animation effect when count updates
        badge.style.transform = 'scale(1.2)';
        setTimeout(() => badge.style.transform = 'scale(1)', 200);
    }
}

function createWishCard(wish) {
    const wishCard = document.createElement('div');
    wishCard.className = 'wish-card';

    // Format date
    let timeString = '';
    if (wish.createdAt && wish.createdAt.seconds) {
        const date = new Date(wish.createdAt.seconds * 1000);
        timeString = date.toLocaleString('vi-VN');
    } else {
        timeString = new Date().toLocaleString('vi-VN');
    }

    wishCard.innerHTML = `
        <div class="wish-name">
            <i class="bi bi-person-heart"></i>
            ${escapeHtml(wish.name)}
        </div>
        <div class="wish-text">${escapeHtml(wish.message)}</div>
        <div class="wish-time">
            <i class="bi bi-clock"></i> ${timeString}
        </div>
    `;

    return wishCard;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/* ==========================================
   Sidebar Logic
   ========================================== */
function initSidebar() {
    const floatingBtn = document.getElementById('floatingWishesBtn');
    const sidebar = document.getElementById('wishesSidebar');
    const closeBtn = document.getElementById('closeSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    function openSidebar() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent body scroll
    }

    function closeSidebar() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (floatingBtn) floatingBtn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);
}

/* ==========================================
   Gallery Lightbox
   ========================================== */
function initGalleryLightbox() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    const modalImage = document.getElementById('modalImage');
    const modal = new bootstrap.Modal(document.getElementById('galleryModal'));

    galleryItems.forEach(item => {
        item.addEventListener('click', function () {
            const img = this.querySelector('img');
            modalImage.src = img.src;
            modalImage.alt = img.alt;
            modal.show();
        });
    });
}

/* ==========================================
   Toast Notification
   ========================================== */
function showToast(message) {
    // Create toast if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');

    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }

    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white border-0" 
             style="background: linear-gradient(135deg, #d4a373, #c9a227);" 
             role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHtml);

    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();

    // Remove toast element after it's hidden
    toastElement.addEventListener('hidden.bs.toast', function () {
        this.remove();
    });
}
