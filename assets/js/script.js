/* =========================================================
   SnappyBite — shared site script
   Loaded on every page. Every block below checks that its
   target elements exist before running, so this single file
   works safely across all pages without throwing errors.
   ========================================================= */

document.addEventListener('DOMContentLoaded', function () {
    initMobileNav();
    initCarousel();
    initStatsCounter();
    initAddToCart();
    initCartPage();
    initCheckoutPage();
    initFaqAccordion();
    initContactForms();
    initAuthForms();
    initTrackOrder();
    initAdminDashboard();
    initVendorDashboard();
    initRiderDashboard();
    initOrderConfirmation();
});


/* ---------------------------------------------------------
   Mobile nav toggle (hamburger)
   --------------------------------------------------------- */
function initMobileNav() {
    const toggle = document.getElementById('navToggle');
    const nav = toggle ? toggle.closest('nav') : null;
    if (!toggle || !nav) return;

    toggle.addEventListener('click', function () {
        const isOpen = nav.classList.toggle('nav-open');
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // close menu when a nav link is clicked (mobile UX)
    nav.querySelectorAll('ul a').forEach(link => {
        link.addEventListener('click', () => {
            nav.classList.remove('nav-open');
            toggle.setAttribute('aria-expanded', 'false');
        });
    });
}


/* ---------------------------------------------------------
   Home page vendor carousel
   --------------------------------------------------------- */
function initCarousel() {
    const track = document.getElementById('track');
    const dotsContainer = document.getElementById('dots');
    if (!track || !dotsContainer) return;

    const slides = track.querySelectorAll('.slide');
    if (!slides.length) return;

    let current = 0;
    let autoSlide;

    slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.classList.add('dot');
        if (i === 0) dot.classList.add('active');
        dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
        dot.addEventListener('click', () => goTo(i));
        dotsContainer.appendChild(dot);
    });

    function updateDots() {
        dotsContainer.querySelectorAll('.dot').forEach((d, i) => {
            d.classList.toggle('active', i === current);
        });
    }

    function goTo(index) {
        current = (index + slides.length) % slides.length;
        track.style.transform = `translateX(-${current * 100}%)`;
        updateDots();
    }

    // expose for the inline onclick="" arrows already in the markup
    window.nextSlide = () => goTo(current + 1);
    window.prevSlide = () => goTo(current - 1);

    function startAuto() {
        autoSlide = setInterval(window.nextSlide, 4000);
    }
    function stopAuto() {
        clearInterval(autoSlide);
    }

    startAuto();

    const banner = document.querySelector('.banner');
    if (banner) {
        banner.addEventListener('mouseenter', stopAuto);
        banner.addEventListener('mouseleave', startAuto);
    }
}


/* ---------------------------------------------------------
   Stats count-up animation (home + vendor pages)
   --------------------------------------------------------- */
function initStatsCounter() {
    const statsSection = document.querySelector('.stats');
    const statEls = document.querySelectorAll('.stat-card .num');
    if (!statsSection || !statEls.length) return;

    let counted = false;

    function animateCount(el, target, duration = 1600) {
        const start = performance.now();

        function tick(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(target * eased);
            el.textContent = current.toLocaleString() + '+';

            if (progress < 1) {
                requestAnimationFrame(tick);
            } else {
                el.textContent = target.toLocaleString() + '+';
            }
        }
        requestAnimationFrame(tick);
    }

    function triggerCountIfVisible() {
        if (counted) return;
        const rect = statsSection.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.85) {
            counted = true;
            statEls.forEach(el => animateCount(el, parseInt(el.dataset.target, 10) || 0));
            window.removeEventListener('scroll', triggerCountIfVisible);
        }
    }

    window.addEventListener('scroll', triggerCountIfVisible);
    triggerCountIfVisible();
}


/* ---------------------------------------------------------
   Cart storage helpers (shared across pages via localStorage)
   --------------------------------------------------------- */
const CART_KEY = 'snappybite_cart';

function getCart() {
    try {
        return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch (e) {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
}

function addToCart(name, price, vendor) {
    const cart = getCart();
    const existing = cart.find(item => item.name === name && item.vendor === vendor);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ name, price, qty: 1, vendor: vendor || 'SnappyBite Kitchen' });
    }
    saveCart(cart);
}

function updateCartBadge() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    document.querySelectorAll('.cart-count').forEach(el => {
        el.textContent = count;
    });
}


/* ---------------------------------------------------------
   "Order Now" buttons on Home / Menu / Vendor pages
   --------------------------------------------------------- */
function initAddToCart() {
    const buttons = document.querySelectorAll('.add-to-cart');
    if (!buttons.length) {
        updateCartBadge();
        return;
    }

    buttons.forEach(btn => {
        btn.addEventListener('click', function (e) {
            const name = this.dataset.name;
            const price = parseInt(this.dataset.price, 10) || 0;
            const vendor = this.dataset.vendor || 'SnappyBite Kitchen';
            if (!name) return;
            addToCart(name, price, vendor);

            const original = this.textContent;
            this.textContent = 'Added ✓';
            setTimeout(() => {
                this.textContent = original;
            }, 900);
        });
    });

    updateCartBadge();
}


/* ---------------------------------------------------------
   Cart page rendering + quantity controls
   --------------------------------------------------------- */
function initCartPage() {
    const cartList = document.getElementById('cartList');
    if (!cartList) return;

    const emptyState = document.getElementById('cartEmpty');
    const subtotalEl = document.getElementById('cartSubtotal');
    const deliveryEl = document.getElementById('cartDelivery');
    const totalEl = document.getElementById('cartTotal');
    const DELIVERY_FEE = 1200;

    function formatNaira(n) {
        return '₦' + n.toLocaleString();
    }

    function render() {
        const cart = getCart();
        cartList.innerHTML = '';

        if (!cart.length) {
            if (emptyState) emptyState.style.display = 'block';
            cartList.style.display = 'none';
            if (subtotalEl) subtotalEl.textContent = formatNaira(0);
            if (deliveryEl) deliveryEl.textContent = formatNaira(0);
            if (totalEl) totalEl.textContent = formatNaira(0);
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        cartList.style.display = 'flex';

        let subtotal = 0;
        const vendorCount = new Set(cart.map(i => i.vendor)).size;

        cart.forEach((item, index) => {
            subtotal += item.price * item.qty;

            const row = document.createElement('div');
            row.className = 'cart-item';
            row.innerHTML = `
                <div class="thumb">🍲</div>
                <div class="info">
                    <h4>${item.name}</h4>
                    <div class="unit-price">${formatNaira(item.price)} each · <span style="color:forestgreen; font-weight:700;">${item.vendor}</span></div>
                </div>
                <div class="qty-control">
                    <button type="button" data-action="dec" data-index="${index}" aria-label="Decrease quantity">−</button>
                    <span>${item.qty}</span>
                    <button type="button" data-action="inc" data-index="${index}" aria-label="Increase quantity">+</button>
                </div>
                <div class="line-total">${formatNaira(item.price * item.qty)}</div>
                <button type="button" class="remove-item" data-action="remove" data-index="${index}" aria-label="Remove item">✕</button>
            `;
            cartList.appendChild(row);
        });

        const deliveryFeeTotal = subtotal > 0 ? DELIVERY_FEE * vendorCount : 0;
        if (subtotalEl) subtotalEl.textContent = formatNaira(subtotal);
        if (deliveryEl) deliveryEl.textContent = formatNaira(deliveryFeeTotal) + (vendorCount > 1 ? ` (${vendorCount} vendors)` : '');
        if (totalEl) totalEl.textContent = formatNaira(subtotal + deliveryFeeTotal);

        const multiNote = document.getElementById('cartMultiVendorNote');
        if (multiNote) multiNote.style.display = vendorCount > 1 ? 'block' : 'none';
    }

    cartList.addEventListener('click', function (e) {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;

        const cart = getCart();
        const index = parseInt(btn.dataset.index, 10);
        const action = btn.dataset.action;

        if (action === 'inc') {
            cart[index].qty += 1;
        } else if (action === 'dec') {
            cart[index].qty -= 1;
            if (cart[index].qty <= 0) cart.splice(index, 1);
        } else if (action === 'remove') {
            cart.splice(index, 1);
        }

        saveCart(cart);
        render();
    });

    render();
}


/* ---------------------------------------------------------
   Checkout page: order summary + real order creation
   Cart items are grouped by vendor — a single checkout can
   produce more than one order if the cart spans vendors,
   same as most real food delivery apps.
   --------------------------------------------------------- */
function initCheckoutPage() {
    const summaryEl = document.getElementById('checkoutSummary');
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    if (!summaryEl && !placeOrderBtn) return;

    const DELIVERY_FEE = 1200;

    function formatNaira(n) {
        return '₦' + n.toLocaleString();
    }

    function groupByVendor(cart) {
        const groups = {};
        cart.forEach(item => {
            const key = item.vendor || 'SnappyBite Kitchen';
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });
        return groups;
    }

    if (summaryEl) {
        const cart = getCart();
        const groups = groupByVendor(cart);
        const vendorNames = Object.keys(groups);
        const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
        const deliveryTotal = cart.length ? DELIVERY_FEE * vendorNames.length : 0;

        summaryEl.innerHTML = '';

        vendorNames.forEach(vendorName => {
            const vHeader = document.createElement('div');
            vHeader.className = 'summary-row';
            vHeader.style.fontWeight = '800';
            vHeader.style.color = 'forestgreen';
            vHeader.innerHTML = `<span>${vendorName}</span><span></span>`;
            summaryEl.appendChild(vHeader);

            groups[vendorName].forEach(item => {
                const row = document.createElement('div');
                row.className = 'summary-row';
                row.innerHTML = `<span>${item.name} × ${item.qty}</span><span>${formatNaira(item.price * item.qty)}</span>`;
                summaryEl.appendChild(row);
            });
        });

        const deliveryRow = document.createElement('div');
        deliveryRow.className = 'summary-row';
        deliveryRow.innerHTML = `<span>Delivery Fee${vendorNames.length > 1 ? ` (${vendorNames.length} vendors)` : ''}</span><span>${formatNaira(deliveryTotal)}</span>`;
        summaryEl.appendChild(deliveryRow);

        const totalRow = document.createElement('div');
        totalRow.className = 'summary-row total';
        totalRow.innerHTML = `<span>Total</span><span>${formatNaira(subtotal + deliveryTotal)}</span>`;
        summaryEl.appendChild(totalRow);
    }

    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', function () {
            const cart = getCart();
            if (!cart.length) {
                showToast('Your cart is empty');
                return;
            }

            const nameEl = document.getElementById('checkoutName');
            const phoneEl = document.getElementById('checkoutPhone');
            const addressEl = document.getElementById('checkoutAddress');

            const customerName = (nameEl && nameEl.value.trim()) || 'Guest Customer';
            const customerPhone = (phoneEl && phoneEl.value.trim()) || '—';
            const address = (addressEl && addressEl.value.trim()) || '—';

            const paymentRadio = document.querySelector('input[name="payment"]:checked');
            let payment = 'Card';
            if (paymentRadio) {
                const label = paymentRadio.closest('.pay-option')?.querySelector('.pay-name')?.textContent || '';
                if (label.includes('Bank')) payment = 'Transfer';
                else if (label.includes('Cash')) payment = 'Cash';
                else payment = 'Card';
            }

            if (!nameEl || !phoneEl || !addressEl || !nameEl.value.trim() || !phoneEl.value.trim() || !addressEl.value.trim()) {
                showToast('Please fill in your delivery details');
                return;
            }

            const data = getOpsData();
            const groups = groupByVendor(cart);
            const today = new Date().toISOString().slice(0, 10);
            const createdIds = [];

            Object.keys(groups).forEach(vendorName => {
                const items = groups[vendorName].map(i => ({ name: i.name, qty: i.qty, price: i.price }));
                const newId = nextOrderId(data);
                const order = {
                    id: newId,
                    customer: customerName,
                    phone: customerPhone,
                    vendor: vendorName,
                    address,
                    payment,
                    status: 'pending',
                    riderId: null,
                    deliveryFee: DELIVERY_FEE,
                    date: today,
                    items,
                };
                data.orders.push(order);
                createdIds.push(newId);
                addNotification(data, `New order ${newId} from ${customerName} at ${vendorName}`, 'order');
            });

            saveOpsData(data);
            saveCart([]);
            window.location.href = 'order.html?orders=' + createdIds.join(',');
        });
    }
}


/* ---------------------------------------------------------
   FAQ accordion
   --------------------------------------------------------- */
function initFaqAccordion() {
    const items = document.querySelectorAll('.faq-item');
    if (!items.length) return;

    items.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        if (!question || !answer) return;

        question.addEventListener('click', () => {
            const isOpen = item.classList.contains('open');

            items.forEach(other => {
                other.classList.remove('open');
                const otherAnswer = other.querySelector('.faq-answer');
                if (otherAnswer) otherAnswer.style.maxHeight = null;
            });

            if (!isOpen) {
                item.classList.add('open');
                answer.style.maxHeight = answer.scrollHeight + 'px';
            }
        });
    });
}


/* ---------------------------------------------------------
   Contact / newsletter forms (front-end only demo behaviour)
   --------------------------------------------------------- */
function initContactForms() {
    document.querySelectorAll('.sub').forEach(btn => {
        if (btn.tagName !== 'BUTTON') return;
        btn.addEventListener('click', function () {
            const form = this.closest('form');
            if (form && !form.reportValidity()) return;
            alert('Thanks for reaching out! Our team will get back to you shortly.');
            if (form) form.reset();
        });
    });

    document.querySelectorAll('.subscribe-form').forEach(form => {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            alert('You are subscribed to SnappyBite updates!');
            this.reset();
        });
    });
}


/* ---------------------------------------------------------
   Login / Signup forms (front-end only demo behaviour)
   --------------------------------------------------------- */
function initAuthForms() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            window.location.href = 'dashboard-user.html';
        });
    }

    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', function (e) {
            e.preventDefault();
            window.location.href = 'login.html';
        });
    }
}


/* ---------------------------------------------------------
   Track order page: looks up a real order from the shared
   ops data store and renders live progress + rider info.
   --------------------------------------------------------- */
function initTrackOrder() {
    const form = document.getElementById('trackForm');
    const result = document.getElementById('trackResult');
    const notFound = document.getElementById('trackNotFound');
    if (!form || !result) return;

    const STEP_ORDER = ['pending', 'preparing', 'ready', 'transit', 'delivered'];
    const STEP_LABELS = {
        pending: 'Order Placed',
        preparing: 'Preparing',
        ready: 'Ready for Pickup',
        transit: 'Out for Delivery',
        delivered: 'Delivered',
    };
    const STEP_ICONS = {
        pending: '🧾',
        preparing: '👨‍🍳',
        ready: '📦',
        transit: '🛵',
        delivered: '🏠',
    };

    function renderOrder(order) {
        const data = getOpsData();
        const rider = order.riderId ? data.riders.find(r => r.id === order.riderId) : null;

        if (notFound) notFound.style.display = 'none';
        result.style.display = 'block';

        const stepsWrap = document.getElementById('trackStepsWrap');
        if (stepsWrap) {
            if (order.status === 'cancelled' || order.status === 'rejected') {
                stepsWrap.innerHTML = `
                    <div class="order-note" style="text-align:center; font-size:1rem;">
                        ${order.status === 'rejected' ? '❌ This order was declined by the vendor.' : '❌ This order was cancelled.'}
                    </div>
                `;
            } else {
                const currentIndex = STEP_ORDER.indexOf(order.status);
                const fillPercent = currentIndex <= 0 ? 0 : (currentIndex / (STEP_ORDER.length - 1)) * 100;

                stepsWrap.innerHTML = `
                    <div class="track-steps">
                        <div class="step-fill" style="width:${fillPercent}%;"></div>
                        ${STEP_ORDER.map((s, i) => `
                            <div class="track-step ${i < currentIndex ? 'done' : ''} ${i === currentIndex ? 'active' : ''}">
                                <div class="dot-ring">${i <= currentIndex ? (i === currentIndex ? STEP_ICONS[s] : '✓') : STEP_ICONS[s]}</div>
                                <div class="step-label">${STEP_LABELS[s]}</div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        }

        setText('trackOrderIdDisplay', order.id);
        setText('trackVendor', order.vendor);
        setText('trackRider', rider ? `${rider.name} · ${rider.phone}` : 'Not yet assigned');
        setText('trackAddress', order.address);
        setText('trackEta', etaLabel(order.status));
    }

    function etaLabel(status) {
        const map = {
            pending: 'Waiting for vendor to accept',
            preparing: 'Being prepared — 20–30 mins',
            ready: 'Waiting for a rider to pick up',
            transit: '15–20 mins',
            delivered: 'Delivered',
            cancelled: '—',
            rejected: '—',
        };
        return map[status] || '—';
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        const input = form.querySelector('input[type="text"]');
        const query = (input?.value || '').trim().toUpperCase();
        if (!query) return;

        const data = getOpsData();
        const order = data.orders.find(o => o.id.toUpperCase() === query);

        if (!order) {
            result.style.display = 'none';
            if (notFound) notFound.style.display = 'block';
            return;
        }

        renderOrder(order);
        result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // if arriving from an order confirmation link, auto-track it
    const params = new URLSearchParams(window.location.search);
    const preId = params.get('order');
    if (preId) {
        const data = getOpsData();
        const order = data.orders.find(o => o.id.toUpperCase() === preId.toUpperCase());
        if (order) {
            const input = form.querySelector('input[type="text"]');
            if (input) input.value = order.id;
            renderOrder(order);
        }
    }
}



/* =========================================================
   SHARED OPERATIONS DATA STORE
   Powers the Admin, Vendor, and Rider dashboards.
   Everything lives in localStorage so all three dashboards
   stay in sync — a vendor accepting an order, a rider
   accepting a waybill, or an admin override are all visible
   to each other immediately, and every meaningful event
   raises a notification the admin dashboard can see.

   ORDER LIFECYCLE:
   pending -> preparing -> ready -> transit -> delivered
                  \-> rejected           (vendor declines)
   pending/preparing/ready/transit -> cancelled  (admin)
   ========================================================= */

const OPS_KEY = 'snappybite_ops_data';

function seedOpsData() {
    const vendors = [
        { id: 'V1', name: 'The Red Coral', category: 'Continental', location: 'GRA Phase 2, Port Harcourt', status: 'active', rating: 4.4, phone: '0803 111 2233', joined: '2023-11-02' },
        { id: 'V2', name: "Casablanca Restaurant Sports Bar & Karaoke", category: 'Bar & Grill', location: 'Old GRA, Port Harcourt', status: 'active', rating: 4.2, phone: '0803 222 3344', joined: '2024-01-18' },
        { id: 'V3', name: 'Chicken Republic', category: 'Fast Food', location: 'Ikwerre Road, Port Harcourt', status: 'active', rating: 4.6, phone: '0803 333 4455', joined: '2022-06-10' },
        { id: 'V4', name: 'KFC', category: 'Fast Food', location: 'Woji, Port Harcourt', status: 'active', rating: 4.5, phone: '0803 444 5566', joined: '2022-03-21' },
        { id: 'V5', name: 'Kilimangaro Restaurant', category: 'Local Nigerian', location: 'Aba Road, Port Harcourt', status: 'active', rating: 4.7, phone: '0803 555 6677', joined: '2023-02-14' },
        { id: 'V6', name: "Domino's Restaurant", category: 'Pizza', location: 'Trans Amadi, Port Harcourt', status: 'active', rating: 4.5, phone: '0803 666 7788', joined: '2022-09-05' },
        { id: 'V7', name: "Kosy's Cuisine", category: 'Local Nigerian', location: 'Ada George, Port Harcourt', status: 'inactive', rating: 4.3, phone: '0803 777 8899', joined: '2024-05-30' },
        { id: 'V8', name: 'Yellow Chilli Restaurant', category: 'Continental', location: 'D-Line, Port Harcourt', status: 'active', rating: 4.6, phone: '0803 888 9900', joined: '2023-07-19' },
    ];

    const riders = [
        { id: 'R1', name: 'Chidi Okafor', phone: '0803 456 7890', status: 'busy' },
        { id: 'R2', name: 'Ifeanyi Bassey', phone: '0805 123 4567', status: 'available' },
        { id: 'R3', name: 'Tamuno Wiri', phone: '0806 987 6543', status: 'available' },
        { id: 'R4', name: 'Blessing Eze', phone: '0807 321 6549', status: 'offline' },
        { id: 'R5', name: 'Kelechi Nwosu', phone: '0809 654 1230', status: 'available' },
    ];

    const menuMaster = [
        ['Okra Soup', 4500], ['Jollof Rice', 4500], ['Beans and Plantain', 4200],
        ['Egusi Soup', 5000], ['Fish BBQ', 4500], ['Ham Burger', 4500],
        ['Fried Rice and Chicken', 4200], ['Suya', 3500], ['Shawarma', 3000], ['Spaghetti', 3800],
    ];

    const menu = [];
    let mId = 1;
    vendors.forEach((v, vi) => {
        const items = [menuMaster[vi % 10], menuMaster[(vi + 3) % 10], menuMaster[(vi + 6) % 10], menuMaster[(vi + 8) % 10]];
        items.forEach(([name, price]) => {
            menu.push({ id: 'M' + (mId++), vendorId: v.id, name, price, category: 'Meals', available: true });
        });
    });

    const DF = 1200; // flat delivery fee per vendor order

    const orders = [
        { id: 'SB-10234', customer: 'Chidinma Okoro', phone: '0812 000 1111', vendor: 'Kilimangaro Restaurant', address: '12 Aba Road, Port Harcourt', payment: 'Card', status: 'transit', riderId: 'R1', deliveryFee: DF, date: '2026-08-15', items: [{ name: 'Egusi Soup', qty: 1, price: 5000 }, { name: 'Fried Rice and Chicken', qty: 1, price: 4200 }] },
        { id: 'SB-10233', customer: 'James Brown', phone: '0812 000 2222', vendor: 'KFC', address: '4 Woji Road, Port Harcourt', payment: 'Cash', status: 'pending', riderId: null, deliveryFee: DF, date: '2026-08-16', items: [{ name: 'Fried Rice and Chicken', qty: 2, price: 4200 }] },
        { id: 'SB-10232', customer: 'Ibiere Amadi', phone: '0812 000 3333', vendor: "Kosy's Cuisine", address: '9 Ada George Rd, Port Harcourt', payment: 'Transfer', status: 'delivered', riderId: 'R2', deliveryFee: DF, date: '2026-08-10', items: [{ name: 'Egusi Soup', qty: 1, price: 5000 }] },
        { id: 'SB-10231', customer: 'Tamuno Wiri', phone: '0812 000 4444', vendor: "Domino's Restaurant", address: '1 Trans Amadi, Port Harcourt', payment: 'Card', status: 'cancelled', riderId: null, deliveryFee: DF, date: '2026-08-09', items: [{ name: 'Spaghetti', qty: 2, price: 3800 }] },
        { id: 'SB-10230', customer: 'Ngozi Eze', phone: '0812 000 5555', vendor: 'Chicken Republic', address: '18 Ikwerre Road, Port Harcourt', payment: 'Card', status: 'preparing', riderId: null, deliveryFee: DF, date: '2026-08-16', items: [{ name: 'Suya', qty: 1, price: 3500 }, { name: 'Jollof Rice', qty: 1, price: 4500 }] },
        { id: 'SB-10229', customer: 'Emeka Nwachukwu', phone: '0812 000 6666', vendor: 'The Red Coral', address: '5 GRA Phase 2, Port Harcourt', payment: 'Cash', status: 'delivered', riderId: 'R3', deliveryFee: DF, date: '2026-08-08', items: [{ name: 'Ham Burger', qty: 1, price: 4500 }] },
        { id: 'SB-10228', customer: 'Blessing Amadi', phone: '0812 000 7777', vendor: 'Yellow Chilli Restaurant', address: '22 D-Line, Port Harcourt', payment: 'Transfer', status: 'transit', riderId: 'R5', deliveryFee: DF, date: '2026-08-16', items: [{ name: 'Okra Soup', qty: 1, price: 4500 }, { name: 'Beans and Plantain', qty: 1, price: 4200 }] },
        { id: 'SB-10227', customer: 'Chukwuemeka Obi', phone: '0812 000 8888', vendor: 'KFC', address: '7 Woji Road, Port Harcourt', payment: 'Card', status: 'delivered', riderId: 'R2', deliveryFee: DF, date: '2026-08-05', items: [{ name: 'Shawarma', qty: 2, price: 3000 }] },
        { id: 'SB-10226', customer: 'Amaka Johnson', phone: '0812 000 9999', vendor: 'Kilimangaro Restaurant', address: '3 Aba Road, Port Harcourt', payment: 'Cash', status: 'pending', riderId: null, deliveryFee: DF, date: '2026-08-16', items: [{ name: 'Jollof Rice', qty: 1, price: 4500 }] },
        { id: 'SB-10225', customer: "Casablanca Regular", phone: '0812 000 1212', vendor: "Casablanca Restaurant Sports Bar & Karaoke", address: '2 Old GRA, Port Harcourt', payment: 'Card', status: 'ready', riderId: null, deliveryFee: DF, date: '2026-08-16', items: [{ name: 'Fish BBQ', qty: 1, price: 4500 }, { name: 'Suya', qty: 1, price: 3500 }] },
        { id: 'SB-10224', customer: 'Chika Obasi', phone: '0812 000 1414', vendor: 'Yellow Chilli Restaurant', address: '10 D-Line, Port Harcourt', payment: 'Cash', status: 'ready', riderId: null, deliveryFee: DF, date: '2026-08-16', items: [{ name: 'Okra Soup', qty: 1, price: 4500 }] },
        { id: 'SB-10223', customer: 'Uche Momah', phone: '0812 000 1515', vendor: 'Chicken Republic', address: '6 Ikwerre Road, Port Harcourt', payment: 'Card', status: 'rejected', riderId: null, deliveryFee: DF, date: '2026-08-14', items: [{ name: 'Suya', qty: 3, price: 3500 }] },
    ];

    const notifications = [
        { id: 'N1', message: 'Order SB-10225 is ready for pickup at Casablanca Restaurant Sports Bar & Karaoke', type: 'order', time: '2026-08-16T09:12:00', read: false },
        { id: 'N2', message: 'Order SB-10224 is ready for pickup at Yellow Chilli Restaurant', type: 'order', time: '2026-08-16T08:40:00', read: false },
        { id: 'N3', message: 'Chicken Republic rejected order SB-10223', type: 'vendor', time: '2026-08-14T17:05:00', read: true },
        { id: 'N4', message: 'Chidi Okafor accepted waybill for SB-10234', type: 'rider', time: '2026-08-15T13:22:00', read: true },
    ];

    const data = { vendors, riders, menu, orders, notifications };
    localStorage.setItem(OPS_KEY, JSON.stringify(data));
    return data;
}

function getOpsData() {
    try {
        const raw = localStorage.getItem(OPS_KEY);
        if (!raw) return seedOpsData();
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.vendors || !parsed.orders) return seedOpsData();
        if (!parsed.notifications) parsed.notifications = [];
        return parsed;
    } catch (e) {
        return seedOpsData();
    }
}

function saveOpsData(data) {
    localStorage.setItem(OPS_KEY, JSON.stringify(data));
}

function orderTotal(order) {
    return order.items.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function formatN(n) {
    return '₦' + Number(n).toLocaleString();
}

function nextOrderId(data) {
    let max = 10234;
    data.orders.forEach(o => {
        const num = parseInt(String(o.id).replace('SB-', ''), 10);
        if (!isNaN(num) && num > max) max = num;
    });
    return 'SB-' + (max + 1);
}

function addNotification(data, message, type) {
    if (!data.notifications) data.notifications = [];
    data.notifications.unshift({
        id: 'N' + Date.now() + Math.floor(Math.random() * 1000),
        message,
        type: type || 'system',
        time: new Date().toISOString(),
        read: false,
    });
    if (data.notifications.length > 50) data.notifications.length = 50;
}

function timeAgo(isoString) {
    const then = new Date(isoString).getTime();
    const now = Date.now();
    const diffMin = Math.max(0, Math.floor((now - then) / 60000));
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return diffMin + 'm ago';
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return diffHr + 'h ago';
    const diffDay = Math.floor(diffHr / 24);
    return diffDay + 'd ago';
}

function showToast(message) {
    let toast = document.getElementById('opsToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'opsToast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function statusPillHTML(status) {
    const map = {
        pending: ['pending', 'Pending'],
        preparing: ['pending', 'Preparing'],
        ready: ['ready', 'Ready for Pickup'],
        transit: ['transit', 'Out for delivery'],
        delivered: ['delivered', 'Delivered'],
        cancelled: ['cancelled', 'Cancelled'],
        rejected: ['cancelled', 'Rejected'],
        active: ['delivered', 'Active'],
        inactive: ['cancelled', 'Inactive'],
        available: ['delivered', 'Available'],
        busy: ['transit', 'Busy'],
        offline: ['cancelled', 'Offline'],
    };
    const [cls, label] = map[status] || ['pending', status];
    return `<span class="status-pill ${cls}">${label}</span>`;
}


/* =========================================================
   GENERIC MODAL HELPERS
   ========================================================= */
function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('open');
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
}

function wireModalDismiss() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('open');
        });
        overlay.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', () => overlay.classList.remove('open'));
        });
    });
}


/* =========================================================
   NOTIFICATION BELL (admin dashboard)
   ========================================================= */
function initNotificationBell(data, onChange) {
    const bellBtn = document.getElementById('notifBellBtn');
    const panel = document.getElementById('notifPanel');
    const listEl = document.getElementById('notifList');
    const badgeEl = document.getElementById('notifBadge');
    const markAllBtn = document.getElementById('notifMarkAllBtn');
    if (!bellBtn || !panel || !listEl) return { render: () => {} };

    function render() {
        const notifs = data.notifications || [];
        const unread = notifs.filter(n => !n.read).length;

        if (badgeEl) {
            badgeEl.textContent = unread;
            badgeEl.style.display = unread > 0 ? 'flex' : 'none';
        }

        listEl.innerHTML = notifs.slice(0, 20).map(n => `
            <div class="notif-item ${n.read ? '' : 'unread'}">
                <div class="notif-dot" style="${n.read ? 'background:transparent;' : ''}"></div>
                <div class="notif-text">
                    <div>${n.message}</div>
                    <div class="notif-time">${timeAgo(n.time)}</div>
                </div>
            </div>
        `).join('') || `<div class="notif-empty">No notifications yet.</div>`;
    }

    bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!panel.contains(e.target) && e.target !== bellBtn) {
            panel.classList.remove('open');
        }
    });

    if (markAllBtn) {
        markAllBtn.addEventListener('click', () => {
            (data.notifications || []).forEach(n => n.read = true);
            saveOpsData(data);
            render();
            if (onChange) onChange();
        });
    }

    render();
    return { render };
}


/* =========================================================
   ADMIN DASHBOARD
   ========================================================= */
function initAdminDashboard() {
    const root = document.getElementById('adminApp');
    if (!root) return;

    let data = getOpsData();
    let editingVendorId = null;
    let activeOrderId = null;

    wireModalDismiss();
    initTabs();
    const bell = initNotificationBell(data, renderAll);
    renderAll();

    /* ---------------- Tabs ---------------- */
    function initTabs() {
        const tabLinks = document.querySelectorAll('.dash-nav a[data-tab]');
        const panels = document.querySelectorAll('.dash-panel-view');

        tabLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = link.dataset.tab;

                tabLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                panels.forEach(p => p.classList.toggle('active', p.id === 'panel-' + target));
            });
        });
    }

    function renderAll() {
        renderOverview();
        renderOrdersTable();
        renderVendorsTable();
        renderRidersTable();
        populateOrderFilterOptions();
        if (bell) bell.render();
    }

    /* ---------------- Overview ---------------- */
    function renderOverview() {
        const dates = [...new Set(data.orders.map(o => o.date))].sort();
        const today = dates.length ? dates[dates.length - 1] : '2026-08-16';
        const todayOrders = data.orders.filter(o => o.date === today);
        const activeVendors = data.vendors.filter(v => v.status === 'active').length;
        const revenueToday = todayOrders.reduce((sum, o) => sum + orderTotal(o), 0);
        const cancelledCount = data.orders.filter(o => o.status === 'cancelled' || o.status === 'rejected').length;

        setText('statOrdersToday', todayOrders.length);
        setText('statActiveVendors', activeVendors);
        setText('statRevenueToday', formatN(revenueToday));
        setText('statCancelled', cancelledCount);

        const recentBody = document.getElementById('recentOrdersBody');
        if (recentBody) {
            const recent = [...data.orders].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
            recentBody.innerHTML = recent.map(o => `
                <tr>
                    <td>${o.id}</td>
                    <td>${o.customer}</td>
                    <td>${o.vendor}</td>
                    <td>${formatN(orderTotal(o))}</td>
                    <td>${statusPillHTML(o.status)}</td>
                    <td><a href="#" class="dash-table-action" data-view-order="${o.id}">View</a></td>
                </tr>
            `).join('') || `<tr class="empty-row"><td colspan="6">No orders yet.</td></tr>`;
        }

        const topBody = document.getElementById('topVendorsBody');
        if (topBody) {
            const stats = data.vendors.map(v => {
                const vOrders = data.orders.filter(o => o.vendor === v.name);
                const revenue = vOrders.reduce((sum, o) => sum + orderTotal(o), 0);
                return { ...v, orderCount: vOrders.length, revenue };
            }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

            topBody.innerHTML = stats.map(v => `
                <tr>
                    <td>${v.name}</td>
                    <td>${v.orderCount}</td>
                    <td>${formatN(v.revenue)}</td>
                    <td><span class="rating-chip">${v.rating} ★</span></td>
                </tr>
            `).join('') || `<tr class="empty-row"><td colspan="4">No vendors yet.</td></tr>`;
        }
    }

    /* ---------------- Orders tab ---------------- */
    function populateOrderFilterOptions() {
        const vendorFilter = document.getElementById('orderVendorFilter');
        if (vendorFilter && vendorFilter.dataset.filled !== '1') {
            vendorFilter.innerHTML = '<option value="">All Vendors</option>' +
                data.vendors.map(v => `<option value="${v.name}">${v.name}</option>`).join('');
            vendorFilter.dataset.filled = '1';
        }
    }

    function getFilteredOrders() {
        const search = (document.getElementById('orderSearch')?.value || '').toLowerCase().trim();
        const statusVal = document.getElementById('orderStatusFilter')?.value || '';
        const vendorVal = document.getElementById('orderVendorFilter')?.value || '';

        return data.orders.filter(o => {
            const matchesSearch = !search ||
                o.id.toLowerCase().includes(search) ||
                o.customer.toLowerCase().includes(search) ||
                o.vendor.toLowerCase().includes(search);
            const matchesStatus = !statusVal || o.status === statusVal;
            const matchesVendor = !vendorVal || o.vendor === vendorVal;
            return matchesSearch && matchesStatus && matchesVendor;
        });
    }

    function renderOrdersTable() {
        const body = document.getElementById('ordersTableBody');
        if (!body) return;

        const rows = getFilteredOrders();
        body.innerHTML = rows.map(o => `
            <tr>
                <td>${o.id}</td>
                <td>${o.customer}</td>
                <td>${o.vendor}</td>
                <td>${formatN(orderTotal(o))}</td>
                <td>${statusPillHTML(o.status)}</td>
                <td>${o.riderId ? (data.riders.find(r => r.id === o.riderId)?.name || '—') : '<span style="color:var(--muted);">Unassigned</span>'}</td>
                <td class="row-actions">
                    <button type="button" class="btn-icon-sm" data-view-order="${o.id}" title="View / Manage">👁</button>
                </td>
            </tr>
        `).join('') || `<tr class="empty-row"><td colspan="7">No orders match your filters.</td></tr>`;

        document.getElementById('orderCountLabel') &&
            (document.getElementById('orderCountLabel').textContent = `${rows.length} order${rows.length === 1 ? '' : 's'}`);
    }

    ['orderSearch', 'orderStatusFilter', 'orderVendorFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', renderOrdersTable);
    });

    document.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('[data-view-order]');
        if (viewBtn) {
            e.preventDefault();
            openOrderModal(viewBtn.dataset.viewOrder);
        }
    });

    function openOrderModal(orderId) {
        const order = data.orders.find(o => o.id === orderId);
        if (!order) return;
        activeOrderId = orderId;

        setText('modalOrderId', order.id);
        setText('modalOrderDate', order.date);
        setText('modalOrderCustomer', order.customer);
        setText('modalOrderPhone', order.phone);
        setText('modalOrderVendor', order.vendor);
        setText('modalOrderAddress', order.address);
        setText('modalOrderPayment', order.payment);

        const itemsBox = document.getElementById('modalOrderItems');
        if (itemsBox) {
            itemsBox.innerHTML = order.items.map(i => `
                <div class="oi-row"><span>${i.name} × ${i.qty}</span><span>${formatN(i.price * i.qty)}</span></div>
            `).join('') + `<div class="oi-row"><span>Total</span><span>${formatN(orderTotal(order))}</span></div>`;
        }

        const statusSelect = document.getElementById('modalOrderStatus');
        if (statusSelect) statusSelect.value = order.status;

        const riderSelect = document.getElementById('modalOrderRider');
        if (riderSelect) {
            riderSelect.innerHTML = '<option value="">Unassigned</option>' +
                data.riders.map(r => `<option value="${r.id}" ${r.id === order.riderId ? 'selected' : ''}>${r.name} (${r.status})</option>`).join('');
        }

        openModal('orderModal');
    }

    const saveOrderBtn = document.getElementById('saveOrderBtn');
    if (saveOrderBtn) {
        saveOrderBtn.addEventListener('click', () => {
            const order = data.orders.find(o => o.id === activeOrderId);
            if (!order) return;

            const newStatus = document.getElementById('modalOrderStatus').value;
            const newRider = document.getElementById('modalOrderRider').value || null;

            const statusChanged = order.status !== newStatus;
            order.status = newStatus;
            order.riderId = newRider;

            if (statusChanged) {
                addNotification(data, `Admin updated order ${order.id} to "${newStatus}"`, 'system');
            }

            saveOpsData(data);
            renderAll();
            closeModal('orderModal');
            showToast(`Order ${order.id} updated`);
        });
    }

    const cancelOrderBtn = document.getElementById('cancelOrderBtn');
    if (cancelOrderBtn) {
        cancelOrderBtn.addEventListener('click', () => {
            const order = data.orders.find(o => o.id === activeOrderId);
            if (!order) return;
            order.status = 'cancelled';
            addNotification(data, `Admin cancelled order ${order.id}`, 'system');
            saveOpsData(data);
            renderAll();
            closeModal('orderModal');
            showToast(`Order ${order.id} cancelled`);
        });
    }

    /* ---------------- Vendors tab ---------------- */
    function renderVendorsTable() {
        const body = document.getElementById('vendorsTableBody');
        if (!body) return;

        const search = (document.getElementById('vendorSearch')?.value || '').toLowerCase().trim();
        const rows = data.vendors.filter(v => !search || v.name.toLowerCase().includes(search) || v.category.toLowerCase().includes(search));

        body.innerHTML = rows.map(v => {
            const vOrders = data.orders.filter(o => o.vendor === v.name);
            const revenue = vOrders.reduce((sum, o) => sum + orderTotal(o), 0);
            return `
            <tr>
                <td>${v.name}</td>
                <td>${v.category}</td>
                <td>${vOrders.length}</td>
                <td>${formatN(revenue)}</td>
                <td><span class="rating-chip">${v.rating} ★</span></td>
                <td>
                    <label class="toggle-switch">
                        <input type="checkbox" data-vendor-toggle="${v.id}" ${v.status === 'active' ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </td>
                <td class="row-actions">
                    <button type="button" class="btn-icon-sm" data-edit-vendor="${v.id}" title="Edit">✎</button>
                    <a href="vendor-dashboard.html?vendor=${v.id}" class="btn-icon-sm" title="Open Vendor Dashboard" style="text-decoration:none;">🏪</a>
                    <button type="button" class="btn-icon-sm danger" data-delete-vendor="${v.id}" title="Remove">✕</button>
                </td>
            </tr>
        `;
        }).join('') || `<tr class="empty-row"><td colspan="7">No vendors match your search.</td></tr>`;
    }

    const vendorSearchEl = document.getElementById('vendorSearch');
    if (vendorSearchEl) vendorSearchEl.addEventListener('input', renderVendorsTable);

    document.addEventListener('change', (e) => {
        const toggle = e.target.closest('[data-vendor-toggle]');
        if (toggle) {
            const v = data.vendors.find(x => x.id === toggle.dataset.vendorToggle);
            if (v) {
                v.status = toggle.checked ? 'active' : 'inactive';
                addNotification(data, `${v.name} marked ${v.status} by admin`, 'system');
                saveOpsData(data);
                renderOverview();
                if (bell) bell.render();
                showToast(`${v.name} is now ${v.status}`);
            }
        }
        const riderToggle = e.target.closest('[data-rider-toggle]');
        if (riderToggle) {
            const r = data.riders.find(x => x.id === riderToggle.dataset.riderToggle);
            if (r) {
                r.status = riderToggle.value;
                saveOpsData(data);
                renderRidersTable();
                showToast(`${r.name} marked ${r.status}`);
            }
        }
    });

    const addVendorBtn = document.getElementById('addVendorBtn');
    if (addVendorBtn) {
        addVendorBtn.addEventListener('click', () => {
            editingVendorId = null;
            setText('vendorModalTitle', 'Add Vendor');
            document.getElementById('vendorForm').reset();
            openModal('vendorModal');
        });
    }

    document.addEventListener('click', (e) => {
        const editBtn = e.target.closest('[data-edit-vendor]');
        if (editBtn) {
            const v = data.vendors.find(x => x.id === editBtn.dataset.editVendor);
            if (!v) return;
            editingVendorId = v.id;
            setText('vendorModalTitle', 'Edit Vendor');
            document.getElementById('vendorName').value = v.name;
            document.getElementById('vendorCategory').value = v.category;
            document.getElementById('vendorLocation').value = v.location;
            document.getElementById('vendorPhone').value = v.phone;
            openModal('vendorModal');
        }

        const delBtn = e.target.closest('[data-delete-vendor]');
        if (delBtn) {
            const v = data.vendors.find(x => x.id === delBtn.dataset.deleteVendor);
            if (!v) return;
            if (confirm(`Remove ${v.name} from the platform?`)) {
                data.vendors = data.vendors.filter(x => x.id !== v.id);
                saveOpsData(data);
                renderAll();
                showToast(`${v.name} removed`);
            }
        }
    });

    const vendorForm = document.getElementById('vendorForm');
    if (vendorForm) {
        vendorForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('vendorName').value.trim();
            const category = document.getElementById('vendorCategory').value.trim();
            const location = document.getElementById('vendorLocation').value.trim();
            const phone = document.getElementById('vendorPhone').value.trim();
            if (!name) return;

            if (editingVendorId) {
                const v = data.vendors.find(x => x.id === editingVendorId);
                Object.assign(v, { name, category, location, phone });
                showToast(`${name} updated`);
            } else {
                const newId = 'V' + (data.vendors.length + 1 + Math.floor(Math.random() * 1000));
                data.vendors.push({ id: newId, name, category, location, phone, status: 'active', rating: 4.0, joined: '2026-08-16' });
                addNotification(data, `New vendor "${name}" added to the platform`, 'system');
                showToast(`${name} added`);
            }

            saveOpsData(data);
            renderAll();
            closeModal('vendorModal');
        });
    }

    /* ---------------- Riders tab ---------------- */
    function renderRidersTable() {
        const body = document.getElementById('ridersTableBody');
        if (!body) return;

        body.innerHTML = data.riders.map(r => {
            const activeOrder = data.orders.find(o => o.riderId === r.id && (o.status === 'transit' || o.status === 'ready'));
            return `
            <tr>
                <td>${r.name}</td>
                <td>${r.phone}</td>
                <td>${activeOrder ? activeOrder.id : '—'}</td>
                <td>
                    <select class="status-select" data-rider-toggle="${r.id}">
                        <option value="available" ${r.status === 'available' ? 'selected' : ''}>Available</option>
                        <option value="busy" ${r.status === 'busy' ? 'selected' : ''}>Busy</option>
                        <option value="offline" ${r.status === 'offline' ? 'selected' : ''}>Offline</option>
                    </select>
                </td>
                <td class="row-actions">
                    <a href="rider-dashboard.html?rider=${r.id}" class="btn-icon-sm" title="Open Rider Dashboard" style="text-decoration:none;">🛵</a>
                    <button type="button" class="btn-icon-sm danger" data-delete-rider="${r.id}" title="Remove">✕</button>
                </td>
            </tr>
        `;
        }).join('') || `<tr class="empty-row"><td colspan="5">No riders yet.</td></tr>`;
    }

    const addRiderBtn = document.getElementById('addRiderBtn');
    if (addRiderBtn) {
        addRiderBtn.addEventListener('click', () => {
            document.getElementById('riderForm').reset();
            openModal('riderModal');
        });
    }

    document.addEventListener('click', (e) => {
        const delRiderBtn = e.target.closest('[data-delete-rider]');
        if (delRiderBtn) {
            const r = data.riders.find(x => x.id === delRiderBtn.dataset.deleteRider);
            if (!r) return;
            if (confirm(`Remove rider ${r.name}?`)) {
                data.riders = data.riders.filter(x => x.id !== r.id);
                saveOpsData(data);
                renderRidersTable();
                showToast(`${r.name} removed`);
            }
        }
    });

    const riderForm = document.getElementById('riderForm');
    if (riderForm) {
        riderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('riderName').value.trim();
            const phone = document.getElementById('riderPhone').value.trim();
            if (!name) return;
            const newId = 'R' + (data.riders.length + 1 + Math.floor(Math.random() * 1000));
            data.riders.push({ id: newId, name, phone, status: 'available' });
            addNotification(data, `New rider "${name}" added to the fleet`, 'system');
            saveOpsData(data);
            renderRidersTable();
            if (bell) bell.render();
            closeModal('riderModal');
            showToast(`${name} added to riders`);
        });
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }
}


/* =========================================================
   VENDOR DASHBOARD
   Vendors accept or reject incoming orders, mark them ready
   for pickup, and manage their own menu. Every action here
   raises a notification visible on the admin dashboard.
   ========================================================= */
function initVendorDashboard() {
    const root = document.getElementById('vendorApp');
    if (!root) return;

    let data = getOpsData();

    const params = new URLSearchParams(window.location.search);
    let currentVendorId = params.get('vendor') || (data.vendors[0] && data.vendors[0].id);
    let editingMenuId = null;

    wireModalDismiss();
    populateVendorSwitcher();
    renderVendor();

    function populateVendorSwitcher() {
        const select = document.getElementById('vendorSwitcher');
        if (!select) return;
        select.innerHTML = data.vendors.map(v => `<option value="${v.id}" ${v.id === currentVendorId ? 'selected' : ''}>${v.name}</option>`).join('');
        select.addEventListener('change', () => {
            currentVendorId = select.value;
            const url = new URL(window.location.href);
            url.searchParams.set('vendor', currentVendorId);
            window.history.replaceState({}, '', url);
            renderVendor();
        });
    }

    function currentVendor() {
        return data.vendors.find(v => v.id === currentVendorId) || data.vendors[0];
    }

    function renderVendor() {
        const vendor = currentVendor();
        if (!vendor) return;

        setText('vendorNameHeading', vendor.name);
        setText('vendorCategoryLabel', vendor.category + ' · ' + vendor.location);

        const vOrders = data.orders.filter(o => o.vendor === vendor.name);
        const needsAction = vOrders.filter(o => o.status === 'pending').length;
        const activeOrders = vOrders.filter(o => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready' || o.status === 'transit');
        const revenue = vOrders.filter(o => o.status !== 'rejected' && o.status !== 'cancelled').reduce((sum, o) => sum + orderTotal(o), 0);
        const vMenu = data.menu.filter(m => m.vendorId === vendor.id);

        setText('vendorStatTotalOrders', vOrders.length);
        setText('vendorStatActiveOrders', activeOrders.length);
        setText('vendorStatRevenue', formatN(revenue));
        setText('vendorStatMenuCount', vMenu.length);

        const needsBadge = document.getElementById('vendorNeedsActionBadge');
        if (needsBadge) {
            needsBadge.textContent = needsAction;
            needsBadge.style.display = needsAction > 0 ? 'inline-flex' : 'none';
        }

        renderVendorOrders(vendor, vOrders);
        renderVendorMenu(vendor, vMenu);
    }

    function renderVendorOrders(vendor, vOrders) {
        const body = document.getElementById('vendorOrdersBody');
        if (!body) return;

        const filterVal = document.getElementById('vendorOrderStatusFilter')?.value || '';
        const rows = vOrders.filter(o => !filterVal || o.status === filterVal)
            .sort((a, b) => b.date.localeCompare(a.date));

        body.innerHTML = rows.map(o => {
            const rider = o.riderId ? data.riders.find(r => r.id === o.riderId) : null;
            let actionHTML = '';

            if (o.status === 'pending') {
                actionHTML = `
                    <button type="button" class="btn-accept" data-vendor-accept="${o.id}">Accept</button>
                    <button type="button" class="btn-reject" data-vendor-reject="${o.id}">Reject</button>
                `;
            } else if (o.status === 'preparing') {
                actionHTML = `<button type="button" class="btn-ready" data-vendor-ready="${o.id}">Mark Ready for Pickup</button>`;
            } else if (o.status === 'ready') {
                actionHTML = rider
                    ? `<span class="waybill-status-note">Assigned to ${rider.name} · awaiting pickup</span>`
                    : `<span class="waybill-status-note">Waiting for a rider to accept this waybill</span>`;
            } else if (o.status === 'transit') {
                actionHTML = `<span class="waybill-status-note">Out for delivery${rider ? ' with ' + rider.name : ''}</span>`;
            } else {
                actionHTML = '';
            }

            return `
            <tr>
                <td>${o.id}</td>
                <td>${o.customer}</td>
                <td>${o.items.map(i => `${i.name} ×${i.qty}`).join(', ')}</td>
                <td>${formatN(orderTotal(o))}</td>
                <td>${statusPillHTML(o.status)}</td>
                <td class="row-actions">${actionHTML}</td>
            </tr>
        `;
        }).join('') || `<tr class="empty-row"><td colspan="6">No orders for this vendor yet.</td></tr>`;
    }

    const vendorOrderFilter = document.getElementById('vendorOrderStatusFilter');
    if (vendorOrderFilter) {
        vendorOrderFilter.addEventListener('change', () => {
            const vendor = currentVendor();
            renderVendorOrders(vendor, data.orders.filter(o => o.vendor === vendor.name));
        });
    }

    document.addEventListener('click', (e) => {
        const acceptBtn = e.target.closest('[data-vendor-accept]');
        if (acceptBtn) {
            const order = data.orders.find(o => o.id === acceptBtn.dataset.vendorAccept);
            if (order) {
                order.status = 'preparing';
                addNotification(data, `${order.vendor} accepted order ${order.id}`, 'vendor');
                saveOpsData(data);
                renderVendor();
                showToast(`Order ${order.id} accepted`);
            }
        }

        const rejectBtn = e.target.closest('[data-vendor-reject]');
        if (rejectBtn) {
            const order = data.orders.find(o => o.id === rejectBtn.dataset.vendorReject);
            if (order && confirm(`Reject order ${order.id}? The customer will be notified.`)) {
                order.status = 'rejected';
                addNotification(data, `${order.vendor} rejected order ${order.id}`, 'vendor');
                saveOpsData(data);
                renderVendor();
                showToast(`Order ${order.id} rejected`);
            }
        }

        const readyBtn = e.target.closest('[data-vendor-ready]');
        if (readyBtn) {
            const order = data.orders.find(o => o.id === readyBtn.dataset.vendorReady);
            if (order) {
                order.status = 'ready';
                addNotification(data, `Order ${order.id} is ready for pickup at ${order.vendor}`, 'order');
                saveOpsData(data);
                renderVendor();
                showToast(`Order ${order.id} marked ready — waiting for a rider`);
            }
        }

        const availToggle = e.target.closest('[data-menu-toggle]');
        if (availToggle) {
            const item = data.menu.find(m => m.id === availToggle.dataset.menuToggle);
            if (item) {
                item.available = availToggle.checked;
                saveOpsData(data);
                showToast(`${item.name} marked ${item.available ? 'available' : 'unavailable'}`);
            }
        }
    });

    function renderVendorMenu(vendor, vMenu) {
        const list = document.getElementById('vendorMenuList');
        if (!list) return;

        list.innerHTML = vMenu.map(m => `
            <div class="menu-item-card">
                <div class="mi-thumb">🍽️</div>
                <div class="mi-info">
                    <h4>${m.name}</h4>
                    <span>${m.category}</span>
                </div>
                <label class="toggle-switch" title="Available">
                    <input type="checkbox" data-menu-toggle="${m.id}" ${m.available ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
                <div class="mi-price">${formatN(m.price)}</div>
                <button type="button" class="btn-icon-sm" data-edit-menu="${m.id}" title="Edit">✎</button>
                <button type="button" class="btn-icon-sm danger" data-delete-menu="${m.id}" title="Remove">✕</button>
            </div>
        `).join('') || `<p style="color:var(--muted); text-align:center; padding:24px;">No menu items yet. Add your first dish.</p>`;
    }

    const addMenuBtn = document.getElementById('addMenuItemBtn');
    if (addMenuBtn) {
        addMenuBtn.addEventListener('click', () => {
            editingMenuId = null;
            setText('menuModalTitle', 'Add Menu Item');
            document.getElementById('menuItemForm').reset();
            openModal('menuItemModal');
        });
    }

    document.addEventListener('click', (e) => {
        const editBtn = e.target.closest('[data-edit-menu]');
        if (editBtn) {
            const item = data.menu.find(m => m.id === editBtn.dataset.editMenu);
            if (!item) return;
            editingMenuId = item.id;
            setText('menuModalTitle', 'Edit Menu Item');
            document.getElementById('menuItemName').value = item.name;
            document.getElementById('menuItemCategory').value = item.category;
            document.getElementById('menuItemPrice').value = item.price;
            openModal('menuItemModal');
        }

        const delBtn = e.target.closest('[data-delete-menu]');
        if (delBtn) {
            const item = data.menu.find(m => m.id === delBtn.dataset.deleteMenu);
            if (!item) return;
            if (confirm(`Remove "${item.name}" from your menu?`)) {
                data.menu = data.menu.filter(m => m.id !== item.id);
                saveOpsData(data);
                renderVendor();
                showToast(`${item.name} removed from menu`);
            }
        }
    });

    const menuItemForm = document.getElementById('menuItemForm');
    if (menuItemForm) {
        menuItemForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const vendor = currentVendor();
            const name = document.getElementById('menuItemName').value.trim();
            const category = document.getElementById('menuItemCategory').value.trim() || 'Meals';
            const price = parseInt(document.getElementById('menuItemPrice').value, 10) || 0;
            if (!name) return;

            if (editingMenuId) {
                const item = data.menu.find(m => m.id === editingMenuId);
                Object.assign(item, { name, category, price });
                showToast(`${name} updated`);
            } else {
                const newId = 'M' + (data.menu.length + 1 + Math.floor(Math.random() * 1000));
                data.menu.push({ id: newId, vendorId: vendor.id, name, category, price, available: true });
                showToast(`${name} added to menu`);
            }

            saveOpsData(data);
            renderVendor();
            closeModal('menuItemModal');
        });
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }
}


/* =========================================================
   RIDER DASHBOARD
   Riders browse unassigned "waybills" (orders marked ready
   for pickup by a vendor), accept the ones they want, start
   the delivery, then mark it delivered. Every action raises
   a notification visible on the admin dashboard.
   ========================================================= */
function initRiderDashboard() {
    const root = document.getElementById('riderApp');
    if (!root) return;

    let data = getOpsData();

    const params = new URLSearchParams(window.location.search);
    let currentRiderId = params.get('rider') || (data.riders[0] && data.riders[0].id);

    populateRiderSwitcher();
    renderRider();

    function populateRiderSwitcher() {
        const select = document.getElementById('riderSwitcher');
        if (!select) return;
        select.innerHTML = data.riders.map(r => `<option value="${r.id}" ${r.id === currentRiderId ? 'selected' : ''}>${r.name}</option>`).join('');
        select.addEventListener('change', () => {
            currentRiderId = select.value;
            const url = new URL(window.location.href);
            url.searchParams.set('rider', currentRiderId);
            window.history.replaceState({}, '', url);
            renderRider();
        });
    }

    function currentRider() {
        return data.riders.find(r => r.id === currentRiderId) || data.riders[0];
    }

    function renderRider() {
        const rider = currentRider();
        if (!rider) return;

        setText('riderNameHeading', rider.name);
        setText('riderPhoneLabel', rider.phone);

        const statusSelect = document.getElementById('riderStatusSelect');
        if (statusSelect) statusSelect.value = rider.status;

        const available = data.orders.filter(o => o.status === 'ready' && !o.riderId);
        const myActive = data.orders.filter(o => o.riderId === rider.id && (o.status === 'ready' || o.status === 'transit'));
        const myDelivered = data.orders.filter(o => o.riderId === rider.id && o.status === 'delivered');
        const earnings = myDelivered.reduce((sum, o) => sum + (o.deliveryFee || 1200), 0);

        const todayDates = [...new Set(data.orders.map(o => o.date))].sort();
        const today = todayDates.length ? todayDates[todayDates.length - 1] : '2026-08-16';
        const deliveredToday = myDelivered.filter(o => o.date === today).length;

        setText('riderStatAvailable', available.length);
        setText('riderStatActive', myActive.length);
        setText('riderStatToday', deliveredToday);
        setText('riderStatEarnings', formatN(earnings));

        renderAvailableWaybills(rider, available);
        renderMyDeliveries(rider, myActive);
        renderDeliveryHistory(rider, myDelivered);
    }

    function renderAvailableWaybills(rider, available) {
        const body = document.getElementById('availableWaybillsBody');
        if (!body) return;

        body.innerHTML = available.map(o => `
            <tr>
                <td>${o.id}</td>
                <td>${o.vendor}</td>
                <td>${o.address}</td>
                <td>${formatN(o.deliveryFee || 1200)}</td>
                <td class="row-actions">
                    <button type="button" class="btn-accept" data-rider-accept="${o.id}">Accept Waybill</button>
                </td>
            </tr>
        `).join('') || `<tr class="empty-row"><td colspan="5">No waybills available right now. Check back soon.</td></tr>`;
    }

    function renderMyDeliveries(rider, myActive) {
        const body = document.getElementById('myDeliveriesBody');
        if (!body) return;

        body.innerHTML = myActive.sort((a, b) => a.status === 'ready' ? -1 : 1).map(o => {
            const actionHTML = o.status === 'ready'
                ? `<button type="button" class="btn-ready" data-rider-start="${o.id}">Start Delivery</button>`
                : `<button type="button" class="btn-accept" data-rider-deliver="${o.id}">Mark Delivered</button>`;

            return `
            <tr>
                <td>${o.id}</td>
                <td>${o.vendor}</td>
                <td>${o.customer}<br><span style="color:var(--muted); font-size:0.8rem;">${o.phone}</span></td>
                <td>${o.address}</td>
                <td>${statusPillHTML(o.status)}</td>
                <td class="row-actions">${actionHTML}</td>
            </tr>
        `;
        }).join('') || `<tr class="empty-row"><td colspan="6">No active deliveries. Accept a waybill to get started.</td></tr>`;
    }

    function renderDeliveryHistory(rider, myDelivered) {
        const body = document.getElementById('deliveryHistoryBody');
        if (!body) return;

        const rows = [...myDelivered].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15);
        body.innerHTML = rows.map(o => `
            <tr>
                <td>${o.id}</td>
                <td>${o.vendor}</td>
                <td>${o.date}</td>
                <td>${formatN(o.deliveryFee || 1200)}</td>
                <td>${statusPillHTML('delivered')}</td>
            </tr>
        `).join('') || `<tr class="empty-row"><td colspan="5">No completed deliveries yet.</td></tr>`;
    }

    document.addEventListener('click', (e) => {
        const rider = currentRider();
        if (!rider) return;

        const acceptBtn = e.target.closest('[data-rider-accept]');
        if (acceptBtn) {
            const order = data.orders.find(o => o.id === acceptBtn.dataset.riderAccept);
            if (order && !order.riderId) {
                order.riderId = rider.id;
                if (rider.status === 'available') rider.status = 'busy';
                addNotification(data, `${rider.name} accepted waybill for ${order.id}`, 'rider');
                saveOpsData(data);
                renderRider();
                showToast(`Waybill ${order.id} accepted`);
            }
        }

        const startBtn = e.target.closest('[data-rider-start]');
        if (startBtn) {
            const order = data.orders.find(o => o.id === startBtn.dataset.riderStart);
            if (order) {
                order.status = 'transit';
                addNotification(data, `${rider.name} picked up order ${order.id} — out for delivery`, 'rider');
                saveOpsData(data);
                renderRider();
                showToast(`Order ${order.id} is out for delivery`);
            }
        }

        const deliverBtn = e.target.closest('[data-rider-deliver]');
        if (deliverBtn) {
            const order = data.orders.find(o => o.id === deliverBtn.dataset.riderDeliver);
            if (order) {
                order.status = 'delivered';
                addNotification(data, `Order ${order.id} delivered by ${rider.name}`, 'rider');

                const stillActive = data.orders.some(o => o.riderId === rider.id && (o.status === 'ready' || o.status === 'transit'));
                if (!stillActive) rider.status = 'available';

                saveOpsData(data);
                renderRider();
                showToast(`Order ${order.id} marked delivered 🎉`);
            }
        }
    });

    const statusSelect = document.getElementById('riderStatusSelect');
    if (statusSelect) {
        statusSelect.addEventListener('change', () => {
            const rider = currentRider();
            if (rider) {
                rider.status = statusSelect.value;
                saveOpsData(data);
                showToast(`You're now marked ${rider.status}`);
            }
        });
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }
}


/* =========================================================
   ORDER CONFIRMATION PAGE
   Reads the order IDs created at checkout (one per vendor)
   and renders each as a confirmation card with a live link
   to track it.
   ========================================================= */
function initOrderConfirmation() {
    const container = document.getElementById('orderConfirmList');
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const idsParam = params.get('orders') || params.get('order');
    const data = getOpsData();

    let orders = [];
    if (idsParam) {
        const ids = idsParam.split(',').map(s => s.trim().toUpperCase());
        orders = data.orders.filter(o => ids.includes(o.id.toUpperCase()));
    }

    if (!orders.length) {
        orders = [...data.orders].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 1);
    }

    container.innerHTML = orders.map(o => `
        <div class="track-order-card" style="text-align:left; margin-bottom:18px;">
            <div class="row"><span>Order ID</span><span>${o.id}</span></div>
            <div class="row"><span>Vendor</span><span>${o.vendor}</span></div>
            <div class="row"><span>Total</span><span>${formatN(orderTotal(o) + (o.deliveryFee || 1200))}</span></div>
            <div class="row"><span>Payment Method</span><span>${o.payment}</span></div>
            <div class="row"><span>Status</span><span>${statusPillHTML(o.status)}</span></div>
        </div>
    `).join('');

    const trackLink = document.getElementById('trackFirstOrderLink');
    if (trackLink && orders.length) {
        trackLink.href = `track-order.html?order=${orders[0].id}`;
    }
}
