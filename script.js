var SUPABASE_URL = "https://quzuzlbanupjrmrctgrg.supabase.co";
var SUPABASE_KEY = "sb_publishable_otFn4uvQRKLrH3SfHFYNTA_WbLSnzbj";
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
var FACEBOOK_PAGE_USERNAME = "chellsjewelry";

var products = [];
var cart = [];

function showCustomAlert(title, message) {
  document.getElementById("alert-title").innerText = title;
  document.getElementById("alert-message").innerText = message;
  document.getElementById("custom-alert-overlay").classList.add("active");
}
function closeCustomAlert() {
  document.getElementById("custom-alert-overlay").classList.remove("active");
}

async function handleRoute() {
  var isRouteAdmin = window.location.hash === "#admin";
  var bodyEl = document.getElementById("main-body");
  var storefrontEls = document.querySelectorAll(".storefront-el");
  var adminContainer = document.getElementById("admin-container");

  // Get session to check auth state
  var { data: { session } } = await supabase.auth.getSession();

  // Helper to ensure 'addSizeWeightRow' exists before calling
  if (session && typeof addSizeWeightRow === 'function') {
    addSizeWeightRow();
  }

  if (isRouteAdmin) {
    // --- ADMIN MODE ---
    
    // 1. Hide Storefront elements
    storefrontEls.forEach((el) => el.classList.add("hidden"));
    
    // 2. Show Admin Container
    if (adminContainer) adminContainer.classList.remove("hidden");
    
    // 3. Remove padding so Admin Panel is full screen
    bodyEl.classList.remove("pt-28", "md:pt-32");

    if (!session) {
      // CASE A: Not Logged In
      // Show Login Form ONLY
      document.getElementById("admin-login-section").classList.remove("hidden");
      document.getElementById("admin-dashboard-section").classList.add("hidden");
      
      // ERROR WAS HERE: Do NOT call loadOrders() here. 
    } else {
      // CASE B: Logged In
      // Hide Login, Show Dashboard
      document.getElementById("admin-login-section").classList.add("hidden");
      document.getElementById("admin-dashboard-section").classList.remove("hidden");

      // Initialize the Dashboard Tabs (Dashboard, Orders, Products)
      if (typeof switchAdminTab === "function") {
          switchAdminTab('dashboard'); 
      } else {
          // Fallback if tabs aren't set up yet
          loadOrders(); 
      }
    }
    
  } else {
    // --- STOREFRONT MODE ---
    
    storefrontEls.forEach((el) => el.classList.remove("hidden"));
    if (adminContainer) adminContainer.classList.add("hidden");
    
    // Add padding back for the navigation bar
    bodyEl.classList.add("pt-28", "md:pt-32");
    
    if (typeof initStore === "function") {
        initStore();
    }
  }
}
/* =========================================
   ADMIN: LOAD ORDERS
   ========================================= */
async function loadOrders() {
    const tbody = document.getElementById("orders-table-body");
    if (!tbody) return; 

    // Fetch orders from Supabase
    const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error loading orders:", error);
        tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-red-400">Error loading data</td></tr>`;
        return;
    }

    if (!orders || orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-gray-400 text-xs uppercase tracking-widest">No orders found</td></tr>`;
        return;
    }

    tbody.innerHTML = orders.map(order => {
        // 1. Safe Date Formatting
        let dateStr = "N/A";
        try {
            if (order.created_at) {
                dateStr = new Date(order.created_at).toLocaleDateString("en-US", { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
            }
        } catch(e) { console.error(e); }

        // 2. Items Formatting
        let itemsHtml = "";
        if (Array.isArray(order.items)) {
             itemsHtml = order.items.map(i => 
                 `<div class="mb-1 text-[11px] leading-tight">
                    <span class="font-bold text-black">${i.qty}x</span> ${i.name} 
                    <span class="text-gray-400 text-[10px]">(${i.variant || 'Std'})</span>
                  </div>`
             ).join("");
        }

        // 3. Status Badge Logic
        let statusClasses = "bg-yellow-50 text-yellow-700 border-yellow-100";
        if (order.status === 'Completed') statusClasses = "bg-green-50 text-green-700 border-green-100";
        if (order.status === 'Cancelled') statusClasses = "bg-red-50 text-red-700 border-red-100";

        // 4. FIX: Robust Price Formatting
        // Step A: Ensure we have a clean string/number (remove any existing currency symbols)
        const cleanPrice = String(order.total_price || "0").replace(/[^\d.-]/g, '');
        // Step B: Convert to actual Number type
        const numericPrice = parseFloat(cleanPrice);
        // Step C: Format with fallback to 0.00 if conversion fails
        const formattedPrice = !isNaN(numericPrice) 
            ? numericPrice.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
            : "0.00";

        return `
        <tr class="hover:bg-gray-50/50 transition-colors">
            <td class="p-4 text-[10px] font-mono text-gray-400">#${order.id.toString().slice(-6)}</td>
            <td class="p-4">
                <div class="font-bold text-gray-900 text-sm">${order.customer_name}</div>
                <div class="text-[10px] text-gray-500 truncate max-w-[140px]" title="${order.address}">${order.address}</div>
            </td>
            <td class="p-4 align-top">${itemsHtml}</td>
            <td class="p-4 font-bold text-sm text-gray-900">₱${formattedPrice}</td>
            <td class="p-4">
                <span class="text-[9px] font-bold uppercase border border-gray-200 px-2 py-0.5 rounded bg-gray-50 text-gray-600">
                    ${order.payment_method}
                </span>
            </td>
            <td class="p-4">
                <span class="px-2 py-1 rounded-full border text-[9px] font-black uppercase tracking-tighter ${statusClasses}">
                    ${order.status || 'PENDING'}
                </span>
            </td>
            <td class="p-4 text-[11px] text-gray-400 whitespace-nowrap">${dateStr}</td>
        </tr>`;
    }).join("");
}/* =========================================
   ADMIN DASHBOARD LOGIC
   ========================================= */

// 1. Switch Tabs (Sidebar Navigation)
window.switchAdminTab = function(tabName) {
    // Hide all tabs
    document.querySelectorAll('.admin-tab').forEach(el => el.classList.add('hidden'));
    
    // Show selected tab
    document.getElementById('admin-tab-' + tabName).classList.remove('hidden');
    
    // Update Sidebar Button Styles (Active vs Inactive)
    document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.remove('bg-black', 'text-white');
        btn.classList.add('text-gray-600', 'hover:bg-gray-100');
    });
    
    // Set Active Button Style
    var activeBtn = document.getElementById('nav-' + tabName);
    if(activeBtn) {
        activeBtn.classList.remove('text-gray-600', 'hover:bg-gray-100');
        activeBtn.classList.add('bg-black', 'text-white');
    }

    // Load Data based on tab
    if (tabName === 'dashboard') loadStats();
    if (tabName === 'orders') loadOrders();
    if (tabName === 'products') loadAdminProducts();
};

// 2. Load Dashboard Statistics
async function loadStats() {
    // Get Orders
    const { data: orders, error } = await supabase.from('orders').select('*');
    if(error) return;

    // Calculate
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'Pending').length;
    
    // Calculate Revenue (Basic sum of strings, assuming format "₱1,200.00")
    let totalRevenue = 0;
    orders.forEach(o => {
        // Remove '₱', ',' and convert to float
        let price = parseFloat(o.total_price.replace(/[^\d.-]/g, ''));
        if(!isNaN(price)) totalRevenue += price;
    });

    // Update UI
    document.getElementById('stat-total-orders').innerText = totalOrders;
    document.getElementById('stat-pending').innerText = pendingOrders;
    document.getElementById('stat-revenue').innerText = '₱' + totalRevenue.toLocaleString();
}

// 3. Load Admin Product List (With Delete Button)
async function loadAdminProducts() {
    const tbody = document.getElementById("admin-products-table-body");
    tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center">Loading...</td></tr>';

    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

    if (error || !products) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-red-500">Error loading products</td></tr>';
        return;
    }

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-400">No products found.</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(p => {
        // 1. Format Color Badge
        let colorBadge = "";
        if (p.color === "Gold") {
            colorBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">GOLD</span>`;
        } else if (p.color === "Silver") {
            colorBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">SILVER</span>`;
        }

        // 2. Format Variant Count
        let variantInfo = `<span class="text-xs text-gray-400">One Size</span>`;
        if (p.sizes && Array.isArray(p.sizes) && p.sizes.length > 0) {
            variantInfo = `<span class="text-xs font-medium text-gray-600">${p.sizes.length} Sizes</span>`;
        }

        return `
        <tr class="hover:bg-gray-50 group border-b border-gray-50">
            <td class="p-4">
                <div class="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden">
                    <img src="${p.image_url}" class="w-full h-full object-cover">
                </div>
            </td>
            <td class="p-4">
                <div class="font-bold text-gray-900 text-sm">${p.name}</div>
                <div class="mt-1">${colorBadge}</div>
            </td>
            <td class="p-4 text-xs uppercase text-gray-500 font-bold tracking-wider">
                ${p.category}
                <div class="mt-1 font-normal normal-case">${variantInfo}</div>
            </td>
            <td class="p-4 font-mono text-sm font-medium text-gray-900">${p.price}</td>
            <td class="p-4 text-right">
                <button onclick="deleteProduct(${p.id})" class="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Delete Product">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </td>
        </tr>
        `;
    }).join("");
}

// 4. Delete Product Function
window.deleteProduct = function(id) {
    // Open Custom Modal instead of window.confirm
    openConfirmModal(async () => {
        
        // This runs only if user clicks "Yes, Delete"
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) {
            showToast("Error deleting: " + error.message, "error");
        } else {
            // 1. Show Success Toast
            showToast("Product deleted successfully", "success");
            
            // 2. Refresh Lists
            loadAdminProducts();
            
            // 3. Refresh Storefront (silently)
            if(typeof fetchProducts === 'function') fetchProducts();
        }
    });
};

// 5. Initialize Admin on Load (Attach to your existing handleRoute)
// Ensure you call switchAdminTab('dashboard') when admin logs in.

window.addEventListener("hashchange", handleRoute);
window.addEventListener("DOMContentLoaded", handleRoute);

async function initStore() {
  var { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (!error && data && data.length > 0) {
    products = data.map(function (p) {
      return {
        id: p.id,
        category: p.category,
        name: p.name,
        price: p.price,
        createdAt: p.created_at,
        description: p.description,
        img: p.image_url,
        color: p.color || "N/A", 
        sizes: p.sizes || [],     
        weights: p.weights || []  
      };
    });
  } else {
    products = [];
  }

  // If you are on the admin page, this might run differently, 
  // but for the storefront, we display all.
  displayProducts('all');
}
var grid = document.getElementById("product-grid");

function displayProducts(filter) {
  if (!grid) grid = document.getElementById("product-grid");
  grid.innerHTML = "";
  var filteredData =
    filter === "all"
      ? products
      : products.filter(function (item) {
          return item.category.toLowerCase() === filter.toLowerCase();
        });

  if (filteredData.length === 0) {
    grid.innerHTML = `
                <div style="grid-column: 1 / -1;" class="flex flex-col items-center justify-center py-16 md:py-24 text-center w-full px-4">
                    <div class="bg-gray-100 p-5 md:p-6 rounded-full mb-4 md:mb-6">
                        <svg class="w-8 h-8 md:w-10 md:h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                    </div>
                    <h3 class="text-lg md:text-xl font-bold text-gray-900 mb-2">No products available yet</h3>
                    <p class="text-gray-500 text-xs md:text-sm max-w-sm">We're currently curating our collection. Please check back later for new arrivals.</p>
                </div>`;
    return;
  }
  

  filteredData.forEach(function (item) {
    // Check if product is less than 7 days old
    const isNew = (new Date() - new Date(item.createdAt)) < (7 * 24 * 60 * 60 * 1000);
    const newLabel = isNew ? `<div class="new-label">New</div>` : "";

    var card = `
                <div class="product-card" onclick="openModal(${item.id})">
                    <div class="card-image-box">
                        ${newLabel}
                        <img loading="lazy" src="${item.img}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/400?text=No+Image'">
                        <button class="quick-add-btn" onclick="addToCart(event, ${item.id})" aria-label="Add to cart">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                    </div>
                    <div class="card-content">
                        <div class="card-cat">${item.category}</div>
                        <div class="flex justify-between items-start gap-2 mt-1">
                            <h3 class="card-title">${item.name}</h3>
                            <div class="card-price text-right shrink-0 !mt-0">${item.price}</div>
                        </div>
                    </div>
                </div>
            `;
    grid.innerHTML += card;
  });
}

function filterSelection(btn) {
    var category = btn.dataset.category;
    var buttons = document.querySelectorAll('.filter-btn');

    buttons.forEach(function(b) {
        b.classList.remove('active', 'bg-black', 'text-white');
        b.classList.add('bg-white', 'text-gray-400', 'border', 'border-gray-100');
    });

    btn.classList.remove('bg-white', 'text-gray-400', 'border', 'border-gray-100');
    btn.classList.add('active', 'bg-black', 'text-white');

    displayProducts(category);
}

// ================= IMAGE ZOOM =================

let scale = 1;
let isDragging = false;
let startX, startY;
let translateX = 0;
let translateY = 0;

const zoomContainer = document.getElementById('zoom-container');
const modalImg = document.getElementById('modal-img');

if (zoomContainer) {
    zoomContainer.addEventListener('click', function () {
        if (scale === 1) {
            scale = 2;
            zoomContainer.classList.add('zoomed');
        } else {
            resetZoom();
        }
        updateTransform();
    });

    zoomContainer.addEventListener('wheel', function (e) {
        e.preventDefault();
        scale += e.deltaY * -0.001;
        scale = Math.min(Math.max(1, scale), 4);
        updateTransform();
    });

    zoomContainer.addEventListener('mousedown', function (e) {
        if (scale <= 1) return;
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
    });

    window.addEventListener('mousemove', function (e) {
        if (!isDragging) return;
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        updateTransform();
    });

    window.addEventListener('mouseup', function () {
        isDragging = false;
    });

    zoomContainer.addEventListener('touchmove', function (e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (!zoomContainer.dataset.lastDistance) {
                zoomContainer.dataset.lastDistance = distance;
                return;
            }

            let lastDistance = zoomContainer.dataset.lastDistance;
            let diff = distance - lastDistance;
            scale += diff * 0.005;
            scale = Math.min(Math.max(1, scale), 4);
            zoomContainer.dataset.lastDistance = distance;
            updateTransform();
        }
    });

    zoomContainer.addEventListener('touchend', function () {
        zoomContainer.dataset.lastDistance = null;
    });
}

function updateTransform() {
    if (modalImg) {
        modalImg.style.transform = `scale(${scale}) translate(${translateX / scale}px, ${translateY / scale}px)`;
    }
}

function resetZoom() {
    scale = 1;
    translateX = 0;
    translateY = 0;
    if (zoomContainer) zoomContainer.classList.remove('zoomed');
    updateTransform();
}

function selectCategory(val, btnElement) {
  document.getElementById("add-category").value = val;
  var pills = document.querySelectorAll(".category-pill");
  pills.forEach(function (pill) {
    pill.classList.remove("bg-black", "text-white", "border-black");
    pill.classList.add("bg-white", "text-gray-400", "border-gray-200");
  });
  btnElement.classList.remove("bg-white", "text-gray-400", "border-gray-200");
  btnElement.classList.add("bg-black", "text-white", "border-black");
}
function selectColor(val, btnElement) {
  // Set the hidden input value
  document.getElementById("add-color").value = val;

  // Reset all color pills to inactive style
  var pills = document.querySelectorAll(".color-pill");
  pills.forEach(function (pill) {
    pill.classList.remove("bg-black", "text-white", "border-black");
    pill.classList.add("bg-white", "text-gray-400", "border-gray-200");
  });

  // Set clicked pill to active style
  btnElement.classList.remove("bg-white", "text-gray-400", "border-gray-200");
  btnElement.classList.add("bg-black", "text-white", "border-black");
}

// --- UPDATED ADD TO CART FUNCTION ---
function addToCart(event, id, variant) {
  // FIX: This stops the click from bubbling up to the product card
  if (event) {
    event.stopPropagation();
  }

  var product = products.find(p => p.id == id);
  if (!product) return;

  var uniqueCartId = variant 
    ? `${product.id}-${variant.color}-${variant.size}` 
    : product.id;

  var existingItem = cart.find(item => item.cartId === uniqueCartId);

  if (existingItem) {
    existingItem.qty++;
  } else {
    cart.push({
      cartId: uniqueCartId,
      id: product.id,
      name: product.name,
      price: product.price,
      img: product.img,
      qty: 1,
      color: variant ? variant.color : "Standard",
      size: variant ? variant.size : null,
      weight: variant ? variant.weight : null
    });
  }
  showToast(product.name);
  
  if (typeof updateCartUI === "function") updateCartUI();
  
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCartUI();
}

function addSizeWeightRow(size = "", weight = "") {
  var container = document.getElementById("size-weight-container");
  if (!container) return;

  var row = document.createElement("div");
  row.className = "flex gap-3 items-center";

  row.innerHTML = `
        <input type="text"
            class="size-input flex-1 border border-gray-200 p-3 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-black outline-none transition"
            placeholder="Size"
            value="${size}"
            required>

        <input type="text"
            class="weight-input flex-1 border border-gray-200 p-3 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-black outline-none transition"
            placeholder="Weight"
            value="${weight}"
            required>

        <button type="button"
            onclick="this.parentElement.remove()"
            class="text-red-500 font-bold text-sm">
            ✕
        </button>
    `;
  container.appendChild(row);
}

/* =========================================
   FIXED CART LOGIC (Quantity & Rendering)
   ========================================= */

// 1. GLOBALLY ACCESSIBLE Change Quantity Function
window.changeQty = function(index, change) {
  // Check if item exists
  if (!cart[index]) return;

  // Initialize qty if missing
  if (typeof cart[index].qty === 'undefined') {
    cart[index].qty = 1;
  }

  // Update quantity
  cart[index].qty += change;

  // Enforce minimum of 1
  if (cart[index].qty < 1) {
    cart[index].qty = 1; 
  }

  // Re-render to show new number
  updateCartUI();
};

// 2. Remove Function
window.removeFromCart = function(index) {
  cart.splice(index, 1);
  updateCartUI();
};

// 3. Render Function
window.updateCartUI = function() {
  var badge = document.getElementById("cart-badge");
  var container = document.getElementById("cart-items-container");
  var totalEl = document.getElementById("cart-total");

  // --- Badge Update ---
  if (badge) {
    var totalCount = cart.reduce((acc, item) => acc + (item.qty || 1), 0);
    badge.innerText = totalCount;
    if (totalCount > 0) badge.classList.add("show");
    else badge.classList.remove("show");
  }

  if (!container || !totalEl) return;

  // --- Empty State ---
  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty-state">
        <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
          </svg>
        </div>
        <p class="text-sm font-bold text-gray-900">Your bag is empty</p>
        <button onclick="toggleCart()" class="mt-6 bg-black text-white px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform">
          Start Shopping
        </button>
      </div>`;
    totalEl.innerText = "₱0.00";
    if(typeof updateCheckoutLink === 'function') updateCheckoutLink(0);
    return;
  }

  // --- Render Items ---
  container.innerHTML = "";
  var totalPrice = 0;
  
  // Filter out default words
  var hiddenVariants = ['standard', 'n/a', 'default', 'default title', ''];

  cart.forEach(function (item, index) {
    // Force Qty to 1 if it's missing/undefined
    if (!item.qty || item.qty < 1) item.qty = 1;

    var priceNum = parseFloat(item.price.replace(/[^0-9.]/g, ""));
    totalPrice += priceNum * item.qty;
    
    // Variant Logic
    var variantText = [];
    if(item.color && !hiddenVariants.includes(item.color.toLowerCase().trim())) {
        variantText.push(item.color);
    }
    if(item.size && !hiddenVariants.includes(item.size.toLowerCase().trim())) {
        variantText.push(item.size);
    }
    var variantString = variantText.join(" / ");

    container.innerHTML += `
      <div class="cart-item">
        <div class="cart-item-img-box">
           <img src="${item.img}" class="cart-item-img" alt="${item.name}">
        </div>
        
        <div class="cart-item-details">
          <div>
            <div class="cart-item-top">
              <div class="cart-item-title">${item.name}</div>
              <div class="remove-link" onclick="removeFromCart(${index})">Remove</div>
            </div>
            
            ${variantString ? `<div class="cart-item-variant">${variantString}</div>` : ''}
          </div>

          <div class="cart-item-bottom">
            <div class="qty-control">
              <div class="qty-btn" onclick="window.changeQty(${index}, -1)">−</div>
              <div class="qty-val">${item.qty}</div>
              <div class="qty-btn" onclick="window.changeQty(${index}, 1)">+</div>
            </div>
            <div class="cart-item-price">₱${(priceNum * item.qty).toLocaleString("en-PH")}</div>
          </div>
        </div>
      </div>`;
  });

  var formattedTotal = "₱" + totalPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 });
  totalEl.innerText = formattedTotal;
  if(typeof updateCheckoutLink === 'function') updateCheckoutLink(formattedTotal);
};

function toggleCart() {
  var sidebar = document.getElementById("cart-sidebar");
  var overlay = document.getElementById("cart-overlay");
  if (!sidebar || !overlay) return;

  if (sidebar.classList.contains("active")) {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
    document.body.classList.remove("no-scroll");
  } else {
    sidebar.classList.add("active");
    overlay.classList.add("active");
    document.body.classList.add("no-scroll");
  }
}

var searchModal = document.getElementById("search-modal");
var searchInput = document.getElementById("search-input");
var searchList = document.getElementById("search-results-list");
var productModal = document.getElementById("product-modal");


function openSearch() {
  if (!searchModal) searchModal = document.getElementById("search-modal");
  if (!searchInput) searchInput = document.getElementById("search-input");
  
  if (searchModal) searchModal.classList.add("active");
  if (searchInput) {
    searchInput.value = ""; // Clear previous text
    searchInput.focus();
  }
  
  // FIX: Force the suggestions to load every time we open
  performSearch(""); 
  
  document.body.classList.add("no-scroll");
}

function closeSearch() {
  if (!searchModal) searchModal = document.getElementById("search-modal");
  if (!searchInput) searchInput = document.getElementById("search-input");
  
  if (searchModal) searchModal.classList.remove("active");
  
  // Optional: We don't strictly need to wipe innerHTML here anymore 
  // because openSearch() will reset it anyway.
  
  document.body.classList.remove("no-scroll");
}

// FIX: This function was missing but is called by your HTML pills
function quickSearch(term) {
  if (!searchInput) searchInput = document.getElementById("search-input");
  searchInput.value = term;
  performSearch(term);
}

function performSearch(query) {
  var list = document.getElementById("search-results-list");
  if (!query) {
    list.innerHTML = `
      <div class="search-placeholder-state">
        <p class="search-section-label">Suggested Collections</p>
        <div class="search-suggestion-pills">
          <span onclick="quickSearch('Rings')">Rings</span>
          <span onclick="quickSearch('Necklaces')">Necklaces</span>
          <span onclick="quickSearch('Earrings')">Earrings</span>
          <span onclick="quickSearch('Bracelet')">Gold</span>
        </div>
      </div>`;
    return;
  }

  var lowerQuery = query.toLowerCase();

  var filtered = products.filter(p => {
    return (
      p.name.toLowerCase().includes(lowerQuery) || 
      p.category.toLowerCase().includes(lowerQuery) ||
      p.price.toString().toLowerCase().includes(lowerQuery) // Added price search
    );
  });

  list.innerHTML = `<p class="search-section-label">${filtered.length} Results for "${query}"</p>`;

  if (filtered.length === 0) {
    list.innerHTML += `<p class="text-gray-400 py-10">We couldn't find anything matching that search.</p>`;
    return;
  }

  filtered.forEach(p => {
    list.innerHTML += `
      <div class="search-item-card" onclick="closeSearch(); openModal(${p.id})">
        <img src="${p.img}" alt="${p.name}">
        <div>
          <div class="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">${p.category}</div>
          <div class="search-item-name">${p.name}</div>
          <div class="search-item-price">${p.price}</div>
        </div>
      </div>`;
  });
}

/* =========================================
   FINALIZED LOGIC: DATA HANDLING & UI
   ========================================= */

// Helper to extract data if it's a string
function parseSpecsString(str) {
  if (!str) return { sizes: [], weights: [] };
  var sizes = [];
  var weights = [];
  var lines = str.split('\n');
  
  lines.forEach(line => {
    // Looks for "Size: 6 Weight: 2.1g" OR "6 / 2.1g"
    var match = line.match(/size:\s*(.*?)\s+weight:\s*(.*)/i);
    if (match) {
        sizes.push(match[1].trim());
        weights.push(match[2].trim());
    } else if (line.includes('/')) {
        var parts = line.split('/');
        sizes.push(parts[0].trim());
        weights.push(parts[1].trim());
    }
  });
  return { sizes: sizes, weights: weights };
}

/* =========================================
   OPEN PRODUCT MODAL (Updated for Variants)
   ========================================= */

var productModal = document.getElementById("product-modal");
var currentActiveProduct = null;
var currentSelectedVariant = null;

/* =========================================
   STOREFRONT: OPEN PRODUCT MODAL (With Color)
   ========================================= */
function openModal(id) {
  var product = products.find(p => p.id == id);
  if (!product) return;

  currentActiveProduct = product;
  currentSelectedVariant = null; 
  var productModal = document.getElementById("product-modal");

  // 1. Fill Basic Info
  // Checks for 'image_url' (new) or 'img' (old)
  document.getElementById("modal-img").src = product.image_url || product.img || ""; 
  document.getElementById("modal-category").innerText = product.category || "JEWELRY";
  document.getElementById("modal-title").innerText = product.name;
  document.getElementById("modal-price").innerText = product.price; // e.g. "₱1,500"
  document.getElementById("modal-desc").innerText = product.description || "No description available.";

  // 2. COLOR BADGE LOGIC
  var colorBadge = document.getElementById("modal-color-badge");
  var pColor = product.color || ""; // Read from DB column 'color'

  // Normalize text (handle "Gold", "gold", "GOLD")
  var colorLower = pColor.toLowerCase();

  if (colorLower.includes("gold")) {
    colorBadge.classList.remove("hidden");
    colorBadge.innerText = "GOLD";
    // Yellow/Gold Style
    colorBadge.className = "ml-2 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border border-yellow-200 bg-yellow-50 text-yellow-800 rounded shadow-sm";
  } else if (colorLower.includes("silver")) {
    colorBadge.classList.remove("hidden");
    colorBadge.innerText = "SILVER";
    // Gray/Silver Style
    colorBadge.className = "ml-2 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border border-gray-200 bg-gray-50 text-gray-600 rounded shadow-sm";
  } else {
    // Hide if no color specified
    colorBadge.classList.add("hidden");
  }

  // 3. VARIANT LOGIC (Size & Weight)
  var variantOptions = [];
  
  // Check for the new JSONB columns 'sizes' and 'weights'
  if (product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0) {
      variantOptions = product.sizes.map((size, index) => {
          // Match size with weight at same index
          var w = (product.weights && product.weights[index]) ? product.weights[index] : "N/A";
          return { size: size, weight: w };
      });
  }

  // 4. GENERATE BUTTONS
  var specsContainer = document.getElementById("modal-specs-container");
  var sizeList = document.getElementById("modal-size-list");
  var weightDisplay = document.getElementById("modal-weight-display");
  
  sizeList.innerHTML = ""; // Clear old buttons

  if (variantOptions.length > 0) {
    specsContainer.classList.remove("hidden");
    
    // Select first option by default
    var first = variantOptions[0];
    weightDisplay.innerText = first.weight;
    
    // Set Initial State
    currentSelectedVariant = { 
        color: pColor, // Save color for the order
        size: first.size, 
        weight: first.weight 
    };

    // Create a button for each size
    variantOptions.forEach((v, index) => {
      var btn = document.createElement("button");
      btn.className = "h-10 min-w-[3rem] px-3 rounded-lg border text-sm font-bold transition-all duration-200";
      btn.innerText = v.size;
      
      // Highlight the first one
      if (index === 0) setBtnSelected(btn);
      else setBtnUnselected(btn);

      btn.onclick = function() {
        // Visual Update
        sizeList.querySelectorAll("button").forEach(b => setBtnUnselected(b));
        setBtnSelected(this);
        
        // Data Update
        weightDisplay.innerText = v.weight;
        currentSelectedVariant = { 
            color: pColor, 
            size: v.size, 
            weight: v.weight 
        };
      };
      sizeList.appendChild(btn);
    });

  } else {
    // One Size Product (No variants)
    specsContainer.classList.add("hidden");
    currentSelectedVariant = { 
        color: pColor, 
        size: "One Size", 
        weight: "N/A" 
    };
  }

  // 5. SETUP "ADD TO BAG" BUTTON
  var addBtn = document.getElementById("modal-add-btn");
  var newAddBtn = addBtn.cloneNode(true); // Clone to clear old listeners
  addBtn.parentNode.replaceChild(newAddBtn, addBtn);
  
  newAddBtn.onclick = function() {
    addToCart(null, product.id, currentSelectedVariant); 
    closeModalDirect();
    toggleCart(); 
  };

  // 6. SHOW MODAL
  productModal.classList.remove("pointer-events-none", "opacity-0");
  productModal.querySelector('.transform').classList.remove("scale-95");
  productModal.querySelector('.transform').classList.add("scale-100");
  document.body.classList.add("no-scroll");
}
/* =========================================
   UI HELPERS: TOASTS & CONFIRM MODAL
   ========================================= */

// 1. Show Beautiful Toast
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    
    // Create Element
    const toast = document.createElement('div');
    
    // Icons
    const checkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    const errorIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

    // Styles based on type
    const styles = type === 'success' 
        ? 'bg-white border-l-4 border-green-500 text-gray-800' 
        : 'bg-white border-l-4 border-red-500 text-gray-800';
    
    const iconBg = type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600';
    const iconSvg = type === 'success' ? checkIcon : errorIcon;

    toast.className = `pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl ${styles} transform transition-all duration-500 translate-y-[-20px] opacity-0 min-w-[300px]`;
    
    toast.innerHTML = `
        <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}">
            ${iconSvg}
        </div>
        <p class="text-sm font-bold">${message}</p>
    `;

    container.appendChild(toast);

    // Animate In
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-[-20px]', 'opacity-0');
    });

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-[-20px]');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// 2. Confirmation Modal Logic
let confirmCallback = null;

window.openConfirmModal = function(actionCallback) {
    confirmCallback = actionCallback;
    const modal = document.getElementById('confirm-modal');
    modal.classList.remove('hidden');
    
    // Simple entry animation
    setTimeout(() => {
        modal.querySelector('div[class*="scale"]').classList.remove('scale-95', 'opacity-0');
    }, 10);
};

window.closeConfirmModal = function() {
    const modal = document.getElementById('confirm-modal');
    modal.classList.add('hidden');
    confirmCallback = null;
};

// Bind the "Yes, Delete" button once
document.addEventListener("DOMContentLoaded", () => {
    const confirmBtn = document.getElementById("confirm-btn-action");
    if(confirmBtn) {
        confirmBtn.onclick = function() {
            if (confirmCallback) confirmCallback();
            closeConfirmModal();
        };
    }
});

/* --- HELPER STYLES --- */
function setBtnSelected(btn) {
  btn.classList.remove("bg-white", "text-gray-900", "border-gray-200", "hover:border-black");
  btn.classList.add("bg-black", "text-white", "border-black", "shadow-md");
}

function setBtnUnselected(btn) {
  btn.classList.add("bg-white", "text-gray-900", "border-gray-200", "hover:border-black");
  btn.classList.remove("bg-black", "text-white", "border-black", "shadow-md");
}

function closeModalDirect() {
  var pm = document.getElementById("product-modal");
  var c = pm.querySelector('.transform');
  
  if(c) {
      c.classList.remove("scale-100");
      c.classList.add("scale-95");
  }
  
  pm.classList.add("pointer-events-none", "opacity-0");
  document.body.classList.remove("no-scroll");
}

/* =========================================
   CHECKOUT & ORDER LOGIC
   ========================================= */

// 1. Open the Modal
function openCheckout() {
  if (cart.length === 0) return;
  
  // Update total in modal
  var totalEl = document.getElementById("cart-total");
  document.getElementById("modal-total").innerText = totalEl ? totalEl.innerText : "₱0.00";
  
  // Show modal
  document.getElementById("checkout-modal").classList.remove("hidden");
}

// 2. Close the Modal
function closeCheckout() {
  document.getElementById("checkout-modal").classList.add("hidden");
}

// 3. Submit Order to Supabase
async function submitOrder(event) {
    event.preventDefault();

    const name = document.getElementById('customer-name').value;
    const address = document.getElementById('customer-address').value;
    const total = document.getElementById('cart-total').innerText;

    // Just save to the database, nothing else
    const { data, error } = await supabase
        .from('orders')
        .insert([{ 
            customer_name: name, 
            address: address, 
            items: cart, 
            total_price: parseFloat(total.replace('₱', '').replace(',', '')),
            status: 'Pending' 
        }]);

    if (error) {
        alert("Error saving order.");
        return;
    }

    alert("Order placed successfully!");
    cart = [];
    updateCart();
    closeCheckoutModal();
}
/* =========================================
   PREMIUM CART & CHECKOUT LOGIC
   ========================================= */

// 1. Quantity Control (Global)
window.changeQty = function(index, change) {
  if (!cart[index]) return;
  if (typeof cart[index].qty === 'undefined') cart[index].qty = 1;

  cart[index].qty += change;
  if (cart[index].qty < 1) cart[index].qty = 1;

  updateCartUI();
};

// 2. Remove Item (Global)
window.removeFromCart = function(index) {
  cart.splice(index, 1);
  updateCartUI();
};

// 3. Render Cart Sidebar (Premium Look)
window.updateCartUI = function() {
  var badge = document.getElementById("cart-badge");
  var container = document.getElementById("cart-items-container");
  var totalEl = document.getElementById("cart-total");

  // Update Badge
  if (badge) {
    var totalCount = cart.reduce((acc, item) => acc + (item.qty || 1), 0);
    badge.innerText = totalCount;
    if (totalCount > 0) badge.classList.add("show");
    else badge.classList.remove("show");
  }

  if (!container || !totalEl) return;

  // Empty State
  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty-state">
        <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
          </svg>
        </div>
        <p class="text-sm font-bold text-gray-900">Your bag is empty</p>
        <button onclick="toggleCart()" class="mt-6 bg-black text-white px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform">
          Start Shopping
        </button>
      </div>`;
    totalEl.innerText = "₱0.00";
    // Disable checkout button if empty
    var checkoutBtn = document.querySelector("button[onclick='openCheckout()']");
    if(checkoutBtn) { checkoutBtn.disabled = true; checkoutBtn.classList.add("opacity-50"); }
    return;
  }
  
  // Enable checkout button
  var checkoutBtn = document.querySelector("button[onclick='openCheckout()']");
  if(checkoutBtn) { checkoutBtn.disabled = false; checkoutBtn.classList.remove("opacity-50"); }

  // Render Items
  container.innerHTML = "";
  var totalPrice = 0;
  var hiddenVariants = ['standard', 'n/a', 'default', 'default title', '', 'null'];

  cart.forEach(function (item, index) {
    if (!item.qty || item.qty < 1) item.qty = 1;

    // Price Calculation
    var priceNum = parseFloat(item.price.replace(/[^0-9.]/g, ""));
    totalPrice += priceNum * item.qty;
    
    // Variant Text Logic
    var variantText = [];
    if(item.color && !hiddenVariants.includes(item.color.toLowerCase().trim())) variantText.push(item.color);
    if(item.size && !hiddenVariants.includes(item.size.toString().toLowerCase().trim())) variantText.push(item.size);
    var variantString = variantText.join(" / ");

    container.innerHTML += `
      <div class="cart-item">
        <div class="cart-item-img-box">
           <img src="${item.img}" class="cart-item-img" alt="${item.name}">
        </div>
        
        <div class="cart-item-details">
          <div>
            <div class="cart-item-top">
              <div class="cart-item-title">${item.name}</div>
              <div class="remove-link" onclick="window.removeFromCart(${index})">Remove</div>
            </div>
            ${variantString ? `<div class="cart-item-variant">${variantString}</div>` : ''}
          </div>

          <div class="cart-item-bottom">
            <div class="qty-control">
              <div class="qty-btn" onclick="window.changeQty(${index}, -1)">−</div>
              <div class="qty-val">${item.qty}</div>
              <div class="qty-btn" onclick="window.changeQty(${index}, 1)">+</div>
            </div>
            <div class="cart-item-price">₱${(priceNum * item.qty).toLocaleString("en-PH")}</div>
          </div>
        </div>
      </div>`;
  });

  var formattedTotal = "₱" + totalPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 });
  totalEl.innerText = formattedTotal;
};


/* =========================================
   CHECKOUT FUNCTIONS
   ========================================= */

// 1. Open Modal
window.openCheckout = function() {
  if (cart.length === 0) return;
  
  // 1. Get the current total
  var totalEl = document.getElementById("cart-total");
  document.getElementById("modal-total").innerText = totalEl ? totalEl.innerText : "₱0.00";
  
  // 2. CLOSE THE SIDEBAR (This is the fix)
  // We check if it's open, then toggle it to close.
  var sidebar = document.getElementById("cart-sidebar");
  if (sidebar && sidebar.classList.contains("active")) {
    toggleCart(); 
  }
  
  // 3. Show the Checkout Modal
  document.getElementById("checkout-modal").classList.remove("hidden");
};

// 2. Close Modal
window.closeCheckout = function() {
  document.getElementById("checkout-modal").classList.add("hidden");
};

// 3. Submit Order
/* =========================================
   FINALIZED: DIRECT DATABASE ORDER FLOW
   ========================================= */

// 1. Simple Success Modal (No Messenger Logic)
window.openSuccessModal = function(orderId, name) {
  var successModal = document.getElementById("success-modal");
  
  if(successModal) {
      // Set Name & ID
      var nameEl = document.getElementById("success-customer-name");
      var idEl = document.getElementById("success-order-id");
      
      if(nameEl) nameEl.innerText = name;
      if(idEl) idEl.innerText = "#" + orderId;

      // Show Modal & Freeze Background
      successModal.classList.remove("hidden");
      document.body.classList.add("no-scroll");
  }
};

window.closeSuccessModal = function() {
  var successModal = document.getElementById("success-modal");
  if(successModal) {
      successModal.classList.add("hidden");
      document.body.classList.remove("no-scroll");
  }
};

// 2. Submit Order Function
window.submitOrder = async function(e) {
  e.preventDefault();
  
  var btn = document.getElementById("btn-place-order");
  var originalText = btn.innerText;
  
  // Loading State
  btn.innerText = "Processing...";
  btn.disabled = true;

  // Gather Data
  var name = document.getElementById("customer-name").value;
  var address = document.getElementById("customer-address").value;
  var paymentEl = document.querySelector('input[name="payment"]:checked');
  var payment = paymentEl ? paymentEl.value : "COD"; 
  var total = document.getElementById("modal-total").innerText;

  // Prepare Items
  var orderItems = cart.map(item => {
    var specs = [item.color, item.size]
       .filter(v => v && !['standard', 'n/a', 'null', 'default'].includes(String(v).toLowerCase()))
       .join(" / ");
       
    return {
      name: item.name,
      qty: item.qty || 1,
      price: item.price,
      variant: specs
    };
  });

  // --- SAVE TO DATABASE ---
  const { data, error } = await supabase
    .from('orders')
    .insert([{ 
        customer_name: name,
        address: address,
        payment_method: payment,
        total_price: total,
        items: orderItems,
        status: 'Pending' // This will show up in your Admin Panel
    }])
    .select();

  if (error) {
    alert("Error placing order: " + error.message);
    btn.innerText = originalText;
    btn.disabled = false;
  } else {
    // --- SUCCESS ---
    var orderId = data[0].id;
    
    // 1. Clear Cart
    cart = [];
    updateCartUI();
    
    // 2. Close Checkout Form
    closeCheckout(); 
    
    // 3. Reset Button
    btn.innerText = originalText;
    btn.disabled = false;

    // 4. Show Simple "Thank You" Modal
    openSuccessModal(orderId, name);
  }
};

// Toast Helper
function showCustomToast(msg) {
  var toast = document.createElement("div");
  toast.style.cssText = `
      position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(20px);
      background: #111; color: white; padding: 12px 24px; border-radius: 50px;
      font-size: 14px; font-weight: 600; z-index: 9999; opacity: 0; transition: all 0.3s ease;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2); pointer-events: none;
  `;
  toast.innerText = msg;
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
     toast.style.opacity = "1";
     toast.style.transform = "translateX(-50%) translateY(0)";
  }, 10);
  
  // Animate out
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(20px)";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}


function showToast(msg) {
  var t = document.getElementById("toast");
  if (!t) return;
  t.innerText = msg;
  t.classList.add("show");
  setTimeout(function () {
    t.classList.remove("show");
  }, 3000);
}
function showToast(productName) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = "toast-notification";
  toast.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
    <span>${productName} added to bag</span>
  `;
  
  container.appendChild(toast);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    toast.classList.add("toast-exit");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

document.addEventListener("keydown", function (event) {
  if (!productModal) productModal = document.getElementById("product-modal");
  if (!searchModal) searchModal = document.getElementById("search-modal");
  if (event.key === "Escape") {
    if (document.getElementById("custom-alert-overlay").classList.contains("active"))
      closeCustomAlert();
    else if (productModal && productModal.classList.contains("active"))
      closeModalDirect();
    else if (searchModal && searchModal.classList.contains("active"))
      closeSearch();
    else if (document.getElementById("cart-sidebar") && document.getElementById("cart-sidebar").classList.contains("active"))
      toggleCart();
  }
});



function previewImage(event) {
  var input = event.target;
  var preview = document.getElementById("image-preview");
  var placeholder = document.getElementById("upload-placeholder");
  var removeBtn = document.getElementById("remove-img-btn");

  if (input.files && input.files[0]) {
    var reader = new FileReader();
    reader.onload = function (e) {
      preview.src = e.target.result;
      preview.classList.remove("hidden");
      placeholder.style.opacity = "0";
      removeBtn.classList.remove("hidden");
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function clearImagePreview() {
  var input = document.getElementById("add-img-file");
  var preview = document.getElementById("image-preview");
  var placeholder = document.getElementById("upload-placeholder");
  var removeBtn = document.getElementById("remove-img-btn");

  if (input) input.value = "";
  if (preview) { preview.src = ""; preview.classList.add("hidden"); }
  if (placeholder) placeholder.style.opacity = "1";
  if (removeBtn) removeBtn.classList.add("hidden");
}

async function checkAdminAuth() {
  var { data: { session } } = await supabase.auth.getSession();
  if (session) {
    document.getElementById("admin-login-section").classList.add("hidden");
    document.getElementById("admin-dashboard-section").classList.remove("hidden");
  } else {
    document.getElementById("admin-login-section").classList.remove("hidden");
    document.getElementById("admin-dashboard-section").classList.add("hidden");
  }
}

async function handleAdminLogin(e) {
  e.preventDefault();
  var email = document.getElementById("admin-email").value;
  var password = document.getElementById("admin-password").value;

  var { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    showCustomAlert("Login Failed", error.message);
  } else {
    checkAdminAuth();
  }
}

async function handleAdminLogout() {
  await supabase.auth.signOut();
  checkAdminAuth();
}

/* =========================================
   ADMIN: VARIANT BUILDER LOGIC
   ========================================= */

// Global variable to hold temporary variants
/* =========================================
   ADMIN: VARIANT BUILDER (Size + Weight)
   ========================================= */
let tempVariants = [];

window.addVariantToList = function() {
    const sizeInput = document.getElementById("variant-size-input");
    const weightInput = document.getElementById("variant-weight-input");
    
    const size = sizeInput.value.trim();
    const weight = weightInput.value.trim();

    if(!size || !weight) {
        alert("Please enter both Size and Weight.");
        return;
    }

    tempVariants.push({ size, weight });
    sizeInput.value = "";
    weightInput.value = "";
    renderVariantList();
};

window.removeVariant = function(index) {
    tempVariants.splice(index, 1);
    renderVariantList();
};

function renderVariantList() {
    const listEl = document.getElementById("variant-list");
    if (tempVariants.length === 0) {
        listEl.innerHTML = '<li id="no-variants-msg" class="text-xs text-gray-400 italic">No variants added yet.</li>';
        return;
    }
    listEl.innerHTML = tempVariants.map((v, index) => `
        <li class="flex justify-between items-center bg-white border border-gray-200 p-2 rounded-lg text-sm">
            <span>
                <span class="font-bold">Size:</span> ${v.size} 
                <span class="text-gray-300 mx-2">|</span> 
                <span class="font-bold">Weight:</span> ${v.weight}
            </span>
            <button type="button" onclick="removeVariant(${index})" class="text-red-500 hover:text-red-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </li>
    `).join("");
}

/* =========================================
   ADMIN: ADD PRODUCT (Custom Columns)
   ========================================= */
window.addProduct = async function(e) {
  e.preventDefault();
  
  var btn = e.target.querySelector("button[type='submit']");
  var originalText = btn.innerText;
  btn.innerText = "Processing...";
  btn.disabled = true;

  try {
      // 1. Gather Basic Info
      var name = document.getElementById("product-name").value;
      var price = document.getElementById("product-price").value;
      var desc = document.getElementById("product-desc").value;
      var category = document.querySelector('input[name="category"]:checked').value || "rings";
      var color = document.querySelector('input[name="p-color"]:checked').value || "Gold";

      // 2. Upload Image
      var fileInput = document.getElementById("product-image-file");
      var file = fileInput.files[0];
      var imageUrl = "";

      if (file) {
          var fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
          const { error: upErr } = await supabase.storage.from('product-images').upload(fileName, file);
          if (upErr) throw upErr;
          
          const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
          imageUrl = data.publicUrl;
      } else {
          throw new Error("Please select an image.");
      }

      btn.innerText = "Saving to Database...";

      // 3. PREPARE DATA FOR JSONB COLUMNS
      // We take the tempVariants list (e.g. [{size: "7", weight: "2g"}, {size: "8", weight: "3g"}])
      // And split it into two matching arrays.
      
      var sizesArray = tempVariants.map(v => v.size);     // ["7", "8"]
      var weightsArray = tempVariants.map(v => v.weight); // ["2g", "3g"]

      var formattedPrice = "₱" + parseFloat(price).toLocaleString(undefined, {minimumFractionDigits: 2});

      // 4. INSERT INTO PRODUCTS TABLE
      // This matches your Schema: color (text), sizes (jsonb), weights (jsonb)
      const { error } = await supabase
        .from('products')
        .insert([{ 
            name: name,
            price: formattedPrice,
            category: category,
            image_url: imageUrl,
            description: desc,
            color: color,         // Saves "Gold" or "Silver" (text)
            sizes: sizesArray,    // Saves ["7", "8"] (jsonb)
            weights: weightsArray // Saves ["2g", "3g"] (jsonb)
        }]);

      if (error) throw error;

      // REPLACE alert() WITH THIS:
      showToast("Product published successfully!", "success");
      
      e.target.reset();
      tempVariants = [];
      renderVariantList();
      loadAdminProducts(); 
      
  } catch (err) {
      console.error(err);
      // Use Error Toast
      showToast(err.message || "Unknown error occurred", "error");
  } finally {
      btn.innerText = originalText;
      btn.disabled = false;
  }

}