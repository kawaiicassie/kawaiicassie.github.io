document.addEventListener("DOMContentLoaded", function() {

    // --- BẮT ĐẦU KHỐI MÃ TÁI CẤU TRÚC ---
    let lastDiscordData = null; // Biến để lưu trạng thái Discord cuối cùng

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

    // 4. Sửa đổi khối mã tải trang AJAX
    const mainContent = document.getElementById('main-content');
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
                    let pageName = url.split('/').pop().split('.')[0].replace('-content', '');
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
            const url = e.target.href;
            history.pushState({ path: url }, '', url);
            loadContent(url);
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

});