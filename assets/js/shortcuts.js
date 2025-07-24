const SHORTCUTS = {
    'h': '/home.html',
    'a': '/about.html', 
    'b': '/blog.html',
    'd': '/diary.html',
    'l': '/links.html',
    't': () => window.scrollTo({top: 0, behavior: 'smooth'}),
    'Escape': () => document.activeElement.blur()
};

function initShortcuts() {
    // Không kích hoạt shortcuts khi đang focus vào input/textarea
    document.addEventListener('keydown', (e) => {
        // Bỏ qua phím tắt khi đang focus vào input/textarea hoặc đang hover trên các nút có title
        if (e.target.matches('input, textarea') || e.target.title) return;
        
        const shortcut = SHORTCUTS[e.key];
        if (!shortcut) return;

        e.preventDefault();
        
        if (typeof shortcut === 'function') {
            shortcut();
        } else if (typeof shortcut === 'string') {
            document.querySelector(`a[href="${shortcut}"].ajax-link`)?.click();
        }
    });

    // Hiển thị tooltip trợ giúp khi nhấn ?
    document.addEventListener('keydown', (e) => {
        if (e.key === '?' && !e.target.matches('input, textarea')) {
            e.preventDefault();
            showShortcutsHelp();
        }
    });
}

function showShortcutsHelp() {
    const tooltip = document.getElementById('custom-tooltip');
    tooltip.innerHTML = `
        <h4>Phím tắt:</h4>
        <ul>
            <li>h - Trang chủ</li>
            <li>a - Giới thiệu</li>
            <li>b - Blog</li>
            <li>d - Nhật ký</li>
            <li>l - Liên kết</li>
            <li>t - Lên đầu trang</li>
            <li>Esc - Bỏ focus</li>
            <li>? - Hiện trợ giúp</li>
        </ul>
    `;
    tooltip.classList.add('show');
    
    setTimeout(() => tooltip.classList.remove('show'), 5000);
}

export { initShortcuts };
