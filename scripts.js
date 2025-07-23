document.addEventListener("DOMContentLoaded", function() {

    // --- BẮT ĐẦU KHỐI MÃ TÁI CẤU TRÚC ---
    let lastDiscordData = null; // Biến để lưu trạng thái Discord cuối cùng
    // --- THÊM CÁC BIẾN TRẠNG THÁI Ở ĐÂY ---
    let isNavigating = false; // Cờ để ngăn điều hướng khi đang có một tiến trình chạy
    let lastClickTime = 0;    // Biến để theo dõi thời gian click cuối cùng
    // 1. Hàm lấy dữ liệu Status.cafe (giữ nguyên)
    function fetchStatusCafeData() {
        fetch("https://status.cafe/users/ngc2237/status.json")
            .then(response => response.json())
            .then(data => {
                const usernameEl = document.getElementById("statuscafe-username");
                const iconEl = document.getElementById("statuscafe-icon");
                const timeEl = document.getElementById("statuscafe-time");
                const contentEl = document.getElementById("statuscafe-content");
                if (!usernameEl || !iconEl || !timeEl || !contentEl) { return; }
                if (!data.content || !data.content.length) {
                    contentEl.innerHTML = "No status yet.";
                } else {
                    usernameEl.innerHTML = `<a href="https://status.cafe/users/ngc2237" target="_blank">${data.author}</a>`;
                    iconEl.innerHTML = data.face;
                    timeEl.innerHTML = data.timeAgo;
                    contentEl.innerHTML = data.content;
                }
            })
            .catch(error => console.error('Lỗi khi lấy dữ liệu status.cafe:', error));
    }

    // 2. Hàm cập nhật UI của Discord (giữ nguyên)
    function updateDiscordUI(discordData) {
        const avatarEl = document.getElementById("discord-avatar");
        const onlineStatusEl = document.getElementById("discord-onlinestatus");
        const usernameEl = document.getElementById("discord-username");
        const activityEl = document.getElementById("discord-activity");
        const assetContainerEl = document.getElementById("discord-asset-container");
        const timestampContainerEl = document.getElementById("discord-timestamp-container");

        if (!avatarEl || !onlineStatusEl || !usernameEl || !activityEl || !assetContainerEl || !timestampContainerEl) {
            return;
        }
        avatarEl.src = `https://cdn.discordapp.com/avatars/${discordData.discord_user.id}/${discordData.discord_user.avatar}.png?size=80`;
        onlineStatusEl.innerHTML = `<span class="status-indicator ${discordData.discord_status}"></span> ${discordData.discord_status}`;
        usernameEl.innerHTML = discordData.discord_user.username; // Dòng này bây giờ sẽ hoạt động
        let primaryActivity = discordData.activities.find(a => a.type !== 4);
        if (!primaryActivity && discordData.activities.length > 0) {
            primaryActivity = discordData.activities.find(a => a.type === 4);
        }
        if (window.discordTimestampInterval) clearInterval(window.discordTimestampInterval);
        activityEl.innerHTML = '';
        assetContainerEl.innerHTML = '';
        timestampContainerEl.innerHTML = '';
        if (primaryActivity) {
            let activityHtml = `<b>${primaryActivity.name}</b>`;
            if (primaryActivity.details) activityHtml += `<br>${primaryActivity.details}`;
            if (primaryActivity.state) activityHtml += `<br>${primaryActivity.state}`;
            activityEl.innerHTML = activityHtml;
            if (primaryActivity.assets && primaryActivity.assets.large_image) {
                let imageUrl = primaryActivity.assets.large_image;
                if (imageUrl.startsWith('mp:')) imageUrl = `https://media.discordapp.net/${imageUrl.slice(3)}`;
                else if (imageUrl.startsWith('spotify:')) imageUrl = `https://i.scdn.co/image/${imageUrl.slice(8)}`;
                else imageUrl = `https://cdn.discordapp.com/app-assets/${primaryActivity.application_id}/${imageUrl}.png?size=128`;
                assetContainerEl.innerHTML = `<img src="${imageUrl}" class="discord-asset-image">`;
            }
            if (primaryActivity.timestamps && primaryActivity.timestamps.start) {
                const formatTime = (ms) => {
                    const s = Math.floor(ms / 1000);
                    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
                };
                const updateTime = () => {
                    const start = primaryActivity.timestamps.start;
                    const end = primaryActivity.timestamps.end;
                    if (end) {
                        const now = Date.now();
                        if (now > end) { clearInterval(window.discordTimestampInterval); return; }
                        const elapsed = now - start;
                        const total = end - start;
                        const progress = (elapsed / total) * 100;
                        timestampContainerEl.innerHTML = `<div class="discord-progress-bar"><span class="time-elapsed">${formatTime(elapsed)}</span><div class="bar-container"><div class="bar-background"></div><img src="/assets/ribbon1.png" class="bar-scrubber" style="left: ${progress}%;"></div><span class="time-total">${formatTime(total)}</span></div>`;
                    } else {
                        timestampContainerEl.innerHTML = `<p class="discord-elapsed-time">${formatTime(Date.now() - start)} đã trôi qua</p>`;
                    }
                };
                updateTime();
                window.discordTimestampInterval = setInterval(updateTime, 1000);
            }
        } else {
            activityEl.innerHTML = "Không có hoạt động nào.";
        }
    }
    // --- BẮT ĐẦU: HÀM MỚI ĐỂ CẬP NHẬT TRÍCH DẪN NGẪU NHIÊN ---
    function updateRandomQuote() {
        const quoteDisplayEl = document.getElementById('quote-display');
        const quoteAuthorEl = document.getElementById('quote-author');

        // Chỉ chạy nếu các phần tử tồn tại trên trang
        if (quoteDisplayEl && quoteAuthorEl) {
            const quotes = [
                "Blood on my shirt, roses in my hand, you're looking at me like you don't know who I am.",
                "Perfect, em chỉ cần là chính em.",
                "Trước cơn bão giông là một bầu trời bình yên.",
                "Giờ người là cá, còn em là cả đại dương."
            ];
            const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
            
            quoteDisplayEl.innerText = randomQuote;
            
            // Ẩn phần tác giả đi thay vì chỉ xóa chữ, trông sẽ đẹp hơn
            quoteAuthorEl.style.display = 'none'; 
        }
    }
    // 3. Thiết lập kết nối WebSocket cho Discord
    const lanyardUserId = '1159348783876931634';
    let socket = new WebSocket("wss://api.lanyard.rest/socket");
    let heartbeatInterval;
    socket.onopen = function() {
        socket.send(JSON.stringify({ op: 2, d: { subscribe_to_id: lanyardUserId } }));
    };
    socket.onmessage = function(event) {
        const message = JSON.parse(event.data);
        if (message.op === 1) {
            const interval = message.d.heartbeat_interval;
            heartbeatInterval = setInterval(() => {
                socket.send(JSON.stringify({ op: 3 }));
            }, interval);
        } else if (message.op === 0) {
            // Sửa đổi: Lưu dữ liệu mới nhất và cập nhật UI
            lastDiscordData = message.d;
            updateDiscordUI(lastDiscordData);
        }
    };
    socket.onclose = function() {
        clearInterval(heartbeatInterval);
    };
    socket.onerror = function(error) {
        console.error("Lỗi Lanyard WebSocket:", error);
    };
    // --- BẮT ĐẦU: LOGIC CHO NHẬT KÝ (PHIÊN BẢN NÂNG CẤP) ---
    // Hàm hiển thị thông báo chung, linh hoạt hơn
    function showNotification(message, type = 'info') { // type có thể là 'info', 'success', 'error', 'warning'
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notif = document.createElement('div');
        notif.classList.add(`${type}-notification`); // Dùng class tương ứng với type
        notif.innerText = message;
        container.appendChild(notif);

        setTimeout(() => { notif.classList.add('show'); }, 10);

        setTimeout(() => {
            notif.classList.remove('show');
            notif.addEventListener('transitionend', () => notif.remove());
        }, 3000); // Tất cả thông báo sẽ biến mất sau 3 giây
    }

    // Sửa lại các hàm cũ để sử dụng hàm mới (cho gọn)
    function showSuccessNotification(message) {
        showNotification(message, 'success');
    }
    function showErrorNotification(message) {
        showNotification(message, 'error');
    }
    // --- KẾT THÚC: NÂNG CẤP HỆ THỐNG THÔNG BÁO ---
    // Hàm để tạo hash SHA-256 từ một chuỗi văn bản
    async function sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    // Hàm chính xử lý truy cập cập nhật ký
    function handleDiaryAccess() {
        const passwordPrompt = document.getElementById('diary-password-prompt');
        // Sửa lại để nhắm đến placeholder
        const diaryPlaceholder = document.getElementById('diary-content-placeholder'); 
        const diaryForm = document.getElementById('diary-form');
        const passwordInput = document.getElementById('diary-password-input');

        if (!passwordPrompt || !diaryPlaceholder || !diaryForm) return;

        const DIARY_PASSWORD_HASH = '844faa366b96553031a1ea2674c62bc4788969d984a7be00ea34f02686604992';
        const isUnlocked = localStorage.getItem('diaryUnlocked') === 'true';

        // --- VIẾT LẠI HOÀN TOÀN HÀM showDiary ---
        const showDiary = async () => {
            try {
                // 1. Tải nội dung từ tệp riêng
                const response = await fetch('/diary-content.html');
                if (!response.ok) {
                    throw new Error('Không thể tải nội dung nhật ký.');
                }
                const diaryHtml = await response.text();

                // 2. Chèn nội dung vào placeholder
                diaryPlaceholder.innerHTML = diaryHtml;

                // 3. Xóa form mật khẩu đi
                passwordPrompt.remove();
            } catch (error) {
                console.error(error);
                diaryPlaceholder.innerHTML = '<p>Lỗi: Không thể hiển thị nội dung nhật ký. Vui lòng thử lại.</p>';
            }
        };

        if (isUnlocked) {
            showDiary();
            return;
        }

        diaryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const enteredPassword = passwordInput.value;
            const enteredPasswordHash = await sha256(enteredPassword);

            if (enteredPasswordHash === DIARY_PASSWORD_HASH) {
                localStorage.setItem('diaryUnlocked', 'true');
                showSuccessNotification('Mở khóa thành công!');
                // Không cần setTimeout nữa, gọi trực tiếp
                showDiary(); 
            } else {
                showErrorNotification('Mật khẩu không chính xác!');
                passwordInput.value = '';
            }
        });
    }
    // --- KẾT THÚC: LOGIC CHO NHẬT KÝ ---
    // --- BẮT ĐẦU: LOGIC HIỆU ỨNG ĐỘNG KHI CUỘN TRANG ---
    function setupScrollAnimations() {
        const animatedElements = document.querySelectorAll('.box');
        if (animatedElements.length === 0) return; // Thoát nếu không có box nào để tạo hiệu ứng

        const observerOptions = {
            root: null, // Quan sát so với khung nhìn của trình duyệt
            rootMargin: '0px',
            threshold: 0.1 // Kích hoạt khi 10% phần tử hiển thị
        };

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                // Nếu phần tử đi vào khung nhìn
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible'); // Thêm lớp để kích hoạt animation
                    observer.unobserve(entry.target); // Ngừng quan sát sau khi đã hiển thị để tiết kiệm tài nguyên
                }
            });
        }, observerOptions);
                // Bắt đầu quan sát từng box
        animatedElements.forEach(el => observer.observe(el));
    }

    // 4. Sửa đổi khối mã tải trang AJAX
    const mainContent = document.getElementById('main-content');


    // --- BẮT ĐẦU: LOGIC CHO BLOG POST GENERATOR ---
    function setupBlogGenerator() {
        const form = document.getElementById('blog-generator-form');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            // 1. Lấy dữ liệu từ form
            const title = document.getElementById('post-title').value;
            const date = document.getElementById('post-date').value;
            const time = document.getElementById('post-time').value;
            const icon = document.getElementById('post-icon').value;
            const filename = document.getElementById('post-filename').value;
            const summary = document.getElementById('post-summary').value;
            const content = document.getElementById('post-content').value;

            // 2. Tạo mã cho trang blog.html
            const outputForBlogPage = `<!-- POST START -->
<div class="box">
    <div class="left">
        <img class="icon" src="${icon}" alt="avatar">
        <p>${date}</p>
        <p><i>${time}</i></p>
    </div>
    <div class="right">
        <h2>${title}</h2>
        <p>${summary}</p>
        <br>
        <a href="/blogposts/${filename}.html" class="ajax-link">read more...</a>
    </div>
</div>
<!-- POST END -->`;

            // 3. Tạo mã cho tệp bài viết mới
            const outputForPostFile = `<script>
    if (!window.top.document.getElementById('main-content')) {
        window.top.location.href = \`/?path=\${window.location.pathname}\`;
    }
<\/script>
<!-- POST START -->
<div class="box">
    <div class="left">
        <img class="icon" src="${icon}" alt="avatar">
        <p>${date}</p>
        <p><i>${time}</i></p>
    </div>
    <div class="right">
        <h2>${title}</h2>
        <hr>
        ${content}
        <br>
        <a href="/blog.html" class="ajax-link">&larr; quay lại</a>
    </div>
</div>
<!-- POST END -->`;

            // 4. Hiển thị kết quả
            const blogPageOutputEl = document.getElementById('output-for-blog-page');
            const postFileOutputEl = document.getElementById('output-for-post-file');

            blogPageOutputEl.textContent = outputForBlogPage;
            postFileOutputEl.textContent = outputForPostFile;
            
            // Tô màu cú pháp cho các khối mã mới
            hljs.highlightElement(blogPageOutputEl);
            hljs.highlightElement(postFileOutputEl);

            document.getElementById('output-filename').textContent = filename;
            document.getElementById('generator-output').hidden = false;
        });

        // Thêm logic cho nút sao chép
        document.addEventListener('click', function(e) {
            if (e.target && e.target.classList.contains('copy-btn')) {
                const targetId = e.target.dataset.targetId;
                const codeElement = document.getElementById(targetId);
                if (codeElement) {
                    navigator.clipboard.writeText(codeElement.textContent).then(() => {
                        showNotification('Đã sao chép mã vào clipboard!', 'success');
                    }, (err) => {
                        showNotification('Lỗi khi sao chép: ' + err, 'error');
                    });
                }
            }
        });
    }
    // --- KẾT THÚC: LOGIC CHO BLOG POST GENERATOR ---

    // --- CẬP NHẬT HÀM loadContent ---
    const loadContent = async (url) => {
        try {
            mainContent.style.opacity = '0.5';
            const response = await fetch(url);

            // Nếu trang không tồn tại (lỗi 404), tải nội dung của trang 404.html
            if (!response.ok && response.status === 404) {
                const response404 = await fetch('/404-content.html'); // Sửa thành 404-content.html
                if (!response404.ok) throw new Error('Không thể tải trang 404 tùy chỉnh.');
                const newContent = await response404.text();
                mainContent.innerHTML = newContent;
                document.title = '404 - Not Found';
            } 
            // Xử lý các lỗi HTTP khác
            else if (!response.ok) {
                throw new Error(`Lỗi HTTP: ${response.status}`);
            }
            // Nếu trang tồn tại, hiển thị nội dung bình thường
            else {
                const newContent = await response.text();
                mainContent.innerHTML = newContent;

                // --- BẮT ĐẦU: LOGIC ĐẶT TIÊU ĐỀ NÂNG CAO ---
                const siteName = 'cherrybie';

                // Trường hợp 1: Đây là một bài viết blog
                if (url.includes('/blogposts/')) {
                    const postTitleElement = mainContent.querySelector('.right h2');
                    if (postTitleElement) {
                        const postTitle = postTitleElement.textContent.trim();
                        document.title = `${postTitle} - ${siteName}`;
                    } else {
                        // Fallback cho bài blog không có h2
                        document.title = `blog post - ${siteName}`;
                    }
                }
                // Trường hợp 2: Các trang khác (home, about, etc.)
                else {
                    let pageName = url.split('/').pop().split('.')[0].replace('-content', '').replace(/-/g, ' ');
                    if (pageName === '' || pageName === 'index') pageName = 'home'; // Mặc định cho trang gốc
                    document.title = `${pageName} - ${siteName}`;
                }
                // --- KẾT THÚC: LOGIC ĐẶT TIÊU ĐỀ NÂNG CAO ---

                // Gọi các hàm cập nhật dữ liệu cho trang chủ
                if (url.includes('home.html')) {
                    fetchStatusCafeData();
                    if (lastDiscordData) {
                        updateDiscordUI(lastDiscordData);
                    }
                }
                // THÊM ĐOẠN NÀY VÀO: Gọi hàm cập nhật trích dẫn khi trang about được tải
                if (url.includes('about.html')) {
                    updateRandomQuote();
                }
                if (url.includes('diary.html')) {
                    handleDiaryAccess();
                }
                if (url.includes('blog-generator.html')) {
                    setupBlogGenerator();
                }

                // SAU KHI NỘI DUNG MỚI ĐƯỢC THÊM, KÍCH HOẠT ANIMATION
                setupScrollAnimations();
            }

            mainContent.style.opacity = '1';
        } catch (error) {
            console.error('Lỗi khi tải nội dung:', error);
            mainContent.innerHTML = '<p>Lỗi: Không thể tải nội dung trang. Vui lòng kiểm tra lại đường dẫn hoặc kết nối mạng.</p>';
            mainContent.style.opacity = '1';
        }
    };

    document.addEventListener('click', (e) => {
        if (e.target.matches('.ajax-link')) {
            e.preventDefault();

            // 1. KIỂM TRA SPAM CLICK
            const now = Date.now();
            if (now - lastClickTime < 2000) { // Nếu click chưa đến 2 giây sau lần trước
                showNotification("Thao tác quá nhanh, vui lòng bình tĩnh!", 'warning');
                return; // Dừng lại, không làm gì cả
            }
            
            // 2. KIỂM TRA XEM CÓ ĐANG ĐIỀU HƯỚNG KHÔNG
            if (isNavigating) {
                return; // Nếu đang trong quá trình chuyển hướng, không làm gì cả
            }

            // 3. BẮT ĐẦU QUÁ TRÌNH ĐIỀU HƯỚNG
            isNavigating = true; // Khóa lại, không cho phép click nữa
            lastClickTime = now; // Cập nhật thời gian click cuối
            const url = e.target.href;

            // 4. HIỂN THỊ THÔNG BÁO "ĐANG CHUYỂN HƯỚNG"
            showNotification("Đang chuyển hướng...", 'info');

            // 5. TẠO ĐỘ TRỄ 2 GIÂY
            setTimeout(async () => {
                // 6. SAU 2 GIÂY, TẢI NỘI DUNG
                await loadContent(url); // Chờ cho đến khi loadContent hoàn thành

                // 7. LẤY TIÊU ĐỀ TRANG VÀ HIỂN THỊ THÔNG BÁO THÀNH CÔNG
                // document.title đã được cập nhật bên trong loadContent
                const pageTitle = document.title.split(' - ')[0]; // Lấy phần đầu của tiêu đề
                showNotification(`Đã tải xong trang ${pageTitle}!`, 'success');

                // 8. MỞ KHÓA ĐIỀU HƯỚNG
                isNavigating = false; 
            }, 2000); // 2000ms = 2 giây
        }
    });

    window.addEventListener('popstate', (e) => {
        // Sửa đổi: Lấy đường dẫn từ location nếu state không tồn tại
        const path = (e.state && e.state.path) ? e.state.path : location.pathname;
        loadContent(path);
    });

    const params = new URLSearchParams(window.location.search);
    const pathFromQuery = params.get('path');

    if (pathFromQuery) {
        // Nếu có tham số ?path=, tải nội dung từ đó và cập nhật URL
        history.replaceState(null, '', pathFromQuery); // Xóa ?path= khỏi URL
        loadContent(pathFromQuery);
    } else {
        // Logic cũ: tải dựa trên pathname
        const initialPath = window.location.pathname;
        if (initialPath === '/' || initialPath.endsWith('/index.html')) {
            loadContent('/home.html');
        } else {
            loadContent(initialPath);
        }
    }

    // --- KẾT THÚC KHỐI MÃ TÁI CẤU TRÚC ---
    // --- BẮT ĐẦU: LOGIC DARK MODE ---
    const themeToggleButton = document.getElementById('theme-toggle-btn');
    const themeToggleIcon = document.getElementById('theme-toggle-icon');
    const THEME_KEY = 'user-theme';

    // Hàm để áp dụng theme và lưu lựa chọn
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggleIcon.src = '/assets/icon-sun.png';
            localStorage.setItem(THEME_KEY, 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            themeToggleIcon.src = '/assets/moon.gif';
            localStorage.setItem(THEME_KEY, 'light');
        }
    };

    // Xử lý khi click vào nút
    themeToggleButton.addEventListener('click', () => {
        const currentThemeIsDark = document.body.classList.contains('dark-mode');
        applyTheme(currentThemeIsDark ? 'light' : 'dark');
    });

    // Kiểm tra theme đã lưu hoặc theme hệ thống khi tải trang
    const savedTheme = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
        applyTheme(savedTheme); // Ưu tiên lựa chọn đã lưu của người dùng
    } else if (prefersDark) {
        applyTheme('dark'); // Nếu không có lựa chọn, dùng cài đặt của hệ thống
    }
    // --- BẮT ĐẦU: LOGIC NÚT BACK TO TOP ---
    const backToTopBtn = document.getElementById("back-to-top-btn");

    // Hiển thị nút khi người dùng cuộn xuống 200px
    window.onscroll = function() {
        if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
            backToTopBtn.classList.add("show");
        } else {
            backToTopBtn.classList.remove("show");
        }
    };

    // Cuộn lên đầu trang một cách mượt mà khi nhấp vào nút
    backToTopBtn.addEventListener("click", function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    // --- KẾT THÚC: LOGIC NÚT BACK TO TOP ---
    // --- BẮT ĐẦU: LOGIC CHO TOOLTIP TÙY CHỈNH ---
    const tooltipElement = document.getElementById('custom-tooltip');
    
    if (tooltipElement) {
        // Tìm tất cả các phần tử có thuộc tính 'title'
        const elementsWithTitle = document.querySelectorAll('[title]');

        elementsWithTitle.forEach(el => {
            let originalTitle = '';

            // Khi di chuột vào
            el.addEventListener('mouseenter', (e) => {
                originalTitle = el.getAttribute('title');
                if (originalTitle && originalTitle.trim() !== '') {
                    // Tạm thời xóa title gốc để tránh tooltip của trình duyệt
                    el.removeAttribute('title');
                    
                    // Cập nhật nội dung và hiển thị tooltip tùy chỉnh
                    tooltipElement.textContent = originalTitle;
                    tooltipElement.classList.add('show');
                }
            });

            // Khi chuột di chuyển trên phần tử
            el.addEventListener('mousemove', (e) => {
                if (tooltipElement.classList.contains('show')) {
                    // Cập nhật vị trí của tooltip theo con trỏ chuột
                    const offsetX = 15; // Khoảng cách từ con trỏ theo trục X
                    const offsetY = 15; // Khoảng cách từ con trỏ theo trục Y
                    
                    let x = e.clientX + offsetX;
                    let y = e.clientY + offsetY;

                    // Đảm bảo tooltip không bị tràn ra ngoài màn hình
                    if (x + tooltipElement.offsetWidth > window.innerWidth) {
                        x = e.clientX - tooltipElement.offsetWidth - offsetX;
                    }
                    if (y + tooltipElement.offsetHeight > window.innerHeight) {
                        y = e.clientY - tooltipElement.offsetHeight - offsetY;
                    }

                    tooltipElement.style.left = `${x}px`;
                    tooltipElement.style.top = `${y}px`;
                }
            });

            // Khi di chuột ra
            el.addEventListener('mouseleave', () => {
                if (originalTitle) {
                    // Ẩn tooltip tùy chỉnh
                    tooltipElement.classList.remove('show');
                    // Khôi phục lại title gốc cho phần tử
                    el.setAttribute('title', originalTitle);
                }
            });
        });
    }
    // --- KẾT THÚC: LOGIC CHO TOOLTIP TÙY CHỈNH ---
    // --- BẮT ĐẦU: LOGIC TRÌNH PHÁT ÂM THANH TÙY CHỈNH ---
    function setupCustomAudioPlayer() {
        const audio = document.getElementById('main-audio-player');
        const playBtn = document.getElementById('play-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const playPauseBtn = document.querySelector('.play-pause-btn');
        const progressBar = document.querySelector('.progress-bar');
        const progressThumb = document.querySelector('.progress-thumb');
        const progressBarWrapper = document.querySelector('.progress-bar-wrapper');
        const timeDisplay = document.querySelector('.time-display');
        const volumeSlider = document.querySelector('.volume-slider');

        if (!audio || !playPauseBtn || !progressBar || !progressThumb) return; // Thoát nếu không tìm thấy các phần tử

        audio.volume = 0.8;
        // Hàm định dạng thời gian (vd: 125 giây -> "2:05")
        const formatTime = (seconds) => {
            const minutes = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        };

        // Sự kiện click nút Play/Pause
        playPauseBtn.addEventListener('click', () => {
            if (audio.paused) {
                audio.play();
                playBtn.classList.add('hidden');
                pauseBtn.classList.remove('hidden');
            } else {
                audio.pause();
                pauseBtn.classList.add('hidden');
                playBtn.classList.remove('hidden');
            }
        });

        // Cập nhật thanh tiến trình và thời gian khi nhạc chạy
        audio.addEventListener('timeupdate', () => {
            const progressPercent = (audio.currentTime / audio.duration) * 100;
            progressBar.style.width = `${progressPercent}%`;
            progressThumb.style.left = `${progressPercent}%`;
            timeDisplay.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
        });

        // Tua nhạc khi click vào thanh tiến trình
        progressBarWrapper.addEventListener('click', (e) => {
            const width = progressBarWrapper.clientWidth;
            const clickX = e.offsetX;
            audio.currentTime = (clickX / width) * audio.duration;
        });

        // Cập nhật tổng thời gian khi metadata đã được tải
        audio.addEventListener('loadedmetadata', () => {
            timeDisplay.textContent = `0:00 / ${formatTime(audio.duration)}`;
        });

        // Điều chỉnh âm lượng
        volumeSlider.addEventListener('input', (e) => {
            audio.volume = e.target.value;
        });
    }
    setupCustomAudioPlayer(); // Gọi hàm để khởi tạo
    // --- KẾT THÚC: LOGIC TRÌNH PHÁT ÂM THANH TÙY CHỈNH ---
    // LOGIC RECORDER
    const recorderBtn = document.querySelector('.recorder');
    if (recorderBtn) {
        let isRecording = false;
        let recoder;
        let stream;
        recorderBtn.addEventListener('click', async () => {
            if (!isRecording) {
                stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: { frameRate: { ideal: 60 } } });
                recoder = new MediaRecorder(stream);
                const [video] = stream.getVideoTracks();
                recoder.start();
                isRecording = true;
                video.addEventListener('ended', () => { recoder.stop(); isRecording = false; });
                recoder.addEventListener('dataavailable', e => {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(e.data);
                    a.download = 'watch if cute.webm';
                    a.click();
                });
            } else {
                recoder.stop();
                stream.getTracks().forEach(track => track.stop());
                isRecording = false;
            }
        });
    }

    // LOGIC KONAMI CODE
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiIndex = 0;
    document.addEventListener('keydown', (e) => {
        if (e.key === konamiCode[konamiIndex]) {
            konamiIndex++;
            if (konamiIndex === konamiCode.length) {
                alert('Konami Activated!');
                konamiIndex = 0;
            }
        } else {
            konamiIndex = 0;
        }
    });

    // --- BẮT ĐẦU: LOGIC THÔNG BÁO VÀ SỬA ĐỔI SAO CHÉP ---
    document.addEventListener('copy', (event) => {
        // --- BẮT ĐẦU: LOGIC SỬA ĐỔI NỘI DUNG SAO CHÉP ---
        // 1. Lấy văn bản mà người dùng đã chọn
        const selection = window.getSelection().toString();

        // 2. Tạo chuỗi mới với thông tin bản quyền
        // (Sử dụng URL đầy đủ sẽ tốt hơn cho việc trích dẫn nguồn)
        const copyrightNotice = '\n\nNguồn: cherrybie - https://kawaiicassie.github.io';
        const newText = selection + copyrightNotice;

        // 3. Ngăn chặn hành động sao chép mặc định của trình duyệt
        event.preventDefault();

        // 4. Ghi dữ liệu mới của chúng ta vào clipboard
        event.clipboardData.setData('text/plain', newText);
        // --- KẾT THÚC: LOGIC SỬA ĐỔI NỘI DUNG SAO CHÉP ---


        // --- LOGIC HIỂN THỊ THÔNG BÁO (giữ nguyên) ---
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notif = document.createElement('div');
        notif.classList.add('copy-notification');
        notif.innerText = 'Nội dung đã được sao chép!';

        container.appendChild(notif);

        setTimeout(() => {
            notif.classList.add('show');
        }, 10);

        setTimeout(() => {
            notif.classList.remove('show');
            
            notif.addEventListener('transitionend', () => {
                notif.remove();
            });
        }, 3000);
    });
    // --- KẾT THÚC: LOGIC THÔNG BÁO VÀ SỬA ĐỔI SAO CHÉP ---
});
