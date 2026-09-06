document.addEventListener("DOMContentLoaded", async () => {
  Services.setAppVersion();

  // --- Service Worker registration and PWA install/update handling ---
  const isLocalDev =
    location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  if ('serviceWorker' in navigator && !isLocalDev) {
    try {
      const reg = await navigator.serviceWorker.register('sw.js');

      // If there's an already-waiting SW, prompt for update
      if (reg.waiting) handleSWWaiting(reg);

      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        newSW?.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            handleSWWaiting(reg);
          }
        });
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // page will be controlled by new SW
        console.log('controller changed — reloading');
        window.location.reload();
      });
    } catch (err) {
      console.warn('SW registration failed', err);
    }
  }

  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById('installBtn');
    if (btn) btn.classList.remove('hidden');
  });

  const installBtn = document.getElementById('installBtn');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') installBtn.classList.add('hidden');
      deferredPrompt = null;
    });
  }

  function handleSWWaiting(reg) {
    const banner = document.getElementById('updateBanner');
    const btn = document.getElementById('updateReloadBtn');
    if (banner) banner.classList.remove('hidden');
    if (btn) btn.onclick = () => { reg.waiting.postMessage('SKIP_WAITING'); };
  }
  const menuContainer = document.getElementById("menuContainer");
  const submitFoodBtn = document.getElementById("submitFood");
  const submitOrderBtn = document.getElementById("submitOrder");
  const orderList = document.getElementById("orderList");
  const orderNumberEl = document.getElementById("orderNumber");

  let menuData = { ramens: [], toppings: [], salads: [], others: [] };
  let currentOrder = [];
  let selectedRamen = null;

  let selectedExtras = {
    toppings: {},
    salads: {},
    others: {},
  };

  // -------------------------
  // Order number & date (5 AM business-day rollover)
  // -------------------------
  const { businessDate, orderNumber: initialOrderNumber } =
    Services.applyBusinessDayReset();

  let orderNumber = initialOrderNumber;
  orderNumberEl.textContent = orderNumber;

  // -------------------------
  // Helpers
  // -------------------------
  const formatCurrency = (n) => `${n} تومان`;

  const getPrice = (arr, name) =>
    arr.find((i) => i.name === name)?.price || 0;

  // -------------------------
  // Load menu
  // -------------------------
  const res = await fetch("menuData.json");
  const data = await res.json();

  menuData.ramens = data.ramens || [];
  menuData.toppings = data.toppings || [];
  menuData.salads = data.salads || [];
  menuData.others = data.others || [];

  renderMenu();
  // central init to ensure idempotent setup
  function initApp() {
    try {
      renderMenu();
      updateOrderList();
      submitFoodBtn.onclick = handleAddItem;
      submitOrderBtn.onclick = handleSubmitOrder;
      // delegate delete button clicks to the list container so handlers survive DOM restores
      orderList.removeEventListener('click', orderList._delegatedClickHandler || (()=>{}));
      orderList._delegatedClickHandler = function (e) {
        const btn = e.target.closest('.delete-btn');
        if (!btn) return;
        const li = btn.closest('li');
        if (!li) return;
        const nodes = Array.from(orderList.querySelectorAll('li'));
        const idx = nodes.indexOf(li);
        if (idx >= 0) {
          currentOrder.splice(idx, 1);
          updateOrderList();
        }
      };
      orderList.addEventListener('click', orderList._delegatedClickHandler);
    } catch (err) {
      console.error('order.js initApp error', err);
    }
  }

  initApp();
  // -------------------------
  // Render menu
  // -------------------------
  function renderMenu() {
    menuContainer.innerHTML = "";
    selectedRamen = null;

    const section = document.createElement("div");
    section.className = "flex flex-col gap-6";

    // ===== RAMENS =====
    const ramenSection = document.createElement("div");
    ramenSection.innerHTML = `<h2 class="text-xl font-bold mb-2">رامن‌ها</h2>`;

    const ramenList = document.createElement("div");
    ramenList.className = "flex flex-wrap gap-4";

    menuData.ramens.forEach((ramen) => {
      const label = document.createElement("label");
      label.className = "item-card cursor-pointer min-w-[180px] min-h-[100px]";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = "ramen";

      checkbox.addEventListener("change", () => {
        document
          .querySelectorAll('input[name="ramen"]')
          .forEach((cb) => (cb.checked = cb === checkbox));

        selectedRamen = checkbox.checked ? ramen : null;
      });
      // reflect current selection
      if (selectedRamen && selectedRamen.name === ramen.name) checkbox.checked = true;

      const info = document.createElement("div");
      info.className = "item-info flex-1";
      info.innerHTML = `
        <div class="item-name">${ramen.name}</div>
        <div class="item-price">${formatCurrency(ramen.price)}</div>
      `;

      // mark as ramen card for DOM-based reads
      label.dataset.key = 'ramen';
      label.dataset.name = ramen.name;

      label.append(checkbox, info);
      ramenList.appendChild(label);
    });

    ramenSection.appendChild(ramenList);
    section.appendChild(ramenSection);

    // ===== EXTRAS =====
    const renderExtras = (title, items, key) => {
      const wrap = document.createElement("div");
      wrap.innerHTML = `<h2 class="text-xl font-bold mb-2">${title}</h2>`;

      const list = document.createElement("div");
      list.className = "flex flex-wrap gap-4";

      items.forEach((item) => {
        const card = document.createElement("div");
        card.className = "item-card min-w-[180px]";
        card.dataset.key = key;
        card.dataset.name = item.name;

        const controls = document.createElement("div");
        controls.className = "item-controls";

        const plus = document.createElement("button");
        plus.textContent = "+";

        const qty = document.createElement("span");
        qty.className = "qty";
        qty.textContent = "0";

        const minus = document.createElement("button");
        minus.textContent = "−";

        const info = document.createElement("div");
        info.className = "item-info flex-1";
        info.innerHTML = `
          <div class="item-name">${item.name}</div>
          <div class="item-price">+ ${formatCurrency(item.price)}</div>
        `;

        const update = (d) => {
          const cur = selectedExtras[key][item.name] || 0;
          const next = Math.max(0, cur + d);
          if (next === 0) delete selectedExtras[key][item.name];
          else selectedExtras[key][item.name] = next;
          qty.textContent = next;
        };

        minus.onclick = () => update(-1);
        plus.onclick = () => update(1);

        // show existing qty if any
        qty.textContent = selectedExtras[key][item.name] || 0;

        // put controls in front of info (visually 'in front' of name)
        controls.append(plus, qty, minus);
        card.append(controls, info);
        list.appendChild(card);
      });

      wrap.appendChild(list);
      section.appendChild(wrap);
    };

    renderExtras("تاپینگ‌ها", menuData.toppings, "toppings");
    renderExtras("سالادها", menuData.salads, "salads");
    renderExtras("موارد دیگر", menuData.others, "others");

    menuContainer.appendChild(section);
  }

  // -------------------------
  // Handlers
  // -------------------------
  function handleAddItem() {
    // Read selected ramen from DOM to avoid stale in-memory state
    const checked = document.querySelector('input[name="ramen"]:checked');
    if (!checked) return alert("لطفا یک رامن انتخاب کنید.");
    const ramenCard = checked.closest('.item-card') || checked.parentElement;
    const ramenName = ramenCard.dataset.name || ramenCard.querySelector('.item-name')?.textContent?.trim();
    const ramenObj = menuData.ramens.find((r) => r.name === ramenName) || null;

    let extras = [];
    let extrasTotal = 0;

    // Gather extras by reading DOM qtys so we don't rely on possibly stale JS state
    document.querySelectorAll('.item-card[data-key]').forEach((card) => {
      const key = card.dataset.key;
      if (key === 'ramen') return;
      const name = card.dataset.name || card.querySelector('.item-name')?.textContent?.trim();
      const qtyEl = card.querySelector('.qty');
      const qty = qtyEl ? parseInt(qtyEl.textContent, 10) || 0 : 0;
      if (qty > 0) {
        const price = getPrice(menuData[key], name);
        extras.push({ name, qty, price });
        extrasTotal += qty * price;
      }
    });

    const ramenPrice = ramenObj ? ramenObj.price : 0;
    const itemTotal = ramenPrice + extrasTotal;

    currentOrder.push({
      ramen: ramenName,
      ramenPrice,
      extras,
      itemTotal,
    });

    // reset selectedExtras store and re-render UI
    selectedExtras = { toppings: {}, salads: {}, others: {} };
    renderMenu();
    updateOrderList();
  }

  function handleSubmitOrder() {
    if (!currentOrder.length) return alert("سفارشی ثبت نشده است.");

    const orders = JSON.parse(localStorage.getItem("orders")) || [];

    orders.push({
      orderNumber,
      items: currentOrder,
      total: currentOrder.reduce((s, i) => s + i.itemTotal, 0),
      date: new Date().toLocaleString("fa-IR"),
      dateIso: Services.getBusinessDate(),
    });

    localStorage.setItem("orders", JSON.stringify(orders));

    orderNumber++;
    localStorage.setItem("orderNumber", orderNumber);
    localStorage.setItem("orderDate", businessDate);
    orderNumberEl.textContent = orderNumber;

    currentOrder = [];
    updateOrderList();
    alert("سفارش با موفقیت ثبت شد ✅");
  }

  // attach handlers initially
  submitFoodBtn.onclick = handleAddItem;
  submitOrderBtn.onclick = handleSubmitOrder;

  // -------------------------
  // Order list
  // -------------------------
  function updateOrderList() {
    orderList.innerHTML = "";
    let total = 0;

    currentOrder.forEach((item, itemIndex) => {
      total += item.itemTotal;

      const extrasText = item.extras
        .map((e) => `${e.name} ×${e.qty}`)
        .join("- ");

      const foodNumber = itemIndex + 1;
      const foodLabel = `غذای ${foodNumber}`;
      
      const allItems = item.ramen 
        ? (extrasText ? `${extrasText} - ${item.ramen}` : item.ramen)
        : extrasText;

      const li = document.createElement("li");
      li.className = "flex justify-between items-start bg-gray-50 p-3 rounded";

      li.innerHTML = `
        <div>
          <strong>${foodLabel}</strong>
          ${allItems ? `<div class="text-xs text-gray-600">(${allItems})</div>` : ""}
        </div>
        <div class="flex gap-3 items-center">
          <span>${formatCurrency(item.itemTotal)}</span>
          <button class="delete-btn text-red-600">🗑️</button>
        </div>
      `;

      li.querySelector(".delete-btn").onclick = () => {
        currentOrder.splice(itemIndex, 1);
        updateOrderList();
      };

      orderList.appendChild(li);
    });

    if (currentOrder.length) {
      const totalLi = document.createElement("li");
      totalLi.className = "mt-3 border-t pt-2 font-bold";
      totalLi.textContent = `جمع کل فاکتور: ${formatCurrency(total)}`;
      orderList.appendChild(totalLi);
    }
  }

  // (submit handler is defined via `handleSubmitOrder` above)

  // Fix for browsers' back/forward cache: when page is restored from bfcache
  // event handlers and in-memory state can be stale. Reload to ensure fresh init.
  window.addEventListener("pageshow", (e) => {
    // Reload when page is restored from bfcache or when navigation type is back/forward.
    let navType = null;
    try {
      const navEntry = performance.getEntriesByType && performance.getEntriesByType('navigation') && performance.getEntriesByType('navigation')[0];
      navType = navEntry ? navEntry.type : null;
    } catch (err) {
      navType = null;
    }

    const isBackForward = e.persisted || navType === 'back_forward' || (performance.navigation && performance.navigation.type === 2);
    if (isBackForward) {
      window.location.reload();
      return;
    }

    // otherwise ensure UI reflects current in-memory data and rebind handlers
    initApp();
  });

  // Also rebind handlers when tab becomes visible (covers some navigation cases)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") initApp();
  });
});
