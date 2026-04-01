document.addEventListener('DOMContentLoaded', () => {
    // --- Header Scrolled Effect ---
    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // --- Smooth Scrolling ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            e.preventDefault();
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                // Adjust for fixed header
                const headerHeight = header.offsetHeight;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.scrollY - headerHeight;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // --- Tabs Navigation ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active classes
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked button
            btn.classList.add('active');

            // Show target content
            const target = btn.getAttribute('data-tab');
            document.getElementById(target).classList.add('active');
        });
    });
});

// --- Modal Functions ---
const modal = document.getElementById('frm-contact-v2');

function openModal() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
}

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});


document.addEventListener("DOMContentLoaded", function () {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const btn = item.querySelector('.faq-question');
        btn.addEventListener('click', () => {
            const isActive = item.classList.contains('active');

            // Close all
            faqItems.forEach(i => i.classList.remove('active'));

            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
});

// --- Form to Google Sheets ---
// TODO: Thay link bên dưới bằng link Web App thật sau khi deploy Google Apps Script
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzhbu4z_sEQ4LrZ3nL-ZaHYiQmukFiu-fS_D4pxsOvbdje1F6uyC9M19TJJJ9-qRKml/exec';

window.handleFormSubmit = function (event) {
    event.preventDefault();
    const form = event.target;
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;

    // Hiển thị trạng thái Loading
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ĐANG GỬI...';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    // Chuẩn bị Dữ liệu
    const formData = new FormData(form);

    // Thu thập URL (chứa UTM tags ads) và Nguồn giới thiệu
    formData.append('source_url', window.location.href);
    formData.append('referrer', document.referrer);

    // Chuyển thành URLSearchParams để Google Apps Script đọc được
    const urlParams = new URLSearchParams(formData);

    // Gửi dữ liệu (mode no-cors để vượt qua chính sách CORS của Google)
    fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        body: urlParams,
        mode: 'no-cors'
    }).then(() => {
        // Bắn sự kiện Lead tracking (Meta + TikTok) trước khi reset/redirect
        const emailVal = formData.get('email') || '';
        const phoneVal = formData.get('phone') || '';
        processLeadTracking(emailVal, phoneVal);

        // Lưu thông tin khách vào bộ nhớ tạm thời của trình duyệt
        sessionStorage.setItem('celestine_guest_name', formData.get('fullname') || '');
        sessionStorage.setItem('celestine_guest_phone', formData.get('phone') || '');

        // Chuyển nút sang trạng thái đang chuyển hướng
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CHUYỂN HƯỚNG...';
        btn.style.background = '#28a745';

        // Tự động chuyển trang sau nửa giây
        setTimeout(() => {
            window.location.href = 'thank-you.html';
        }, 500);
    }).catch(error => {
        console.error('Lỗi khi gửi form:', error);
        btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> LỖI, THỬ LẠI!';
        btn.style.background = '#dc3545';
        btn.style.opacity = '1';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
            btn.style.background = '';
        }, 3000);
    });
};

/* ==========================================================================
   TRACKING EVENTS SYSTEM — Meta CAPI + TikTok Events API (2 luồng Browser + Server)
   ========================================================================== */

// --- META CONVERSIONS API ---
const META_PIXEL_ID = '1623653145273859';
const META_ACCESS_TOKEN = 'EAAbgAI743HsBQ1FXoz9uV8FrHZCYZBMfQjZB587Hms6P08oR0C0y8KKkFB1KdW1ZCBBgeionXWRoMmQ6ZCYFu3ZAhcvYzEqympXJ2DhcWuexCwPZCDZCkR8v975ZCJv2xk8JMjsXWhYuFBOVPlN8ww2HJn1AFZCMnl64nJf2u9kZAZBzoW5rbNIO8MldhKWHf1YytTe4wwZDZD';

// --- TIKTOK EVENTS API ---
const TIKTOK_PIXEL_ID = 'D3N0STRC77U93U3SVAC0';
const TIKTOK_ACCESS_TOKEN = '0506a42f1a31152cfdb1ca9fb223b884f84af302';

// Ánh xạ tên sự kiện sang chuẩn TikTok
const TIKTOK_EVENT_MAP = {
    'ViewContent': 'ViewContent',
    'Lead': 'SubmitForm',
    'PageView': 'Pageview',
    'Purchase': 'CompletePayment',
    'AddToCart': 'AddToCart'
};

// 1. Tạo event_id chống trùng lặp (Deduplication)
function generateEventId() {
    return 'evt_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

// 2. Mã hoá SHA256 cho dữ liệu PII (Email, Phone)
async function hashSHA256(string) {
    if (!string) return null;
    const utf8 = new TextEncoder().encode(string);
    const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 3a. Bắn sự kiện lên Meta Conversions API (Server-side)
async function sendToMetaCAPI(eventName, eventId, eventData = {}, userData = {}) {
    const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    };
    if (getCookie('_fbp')) userData.fbp = getCookie('_fbp');
    if (getCookie('_fbc')) userData.fbc = getCookie('_fbc');

    const payload = {
        data: [{
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'website',
            event_id: eventId,
            event_source_url: window.location.href,
            user_data: { client_user_agent: navigator.userAgent, ...userData },
            custom_data: eventData
        }]
    };

    try {
        const response = await fetch(`https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.error) console.error(`🔴 [Meta CAPI] Lỗi (${eventName}):`, result.error.message);
        else console.log(`🟢 [Meta CAPI] Bắn thành công ${eventName}! ID: ${eventId}`);
    } catch (err) {
        console.error(`🔴 [Meta CAPI] Lỗi mạng (${eventName}):`, err);
    }
}

// 3b. Bắn sự kiện lên TikTok Events API (Server-side)
async function sendToTikTokEventsAPI(eventName, eventId, userData = {}) {
    const tiktokEventName = TIKTOK_EVENT_MAP[eventName] || eventName;

    const payload = {
        pixel_code: TIKTOK_PIXEL_ID,
        event_source: 'web',
        event_source_id: TIKTOK_PIXEL_ID,
        data: [{
            event: tiktokEventName,
            event_time: Math.floor(Date.now() / 1000),
            event_id: eventId,
            page: { url: window.location.href, referrer: document.referrer || '' },
            user: { user_agent: navigator.userAgent, ...userData },
            properties: {}
        }]
    };

    try {
        const response = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Access-Token': TIKTOK_ACCESS_TOKEN
            },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.code !== 0) console.error(`🔴 [TikTok EAPI] Lỗi (${tiktokEventName}):`, result.message);
        else console.log(`🟢 [TikTok EAPI] Bắn thành công ${tiktokEventName}! ID: ${eventId}`);
    } catch (err) {
        console.error(`🔴 [TikTok EAPI] Lỗi mạng (${tiktokEventName}):`, err);
    }
}

// 4. Hàm điều phối bắn 3 luồng đồng thời
window.fireTrackingEvent = function (eventName, eventData = {}, userCapiData = {}) {
    const currentEventId = generateEventId();
    console.log(`🚀 [Tracking] ${eventName} | ID: ${currentEventId}`, eventData);

    // Luồng 1a: Meta Pixel - Browser
    if (typeof fbq === 'function') {
        fbq('track', eventName, eventData, { eventID: currentEventId });
    }
    // Luồng 1b: TikTok Pixel - Browser
    if (typeof ttq === 'object') {
        const ttqEventName = TIKTOK_EVENT_MAP[eventName] || eventName;
        ttq.track(ttqEventName, eventData);
    }

    // Luồng 2: Server-side (non-blocking)
    sendToMetaCAPI(eventName, currentEventId, eventData, userCapiData);
    sendToTikTokEventsAPI(eventName, currentEventId, userCapiData);
};

// --- TRIGGER: ViewContent (15s ở lại + cuộn 50% trang) ---
let viewContentTrigged = false, hasScrolled50 = false, hasStayed15s = false;
setTimeout(() => { hasStayed15s = true; checkViewContent(); }, 15000);

window.addEventListener('scroll', () => {
    if (hasScrolled50) return;
    const scrollH = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (scrollH === 0) return;
    if ((window.scrollY / scrollH) * 100 >= 50) {
        hasScrolled50 = true;
        checkViewContent();
    }
});

function checkViewContent() {
    if (!viewContentTrigged && hasStayed15s && hasScrolled50) {
        viewContentTrigged = true;
        window.fireTrackingEvent('ViewContent', { content_name: document.title });
    }
}

// --- TRIGGER: Lead (gọi từ handleFormSubmit) ---
const processLeadTracking = async (emailVal, phoneVal) => {
    const userData = {};
    if (emailVal) userData.em = await hashSHA256(emailVal.trim().toLowerCase());
    if (phoneVal) userData.ph = await hashSHA256(phoneVal.replace(/[^0-9]/g, ''));

    window.fireTrackingEvent('Lead', { event_category: 'Form' }, userData);
};
