// Konfigurasi Endpoint Backend Utama (Menghubungkan ke server kasir Vercel)
const API_BASE = 'https://toko-lukman.vercel.app';

// URL Sumber Gambar Cloudinary (Sesuai database TOKO 1)
const CLOUDINARY_BASE = 'https://res.cloudinary.com/otyitzng/image/upload/toko-lukman';

let allProduk = [];
let filteredProduk = [];
let cart = [];
let currentPage = 1;
const itemsPerPage = 20;
let activeCategory = 'Semua';

// Placeholder SVG bersih dan aman jika gambar belum ada
const defaultImg = "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22300%22%20height%3D%22300%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23f1f5f9%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-family%3D%22sans-serif%22%20font-size%3D%2214%22%20font-weight%3D%22bold%22%20fill%3D%22%2394a3b8%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3ELukman%20Snack%3C%2Ftext%3E%3C%2Fsvg%3E";

document.addEventListener('DOMContentLoaded', () => {
    loadCurrentUser();
    fetchProduk();
    initSearch();
    registerPWA(); // Tambahkan ini
});

// Pendaftaran Service Worker PWA
function registerPWA() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW aktif:', reg.scope))
            .catch(err => console.log('SW gagal:', err));
    });
}
}

// 1. Ambil Nama User yang Sedang Login
function loadCurrentUser() {
    const custData = localStorage.getItem('activeCustomer');
    const displayEl = document.getElementById('currentUserDisplay');
    if (!displayEl) return;

    if (custData) {
        try {
            const customer = JSON.parse(custData);
            displayEl.innerText = customer.nama || 'Pelanggan';
        } catch (e) {
            displayEl.innerText = "Masuk / Daftar";
        }
    } else {
        displayEl.innerText = "Masuk / Daftar";
    }
}

// Buka/Tutup Modal Login & Daftar
function toggleAuthModal() {
    const custData = localStorage.getItem('activeCustomer');
    const modal = document.getElementById('auth-modal');
    if (!modal) return;

    modal.classList.add('active');

    if (custData) {
        const customer = JSON.parse(custData);
        document.getElementById('login-form-box').style.display = 'none';
        document.getElementById('register-form-box').style.display = 'none';
        document.getElementById('profile-box').style.display = 'block';
        document.getElementById('auth-title').innerText = "Akun Pelanggan";
        document.getElementById('prof-nama').innerText = customer.nama || '-';
        document.getElementById('prof-hp').innerText = customer.telp || customer.kd_cus || '-';
    } else {
        const passEl = document.getElementById('log-pass');
        const identEl = document.getElementById('log-identifier');
        if (passEl) passEl.value = '';
        if (identEl) identEl.value = '';

        switchAuthTab('login');
    }
}

function closeAuthModal() {
    document.getElementById('auth-modal')?.classList.remove('active');
}

function switchAuthTab(type) {
    const loginBox = document.getElementById('login-form-box');
    const regBox = document.getElementById('register-form-box');
    const profileBox = document.getElementById('profile-box');
    const titleEl = document.getElementById('auth-title');

    if (profileBox) profileBox.style.display = 'none';

    if (type === 'login') {
        if (titleEl) titleEl.innerText = "Masuk Pelanggan";
        if (loginBox) loginBox.style.display = 'block';
        if (regBox) regBox.style.display = 'none';
    } else {
        if (titleEl) titleEl.innerText = "Daftar Akun Baru";
        if (loginBox) loginBox.style.display = 'none';
        if (regBox) regBox.style.display = 'block';
    }
}

// Eksekusi Pendaftaran
async function registerCustomer() {
    const nama = document.getElementById('reg-nama').value.trim();
    const no_hp = document.getElementById('reg-hp').value.trim();
    const alamat = document.getElementById('reg-alamat').value.trim();
    const password = document.getElementById('reg-pass').value.trim();

    if (!nama || !no_hp || !password) {
        alert("Nama, WhatsApp, dan Password wajib diisi!");
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/online/customer/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nama, no_hp, alamat, password })
        });
        const json = await res.json();
        if (json.success) {
            alert(json.message);
            switchAuthTab('login');
            const identEl = document.getElementById('log-identifier');
            if (identEl) identEl.value = no_hp;
        } else {
            alert(json.message);
        }
    } catch (e) {
        alert("Gagal menghubungkan ke server");
    }
}

// Eksekusi Login
async function loginCustomer() {
    const identInput = document.getElementById('log-identifier');
    const passInput = document.getElementById('log-pass');

    const identifier = identInput ? identInput.value.trim().toUpperCase() : '';
    const password = passInput ? passInput.value.trim() : '';

    if (!identifier || !password) {
        alert("Nama / No. WhatsApp dan Password wajib diisi!");
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/online/customer/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, password })
        });

        const json = await res.json();

        if (json.success) {
            localStorage.setItem('activeCustomer', JSON.stringify(json.customer));
            loadCurrentUser();
            closeAuthModal();
            alert(`Selamat datang kembali, ${json.customer.nama}!`);

            if (typeof loadHistoryData === 'function') {
                loadHistoryData();
            }
        } else {
            alert(json.message || "Data tidak sesuai. Periksa kembali nama/nomor dan password Anda.");
        }
    } catch (e) {
        console.error("Error Login:", e);
        alert("Gagal terhubung ke server.");
    }
}

// Log off / Keluar Akun
function logoutCustomer() {
    if (confirm("Apakah Anda yakin ingin keluar (log off) dari akun ini?")) {
        localStorage.removeItem('activeCustomer');
        loadCurrentUser();
        closeAuthModal();
        alert("Anda telah berhasil keluar.");
    }
}

// 2. Tarik Data Produk dari Backend Azure SQL Server
async function fetchProduk() {
    try {
        const response = await fetch(`${API_BASE}/api/online/barang`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();

        if (result.success && Array.isArray(result.data)) {
            allProduk = result.data;
        } else if (Array.isArray(result)) {
            allProduk = result;
        } else if (result.data && Array.isArray(result.data)) {
            allProduk = result.data;
        } else {
            allProduk = [];
        }

        filteredProduk = [...allProduk];
        currentPage = 1;
        renderPage();
    } catch (error) {
        console.error("Gagal mengambil data produk:", error);
        tampilkanPesanKosong();
    }
}

function tampilkanPesanKosong() {
    const grid = document.getElementById('product-grid');
    if (grid) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; padding:50px 0; color:#94a3b8; font-weight:600;">Tidak ada produk yang ditemukan.</p>`;
    }
    const paginationEl = document.getElementById('pagination-container');
    if (paginationEl) paginationEl.innerHTML = '';
}

// 3. Helper Pembaca Gambar Cloudinary
function getProductImageUrl(item) {
    let rawFile = (item.foto_produk || item.barcode || item.kd_br || item.id || '').trim();

    if (!rawFile || rawFile === '.' || rawFile.startsWith('.')) {
        return defaultImg;
    }

    if (rawFile.startsWith('http://') || rawFile.startsWith('https://')) {
        return rawFile;
    }

    let namaFile = rawFile.replace(/[\/\\:\*\?"<>\|]/g, '_');
    if (!namaFile.includes('.')) {
        namaFile += '.jpg';
    }

    return `${CLOUDINARY_BASE}/${encodeURIComponent(namaFile)}`;
}

// 4. Potong Halaman (Pagination)
function renderPage() {
    if (filteredProduk.length === 0) {
        tampilkanPesanKosong();
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = filteredProduk.slice(startIndex, endIndex);

    renderProduk(currentItems);
    renderPagination();
}

// 5. Render Kartu Produk
function renderProduk(list) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = '';

    list.forEach(item => {
        const id = String(item.kd_br || item.id || '').trim();
        const nama = String(item.nama || item.nama_barang || 'Produk').trim();
        const harga = Number(item.h_to || item.harga || 0);
        const satuan = String(item.satuan || 'PCS').trim();
        const foto = getProductImageUrl(item);

        const card = document.createElement('div');
        card.className = 'product-card';

        card.innerHTML = `
            <div class="product-img-wrapper" style="position: relative; width: 100%; height: 180px; overflow: hidden; background: #ffffff; display: flex; align-items: center; justify-content: center;">
                <img class="product-img" 
                     src="${foto}" 
                     alt="${nama}" 
                     loading="lazy"
                     style="max-width: 100%; max-height: 100%; object-fit: contain;">
                <div class="stock-badge">Stok Tersedia</div>
            </div>
            <div class="product-info">
                <div class="product-name" title="${nama}">${nama}</div>
                <div class="product-price">Rp ${harga.toLocaleString('id-ID')}</div>
                <div class="product-unit">Satuan: ${satuan}</div>
                <button type="button" class="btn-add-cart">
                    <i class="fa-solid fa-plus"></i> Keranjang
                </button>
            </div>
        `;

        const imgEl = card.querySelector('.product-img');
        imgEl.addEventListener('error', function() {
            this.onerror = null;
            this.src = defaultImg;
        });

        card.querySelector('.btn-add-cart').addEventListener('click', () => {
            addToCart(id, nama, harga, foto);
        });

        grid.appendChild(card);
    });
}

// 6. Pagination Bar
function renderPagination() {
    let paginationEl = document.getElementById('pagination-container');
    if (!paginationEl) {
        paginationEl = document.createElement('div');
        paginationEl.id = 'pagination-container';
        document.querySelector('.main-container').appendChild(paginationEl);
    }

    paginationEl.style = 'display:flex; justify-content:center; align-items:center; gap:12px; margin:35px 0 20px 0;';

    const totalPages = Math.ceil(filteredProduk.length / itemsPerPage);
    if (totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }

    paginationEl.innerHTML = `
        <button type="button" id="prev-btn" class="cat-pill" ${currentPage === 1 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>&laquo; Sebelumnya</button>
        <span style="font-size:13px; font-weight:700; color:#64748b;">Halaman ${currentPage} dari ${totalPages}</span>
        <button type="button" id="next-btn" class="cat-pill" ${currentPage === totalPages ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>Berikutnya &raquo;</button>
    `;

    document.getElementById('prev-btn')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderPage();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    document.getElementById('next-btn')?.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderPage();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
}

// 7. Manajemen Keranjang Belanja
function addToCart(id, nama, harga, foto) {
    const item = cart.find(x => x.id === id);
    if (item) {
        item.qty += 1;
    } else {
        cart.push({ id, nama, harga, foto, qty: 1 });
    }
    updateCartUI();
}

function updateCartUI() {
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.harga * item.qty), 0);

    // 1. Update Badge Keranjang Header Atas
    const countEl = document.getElementById('cart-count');
    if (countEl) countEl.innerText = totalQty;

    // 2. Update Badge Keranjang Navigasi Bawah
    const navCartBadge = document.getElementById('nav-cart-badge');
    if (navCartBadge) {
        navCartBadge.innerText = totalQty;
        // Opsional: Sembunyikan badge jika keranjang 0
        navCartBadge.style.display = totalQty > 0 ? 'flex' : 'none';
    }

    // 3. Update Total Harga di Modal Keranjang
    const priceEl = document.getElementById('cart-total-price');
    if (priceEl) priceEl.innerText = `Rp ${Number(totalPrice).toLocaleString('id-ID')}`;

    // 4. Update Daftar Item Keranjang
    const fullList = document.getElementById('cart-full-list');
    if (!fullList) return;

    if (cart.length === 0) {
        fullList.innerHTML = `<p class="empty-cart-msg">Keranjang kamu masih kosong.</p>`;
        return;
    }

    fullList.innerHTML = '';
    cart.forEach(item => {
        const subtotal = item.harga * item.qty;
        const row = document.createElement('div');
        row.className = 'cart-item-row';
        row.innerHTML = `
            <img class="cart-item-thumb" src="${item.foto}">
            <div class="item-desc">
                <h4>${item.nama}</h4>
                <span>Rp ${subtotal.toLocaleString('id-ID')}</span>
            </div>
            <div class="item-qty-controls">
                <button type="button" class="btn-qty btn-minus">-</button>
                <span style="font-size:13px; font-weight:700; min-width:20px; text-align:center;">${item.qty}</span>
                <button type="button" class="btn-qty btn-plus">+</button>
            </div>
            <button type="button" class="btn-remove-item" title="Hapus"><i class="fa-solid fa-trash-can"></i></button>
        `;

        const thumb = row.querySelector('.cart-item-thumb');
        thumb.addEventListener('error', function() {
            this.onerror = null;
            this.src = defaultImg;
        });

        row.querySelector('.btn-minus').addEventListener('click', () => changeQty(item.id, -1));
        row.querySelector('.btn-plus').addEventListener('click', () => changeQty(item.id, 1));
        row.querySelector('.btn-remove-item').addEventListener('click', () => {
            cart = cart.filter(x => x.id !== item.id);
            updateCartUI();
        });

        fullList.appendChild(row);
    });
}

function changeQty(id, delta) {
    const item = cart.find(x => x.id === id);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) {
            cart = cart.filter(x => x.id !== id);
        }
        updateCartUI();
    }
}

function formatNoWa(no) {
    let cleaned = String(no || '').replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.slice(1);
    } else if (cleaned.startsWith('8')) {
        cleaned = '62' + cleaned;
    }
    return cleaned;
}

// 8. Checkout WhatsApp & Simpan ke DB SQL Server
async function checkout() {
    const custData = localStorage.getItem('activeCustomer');
    if (!custData) {
        alert("Silakan Masuk (Login) atau Daftar sebagai Pelanggan terlebih dahulu sebelum memesan.");
        toggleAuthModal();
        return;
    }

    const currentCustomer = JSON.parse(custData);

    if (cart.length === 0) {
        alert("Pilih barang terlebih dahulu!");
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.harga * item.qty), 0);
    const noPesanan = 'ORD-' + Date.now();

    try {
        const response = await fetch(`${API_BASE}/api/online/pesanan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                no_pesanan: noPesanan,
                nama_pelanggan: currentCustomer.nama,
                items: cart,
                total: total
            })
        });

        const resData = await response.json();
        if (!resData.success) {
            alert("Gagal mencatat pesanan: " + resData.message);
            return;
        }
    } catch (err) {
        alert("Gagal terhubung ke backend server.");
        return;
    }

    let targetWa = "081210493528";
    try {
        const resProfil = await fetch(`${API_BASE}/api/online/profil-toko`);
        const profilJson = await resProfil.json();
        if (profilJson.success && profilJson.data && profilJson.data.no_wa) {
            targetWa = profilJson.data.no_wa;
        }
    } catch (e) {
        console.warn("Menggunakan nomor fallback WA");
    }

    const phoneFinal = formatNoWa(targetWa);

    let text = `*Pesanan Baru [${noPesanan}]*\n`;
    text += `Pelanggan: ${currentCustomer.nama} (${currentCustomer.telp || currentCustomer.kd_cus})\n\n`;
    cart.forEach(item => {
        const subtotal = item.harga * item.qty;
        text += `• ${item.nama} (${item.qty}x) = Rp ${subtotal.toLocaleString('id-ID')}\n`;
    });
    text += `\n*Total Tagihan:* Rp ${total.toLocaleString('id-ID')}\n`;
    text += `Mohon segera diproses, terima kasih!`;

    cart = [];
    updateCartUI();
    closeCartModal();

    window.open(`https://api.whatsapp.com/send?phone=${phoneFinal}&text=${encodeURIComponent(text)}`, '_blank');
}

// 9. Riwayat Pesanan
function openHistoryModal() {
    const modal = document.getElementById('history-modal');
    if (modal) modal.classList.add('active');
    loadHistoryData();
}

function closeHistoryModal() {
    const modal = document.getElementById('history-modal');
    if (modal) modal.classList.remove('active');
}

async function loadHistoryData() {
    const container = document.getElementById('history-list-container');
    if (!container) return;

    const custData = localStorage.getItem('activeCustomer');
    if (!custData) {
        container.innerHTML = `
            <div style="text-align: center; padding: 25px 15px;">
                <p class="empty-cart-msg" style="margin-bottom: 14px;">Silakan masuk terlebih dahulu untuk melihat riwayat belanja Anda.</p>
                <button type="button" onclick="closeHistoryModal(); toggleAuthModal();" style="background: #0284c7; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; cursor: pointer;">
                    Masuk Akun
                </button>
            </div>
        `;
        return;
    }

    const currentCustomer = JSON.parse(custData);

    try {
        const res = await fetch(`${API_BASE}/api/online/pesanan?pelanggan=${encodeURIComponent(currentCustomer.nama)}`);
        const json = await res.json();
        const orders = json.data || [];

        if (orders.length === 0) {
            container.innerHTML = `<p class="empty-cart-msg">Belum ada riwayat belanja untuk akun <strong>${currentCustomer.nama}</strong>.</p>`;
            return;
        }

        container.innerHTML = orders.map(ord => {
            const statusClass = (ord.status || 'menunggu').toLowerCase();
            return `
                <div class="history-card" style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 12px; background: #fff;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="font-weight: 700; color: #1e293b;"><i class="fa-solid fa-receipt"></i> ${ord.no_pesanan}</span>
                        <span class="badge-status badge-${statusClass}" style="padding: 3px 8px; border-radius: 20px; font-size: 11px; font-weight: 700; background: #dcfce7; color: #15803d;">${ord.status}</span>
                    </div>
                    <div style="border-top: 1px dashed #e2e8f0; padding-top: 8px; margin-bottom: 10px;">
                        ${(ord.items || []).map(item => `
                            <div style="display: flex; justify-content: space-between; font-size: 13px; color: #475569; margin-bottom: 4px;">
                                <span>${item.nama_barang || item.nama} (x${item.qty})</span>
                                <span style="font-weight: 600;">Rp ${Number(item.subtotal || (item.harga * item.qty)).toLocaleString('id-ID')}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 8px;">
                        <span style="font-size: 12px; color: #64748b;">Total Belanja:</span>
                        <strong style="color: #10b981; font-size: 15px;">Rp ${Number(ord.total_bayar || ord.total || 0).toLocaleString('id-ID')}</strong>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        container.innerHTML = `<p class="empty-cart-msg" style="color: #ef4444;">Gagal memuat riwayat belanja.</p>`;
    }
}

// 10. Filter Kategori & Pencarian
function filterCategory(category, buttonEl) {
    activeCategory = category;
    document.querySelectorAll(".cat-pill").forEach(el => el.classList.remove("active"));
    if (buttonEl) buttonEl.classList.add("active");
    applyFilter();
}

function applyFilter() {
    const searchInput = document.getElementById('searchInput');
    const keyword = searchInput ? searchInput.value.toLowerCase().trim() : '';

    filteredProduk = allProduk.filter(item => {
        const nama = String(item.nama || item.nama_barang || '').toLowerCase();
        const jenis = String(item.jenis_produk || item.kategori || '').toLowerCase();

        const matchSearch = nama.includes(keyword);
        const matchCategory = (activeCategory === 'Semua') || 
                              nama.includes(activeCategory.toLowerCase()) || 
                              jenis.includes(activeCategory.toLowerCase());

        return matchSearch && matchCategory;
    });

    currentPage = 1;
    renderPage();
}

function openCartModal() {
    const modal = document.getElementById('cart-modal');
    if (modal) modal.classList.add('active');
}

function closeCartModal() {
    const modal = document.getElementById('cart-modal');
    if (modal) modal.classList.remove('active');
}

function initSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            applyFilter();
        });
    }
}
// Navigasi ke Halaman Utama (Scroll ke atas & reset active)
function navToHome(el) {
    setNavActive(el);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeCartModal();
    closeHistoryModal();
    closeAuthModal();
}

// Mengatur status aktif pada tab bar bawah
function setNavActive(el) {
    document.querySelectorAll('.mobile-bottom-nav .nav-item').forEach(item => {
        item.classList.remove('active');
    });
    if (el) el.classList.add('active');
}