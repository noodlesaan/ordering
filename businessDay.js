(function () {
  const BUSINESS_DAY_START_HOUR = 5;

  function formatLocalDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function getBusinessDate(now = new Date()) {
    const d = new Date(now);
    if (d.getHours() < BUSINESS_DAY_START_HOUR) {
      d.setDate(d.getDate() - 1);
    }
    return formatLocalDate(d);
  }

  function applyBusinessDayReset() {
    const businessDate = getBusinessDate();
    const savedDate = localStorage.getItem("orderDate");

    if (savedDate !== businessDate) {
      localStorage.setItem("orderNumber", "101");
      localStorage.setItem("orderDate", businessDate);
      localStorage.setItem("orders", "[]");
      return {
        businessDate,
        orderNumber: 101,
        ordersCleared: true,
      };
    }

    const orders = JSON.parse(localStorage.getItem("orders") || "[]");
    const todaysOrders = orders.filter((order) => order.dateIso === businessDate);

    if (todaysOrders.length !== orders.length) {
      localStorage.setItem("orders", JSON.stringify(todaysOrders));
      return {
        businessDate,
        orderNumber: parseInt(localStorage.getItem("orderNumber") || "101", 10),
        ordersCleared: true,
      };
    }

    return {
      businessDate,
      orderNumber: parseInt(localStorage.getItem("orderNumber") || "101", 10),
      ordersCleared: false,
    };
  }

  window.BusinessDay = {
    getBusinessDate,
    applyBusinessDayReset,
  };
})();
