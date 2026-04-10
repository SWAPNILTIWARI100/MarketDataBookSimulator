let bidLedger = new Map();
let askLedger = new Map();
let allOrders = new Map();
let bidPriceLevels = [];
let askPriceLevels = [];

let modalDepthChart = null;
let modalProgressionChart = null;

let ltp = 0;
let ltq = 0;
let totalVolume = 0;

let pendingTrades = [];
let nextOrderId = 1;
let playbackInterval = null;
let playbackCommands = [];
let currentCommandIndex = 0;
let isPlaying = false;
let eventCount = 0;
let timelineEvents = [];

// Chart data
let progressionData = [];
let depthChart = null;
let progressionChart = null;

let md = {
    bestBidPrice: 0,
    bestBidQuantity: 0,
    bestAskPrice: 0,
    bestAskQuantity: 0
};

function rebuildPriceLevels() {
    bidPriceLevels = Array.from(bidLedger.keys()).sort((a, b) => b - a);
    askPriceLevels = Array.from(askLedger.keys()).sort((a, b) => a - b);
}

function getBestBid() {
    return bidPriceLevels.length > 0 ? bidPriceLevels[0] : null;
}

function getBestAsk() {
    return askPriceLevels.length > 0 ? askPriceLevels[0] : null;
}

function addToTimeline(type, details, afterBestBid = null, afterBestAsk = null, afterBestBidQty = null, afterBestAskQty = null) {
    const timestamp = new Date();
    const timeStr = timestamp.toLocaleTimeString();
    
    let bestBid = afterBestBid !== null ? afterBestBid : (getBestBid() || 0);
    let bestAsk = afterBestAsk !== null ? afterBestAsk : (getBestAsk() || 0);
    let bestBidQty = afterBestBidQty !== null ? afterBestBidQty : (bestBid ? (bidLedger.get(bestBid) || 0) : 0);
    let bestAskQty = afterBestAskQty !== null ? afterBestAskQty : (bestAsk ? (askLedger.get(bestAsk) || 0) : 0);
    
    if (isNaN(bestBid)) bestBid = 0;
    if (isNaN(bestAsk)) bestAsk = 0;
    if (isNaN(bestBidQty)) bestBidQty = 0;
    if (isNaN(bestAskQty)) bestAskQty = 0;
    
    timelineEvents.unshift({
        index: ++eventCount,
        time: timeStr,
        type: type,
        details: details,
        bestBid: bestBid,
        bestBidQty: bestBidQty,
        bestAsk: bestAsk,
        bestAskQty: bestAskQty
    });
    
    // NO LIMIT - keep all events
    // if (timelineEvents.length > 200) timelineEvents.pop();  // REMOVE THIS LINE
    
    progressionData.push({
        index: eventCount,
        bestBid: bestBid,
        bestAsk: bestAsk,
        bestBidQty: bestBidQty,
        bestAskQty: bestAskQty
    });
    
    // NO LIMIT - keep all progression data
    // if (progressionData.length > 200) progressionData.shift();  // REMOVE THIS LINE
    
    updateTimelineDisplay();
    updateProgressionChart();
}

function updateTimelineDisplay() {
    const container = document.getElementById('timelineContainer');
    const countSpan = document.getElementById('eventCount');
    
    countSpan.textContent = `${timelineEvents.length} events`;
    
    if (timelineEvents.length === 0) {
        container.innerHTML = '<div class="timeline-empty">No events yet</div>';
        return;
    }
    
    // Show all events (no limit)
    container.innerHTML = timelineEvents.map(e => `
        <div class="timeline-item">
            <span class="timeline-index">#${e.index}</span>
            <span class="timeline-time">${e.time}</span>
            <span class="timeline-type ${e.type}">${e.type}</span>
            <span class="timeline-details">${e.details}</span>
            <span class="timeline-bid">B: ${e.bestBid.toFixed(2)} (${e.bestBidQty})</span>
            <span class="timeline-ask">A: ${e.bestAsk.toFixed(2)} (${e.bestAskQty})</span>
        </div>
    `).join('');
}
function updateDepthChart() {
    const allPrices = new Set([...bidLedger.keys(), ...askLedger.keys()]);
    const sortedPrices = Array.from(allPrices).sort((a, b) => a - b);
    
    const bidData = sortedPrices.map(p => bidLedger.get(p) || 0);
    const askData = sortedPrices.map(p => askLedger.get(p) || 0);
    
    const ctx = document.getElementById('depthChart').getContext('2d');
    
    if (depthChart) depthChart.destroy();
    
    depthChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedPrices.map(p => p.toFixed(2)),
            datasets: [
                {
                    label: 'Bid',
                    data: bidData,
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: '#10b981',
                    borderWidth: 1
                },
                {
                    label: 'Ask',
                    data: askData,
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: '#ef4444',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'top', labels: { color: '#94a3b8', font: { size: 10 } } },
                tooltip: { 
                    mode: 'index', 
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw}`;
                        }
                    }
                }
            },
            scales: {
                x: { 
                    ticks: { color: '#94a3b8', font: { size: 9 }, maxRotation: 45, minRotation: 45 }, 
                    grid: { color: '#1e2430' },
                    title: { display: true, text: 'Price', color: '#94a3b8', font: { size: 10 } }
                },
                y: { 
                    ticks: { color: '#94a3b8', font: { size: 9 } }, 
                    grid: { color: '#1e2430' }, 
                    title: { display: true, text: 'Quantity', color: '#94a3b8', font: { size: 10 } },
                    beginAtZero: true
                }
            }
        }
    });
    
    // Update modal chart as well
    updateModalDepthChart();
}
function updateModalDepthChart() {
    const allPrices = new Set([...bidLedger.keys(), ...askLedger.keys()]);
    const sortedPrices = Array.from(allPrices).sort((a, b) => a - b);
    
    const bidData = sortedPrices.map(p => bidLedger.get(p) || 0);
    const askData = sortedPrices.map(p => askLedger.get(p) || 0);
    
    const ctx = document.getElementById('modalDepthChart').getContext('2d');
    
    if (modalDepthChart) modalDepthChart.destroy();
    
    modalDepthChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedPrices.map(p => p.toFixed(2)),
            datasets: [
                {
                    label: 'Bid',
                    data: bidData,
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: '#10b981',
                    borderWidth: 1
                },
                {
                    label: 'Ask',
                    data: askData,
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: '#ef4444',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'top', labels: { color: '#94a3b8', font: { size: 12 } } },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: '#1e2430' } },
                y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: '#1e2430' }, title: { display: true, text: 'Quantity', color: '#94a3b8' } }
            }
        }
    });
}
function updateProgressionChart() {
    const ctx = document.getElementById('progressionChart').getContext('2d');
    
    if (progressionChart) progressionChart.destroy();
    
    if (progressionData.length === 0) {
        // Show empty chart
        progressionChart = new Chart(ctx, {
            type: 'line',
            data: { datasets: [] },
            options: { responsive: true, maintainAspectRatio: true }
        });
        updateModalProgressionChart();
        return;
    }
    
    progressionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: progressionData.map(d => d.index),
            datasets: [
                {
                    label: 'Best Bid',
                    data: progressionData.map(d => d.bestBid),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 6
                },
                {
                    label: 'Best Ask',
                    data: progressionData.map(d => d.bestAsk),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', labels: { color: '#94a3b8', font: { size: 10 } } },
                tooltip: { callbacks: { label: function(context) { return `${context.dataset.label}: ${context.raw.toFixed(2)}`; } } }
            },
            scales: {
                x: { title: { display: true, text: 'Event #', color: '#94a3b8' }, ticks: { color: '#94a3b8' }, grid: { color: '#1e2430' } },
                y: { title: { display: true, text: 'Price', color: '#94a3b8' }, ticks: { color: '#94a3b8' }, grid: { color: '#1e2430' } }
            }
        }
    });
    
    updateModalProgressionChart();
}

function updateModalProgressionChart() {
    const ctx = document.getElementById('modalProgressionChart').getContext('2d');
    
    if (modalProgressionChart) modalProgressionChart.destroy();
    
    if (progressionData.length === 0) {
        modalProgressionChart = new Chart(ctx, {
            type: 'line',
            data: { datasets: [] },
            options: { responsive: true, maintainAspectRatio: true }
        });
        return;
    }
    
    modalProgressionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: progressionData.map(d => d.index),
            datasets: [
                {
                    label: 'Best Bid',
                    data: progressionData.map(d => d.bestBid),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 8
                },
                {
                    label: 'Best Ask',
                    data: progressionData.map(d => d.bestAsk),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', labels: { color: '#94a3b8', font: { size: 12 } } },
                tooltip: { callbacks: { label: function(context) { return `${context.dataset.label}: ${context.raw.toFixed(2)}`; } } }
            },
            scales: {
                x: { title: { display: true, text: 'Event #', color: '#94a3b8' }, ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: '#1e2430' } },
                y: { title: { display: true, text: 'Price', color: '#94a3b8' }, ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: '#1e2430' } }
            }
        }
    });
}

function drainAskAtPrice(price, qty) {
    if (!askLedger.has(price)) return;
    const currentQty = askLedger.get(price);
    const newQty = currentQty - qty;
    if (newQty <= 0) {
        askLedger.delete(price);
        askPriceLevels = askPriceLevels.filter(p => p !== price);
        if (price === getBestAsk()) recalculateBestAsk();
    } else {
        askLedger.set(price, newQty);
        if (price === getBestAsk()) md.bestAskQuantity = newQty;
    }
}

function drainBidAtPrice(price, qty) {
    if (!bidLedger.has(price)) return;
    const currentQty = bidLedger.get(price);
    const newQty = currentQty - qty;
    if (newQty <= 0) {
        bidLedger.delete(price);
        bidPriceLevels = bidPriceLevels.filter(p => p !== price);
        if (price === getBestBid()) recalculateBestBid();
    } else {
        bidLedger.set(price, newQty);
        if (price === getBestBid()) md.bestBidQuantity = newQty;
    }
}

function applyLtp(price, qty) {
    ltp = price;
    ltq = qty;
    totalVolume += qty;
}

function recalculateBestBid() {
    if (bidPriceLevels.length === 0) {
        md.bestBidPrice = 0;
        md.bestBidQuantity = 0;
    } else {
        md.bestBidPrice = bidPriceLevels[0];
        md.bestBidQuantity = bidLedger.get(md.bestBidPrice) || 0;
    }
}

function recalculateBestAsk() {
    if (askPriceLevels.length === 0) {
        md.bestAskPrice = 0;
        md.bestAskQuantity = 0;
    } else {
        md.bestAskPrice = askPriceLevels[0];
        md.bestAskQuantity = askLedger.get(md.bestAskPrice) || 0;
    }
}

function insertBuy(orderId, price, qty) {
    const orderIdStr = orderId.toString();
    if (allOrders.has(orderIdStr)) {
        addToTimeline('ERROR', `Order ${orderIdStr} already exists`, getBestBid() || 0, getBestAsk() || 0);
        return false;
    }
    
    let remainingQty = qty;
    let autoTradeExecuted = false;
    let totalAutoTradeQty = 0;
    
    while (remainingQty > 0 && getBestAsk() !== null && price >= getBestAsk()) {
        const tradePrice = getBestAsk();
        const bestAskQty = askLedger.get(tradePrice) || 0;
        const tradeQty = Math.min(remainingQty, bestAskQty);
        drainAskAtPrice(tradePrice, tradeQty);
        applyLtp(tradePrice, tradeQty);
        pendingTrades.push({ buyOrderId: orderIdStr, sellOrderId: '-1', price: tradePrice, qty: tradeQty });
        remainingQty -= tradeQty;
        autoTradeExecuted = true;
        totalAutoTradeQty += tradeQty;
    }
    
    if (remainingQty > 0) {
        const currentQty = bidLedger.get(price) || 0;
        bidLedger.set(price, currentQty + remainingQty);
        rebuildPriceLevels();
        if (orderIdStr !== '0') allOrders.set(orderIdStr, { price: price, qty: remainingQty, side: 'B' });
        if (price >= getBestBid() || getBestBid() === null) {
            md.bestBidPrice = price;
            md.bestBidQuantity = bidLedger.get(price);
        }
    }
    
    renderUI();
    
    // Capture state AFTER operation
    const afterBestBid = getBestBid() || 0;
    const afterBestAsk = getBestAsk() || 0;
    const afterBestBidQty = afterBestBid ? (bidLedger.get(afterBestBid) || 0) : 0;
    const afterBestAskQty = afterBestAsk ? (askLedger.get(afterBestAsk) || 0) : 0;
    
    if (autoTradeExecuted && remainingQty === 0) {
        addToTimeline('NEW', `B | ${orderIdStr} | ${price} | ${qty} (Fully matched: ${totalAutoTradeQty} executed)`, afterBestBid, afterBestAsk, afterBestBidQty, afterBestAskQty);
    } else if (autoTradeExecuted && remainingQty > 0) {
        addToTimeline('NEW', `B | ${orderIdStr} | ${price} | ${qty} (Partially filled: ${totalAutoTradeQty} executed, ${remainingQty} remaining)`, afterBestBid, afterBestAsk, afterBestBidQty, afterBestAskQty);
    } else {
        addToTimeline('NEW', `B | ${orderIdStr} | ${price} | ${qty}`, afterBestBid, afterBestAsk, afterBestBidQty, afterBestAskQty);
    }
    return true;
}

function insertSell(orderId, price, qty) {
    const orderIdStr = orderId.toString();
    if (allOrders.has(orderIdStr)) {
        addToTimeline('ERROR', `Order ${orderIdStr} already exists`, getBestBid() || 0, getBestAsk() || 0);
        return false;
    }
    
    let remainingQty = qty;
    let autoTradeExecuted = false;
    let totalAutoTradeQty = 0;
    
    while (remainingQty > 0 && getBestBid() !== null && price <= getBestBid()) {
        const tradePrice = getBestBid();
        const bestBidQty = bidLedger.get(tradePrice) || 0;
        const tradeQty = Math.min(remainingQty, bestBidQty);
        drainBidAtPrice(tradePrice, tradeQty);
        applyLtp(tradePrice, tradeQty);
        pendingTrades.push({ buyOrderId: '-1', sellOrderId: orderIdStr, price: tradePrice, qty: tradeQty });
        remainingQty -= tradeQty;
        autoTradeExecuted = true;
        totalAutoTradeQty += tradeQty;
    }
    
    if (remainingQty > 0) {
        const currentQty = askLedger.get(price) || 0;
        askLedger.set(price, currentQty + remainingQty);
        rebuildPriceLevels();
        if (orderIdStr !== '0') allOrders.set(orderIdStr, { price: price, qty: remainingQty, side: 'S' });
        if (price <= getBestAsk() || getBestAsk() === null) {
            md.bestAskPrice = price;
            md.bestAskQuantity = askLedger.get(price);
        }
    }
    
    renderUI();
    
    // Capture state AFTER operation
    const afterBestBid = getBestBid() || 0;
    const afterBestAsk = getBestAsk() || 0;
    const afterBestBidQty = afterBestBid ? (bidLedger.get(afterBestBid) || 0) : 0;
    const afterBestAskQty = afterBestAsk ? (askLedger.get(afterBestAsk) || 0) : 0;
    
    if (autoTradeExecuted && remainingQty === 0) {
        addToTimeline('NEW', `S | ${orderIdStr} | ${price} | ${qty} (Fully matched: ${totalAutoTradeQty} executed)`, afterBestBid, afterBestAsk, afterBestBidQty, afterBestAskQty);
    } else if (autoTradeExecuted && remainingQty > 0) {
        addToTimeline('NEW', `S | ${orderIdStr} | ${price} | ${qty} (Partially filled: ${totalAutoTradeQty} executed, ${remainingQty} remaining)`, afterBestBid, afterBestAsk, afterBestBidQty, afterBestAskQty);
    } else {
        addToTimeline('NEW', `S | ${orderIdStr} | ${price} | ${qty}`, afterBestBid, afterBestAsk, afterBestBidQty, afterBestAskQty);
    }
    return true;
}


function modifyBuy(orderId, newPrice, newQty) {
    const orderIdStr = orderId.toString();
    if (!allOrders.has(orderIdStr)) {
        addToTimeline('ERROR', `Order ${orderIdStr} not found`, getBestBid() || 0, getBestAsk() || 0);
        return false;
    }
    const order = allOrders.get(orderIdStr);
    if (order.side !== 'B') return false;
    
    const oldPrice = order.price;
    const oldQty = order.qty;
    
    if (oldPrice === newPrice) {
        const ledgerIt = bidLedger.get(oldPrice);
        if (ledgerIt !== undefined) {
            const newLedgerQty = ledgerIt + (newQty - oldQty);
            if (newLedgerQty <= 0) {
                bidLedger.delete(oldPrice);
                rebuildPriceLevels();
                if (oldPrice === getBestBid()) recalculateBestBid();
            } else {
                bidLedger.set(oldPrice, newLedgerQty);
                if (oldPrice === getBestBid()) md.bestBidQuantity = newLedgerQty;
            }
        }
        allOrders.set(orderIdStr, { price: newPrice, qty: newQty, side: 'B' });
    } else {
        if (bidLedger.has(oldPrice)) {
            const currentQty = bidLedger.get(oldPrice);
            const newLedgerQty = currentQty - oldQty;
            if (newLedgerQty <= 0) {
                bidLedger.delete(oldPrice);
                rebuildPriceLevels();
                if (oldPrice === getBestBid()) recalculateBestBid();
            } else {
                bidLedger.set(oldPrice, newLedgerQty);
                if (oldPrice === getBestBid()) md.bestBidQuantity = newLedgerQty;
            }
        }
        allOrders.delete(orderIdStr);
        
        let remainingQty = newQty;
        while (remainingQty > 0 && getBestAsk() !== null && newPrice >= getBestAsk()) {
            const tradePrice = getBestAsk();
            const bestAskQty = askLedger.get(tradePrice) || 0;
            const tradeQty = Math.min(remainingQty, bestAskQty);
            drainAskAtPrice(tradePrice, tradeQty);
            applyLtp(tradePrice, tradeQty);
            pendingTrades.push({ buyOrderId: orderIdStr, sellOrderId: '-1', price: tradePrice, qty: tradeQty });
            remainingQty -= tradeQty;
        }
        
        if (remainingQty > 0) {
            const currentQty = bidLedger.get(newPrice) || 0;
            bidLedger.set(newPrice, currentQty + remainingQty);
            rebuildPriceLevels();
            allOrders.set(orderIdStr, { price: newPrice, qty: remainingQty, side: 'B' });
            if (newPrice >= getBestBid() || getBestBid() === null) {
                md.bestBidPrice = newPrice;
                md.bestBidQuantity = bidLedger.get(newPrice);
            }
        }
    }
    
    renderUI();
    
    // Capture state AFTER operation
    const afterBestBid = getBestBid() || 0;
    const afterBestAsk = getBestAsk() || 0;
    const afterBestBidQty = afterBestBid ? (bidLedger.get(afterBestBid) || 0) : 0;
    const afterBestAskQty = afterBestAsk ? (askLedger.get(afterBestAsk) || 0) : 0;
    
    addToTimeline('MODIFY', `B | ${orderIdStr} | ${newPrice} | ${newQty}`, afterBestBid, afterBestAsk, afterBestBidQty, afterBestAskQty);
    return true;
}

function modifySell(orderId, newPrice, newQty) {
    const orderIdStr = orderId.toString();
    if (!allOrders.has(orderIdStr)) {
        addToTimeline('ERROR', `Order ${orderIdStr} not found`, getBestBid() || 0, getBestAsk() || 0);
        return false;
    }
    const order = allOrders.get(orderIdStr);
    if (order.side !== 'S') return false;
    
    const oldPrice = order.price;
    const oldQty = order.qty;
    
    if (oldPrice === newPrice) {
        const ledgerIt = askLedger.get(oldPrice);
        if (ledgerIt !== undefined) {
            const newLedgerQty = ledgerIt + (newQty - oldQty);
            if (newLedgerQty <= 0) {
                askLedger.delete(oldPrice);
                rebuildPriceLevels();
                if (oldPrice === getBestAsk()) recalculateBestAsk();
            } else {
                askLedger.set(oldPrice, newLedgerQty);
                if (oldPrice === getBestAsk()) md.bestAskQuantity = newLedgerQty;
            }
        }
        allOrders.set(orderIdStr, { price: newPrice, qty: newQty, side: 'S' });
    } else {
        if (askLedger.has(oldPrice)) {
            const currentQty = askLedger.get(oldPrice);
            const newLedgerQty = currentQty - oldQty;
            if (newLedgerQty <= 0) {
                askLedger.delete(oldPrice);
                rebuildPriceLevels();
                if (oldPrice === getBestAsk()) recalculateBestAsk();
            } else {
                askLedger.set(oldPrice, newLedgerQty);
                if (oldPrice === getBestAsk()) md.bestAskQuantity = newLedgerQty;
            }
        }
        allOrders.delete(orderIdStr);
        
        let remainingQty = newQty;
        while (remainingQty > 0 && getBestBid() !== null && newPrice <= getBestBid()) {
            const tradePrice = getBestBid();
            const bestBidQty = bidLedger.get(tradePrice) || 0;
            const tradeQty = Math.min(remainingQty, bestBidQty);
            drainBidAtPrice(tradePrice, tradeQty);
            applyLtp(tradePrice, tradeQty);
            pendingTrades.push({ buyOrderId: '-1', sellOrderId: orderIdStr, price: tradePrice, qty: tradeQty });
            remainingQty -= tradeQty;
        }
        
        if (remainingQty > 0) {
            const currentQty = askLedger.get(newPrice) || 0;
            askLedger.set(newPrice, currentQty + remainingQty);
            rebuildPriceLevels();
            allOrders.set(orderIdStr, { price: newPrice, qty: remainingQty, side: 'S' });
            if (newPrice <= getBestAsk() || getBestAsk() === null) {
                md.bestAskPrice = newPrice;
                md.bestAskQuantity = askLedger.get(newPrice);
            }
        }
    }
    
    renderUI();
    
    // Capture state AFTER operation
    const afterBestBid = getBestBid() || 0;
    const afterBestAsk = getBestAsk() || 0;
    const afterBestBidQty = afterBestBid ? (bidLedger.get(afterBestBid) || 0) : 0;
    const afterBestAskQty = afterBestAsk ? (askLedger.get(afterBestAsk) || 0) : 0;
    
    addToTimeline('MODIFY', `S | ${orderIdStr} | ${newPrice} | ${newQty}`, afterBestBid, afterBestAsk, afterBestBidQty, afterBestAskQty);
    return true;
}

function deleteBuy(orderId) {
    const orderIdStr = orderId.toString();
    if (!allOrders.has(orderIdStr)) return false;
    const order = allOrders.get(orderIdStr);
    if (order.side !== 'B') return false;
    
    const price = order.price;
    const qty = order.qty;
    
    if (bidLedger.has(price)) {
        const currentQty = bidLedger.get(price);
        const newQty = currentQty - qty;
        if (newQty <= 0) {
            bidLedger.delete(price);
            rebuildPriceLevels();
            if (price === getBestBid()) recalculateBestBid();
        } else {
            bidLedger.set(price, newQty);
            if (price === getBestBid()) md.bestBidQuantity = newQty;
        }
    }
    
    allOrders.delete(orderIdStr);
    renderUI();
    
    // Capture state AFTER operation
    const afterBestBid = getBestBid() || 0;
    const afterBestAsk = getBestAsk() || 0;
    const afterBestBidQty = afterBestBid ? (bidLedger.get(afterBestBid) || 0) : 0;
    const afterBestAskQty = afterBestAsk ? (askLedger.get(afterBestAsk) || 0) : 0;
    
    addToTimeline('DELETE', `B | ${orderIdStr}`, afterBestBid, afterBestAsk, afterBestBidQty, afterBestAskQty);
    return true;
}

function deleteSell(orderId) {
    const orderIdStr = orderId.toString();
    if (!allOrders.has(orderIdStr)) return false;
    const order = allOrders.get(orderIdStr);
    if (order.side !== 'S') return false;
    
    const price = order.price;
    const qty = order.qty;
    
    if (askLedger.has(price)) {
        const currentQty = askLedger.get(price);
        const newQty = currentQty - qty;
        if (newQty <= 0) {
            askLedger.delete(price);
            rebuildPriceLevels();
            if (price === getBestAsk()) recalculateBestAsk();
        } else {
            askLedger.set(price, newQty);
            if (price === getBestAsk()) md.bestAskQuantity = newQty;
        }
    }
    
    allOrders.delete(orderIdStr);
    renderUI();
    
    // Capture state AFTER operation
    const afterBestBid = getBestBid() || 0;
    const afterBestAsk = getBestAsk() || 0;
    const afterBestBidQty = afterBestBid ? (bidLedger.get(afterBestBid) || 0) : 0;
    const afterBestAskQty = afterBestAsk ? (askLedger.get(afterBestAsk) || 0) : 0;
    
    addToTimeline('DELETE', `S | ${orderIdStr}`, afterBestBid, afterBestAsk, afterBestBidQty, afterBestAskQty);
    return true;
}

function processTrade(buyOrderId, sellOrderId, tradePrice, tradeQty) {
    const buyIdStr = buyOrderId.toString();
    const sellIdStr = sellOrderId.toString();
    
    // Check if this trade matches a pending auto-trade
    if (pendingTrades.length > 0) {
        const p = pendingTrades[0];
        
        const priceMatch = (p.price === tradePrice);
        const qtyMatch = (tradeQty <= p.qty);
        
        if (priceMatch && qtyMatch) {
            const buyMatch = (p.buyOrderId === '-1' || p.buyOrderId === buyIdStr);
            const sellMatch = (p.sellOrderId === '-1' || p.sellOrderId === sellIdStr);
            
            if (buyMatch && sellMatch) {
                // Valid match - update resting order
                if (p.sellOrderId === '-1' && sellIdStr !== '0') {
                    if (allOrders.has(sellIdStr)) {
                        const order = allOrders.get(sellIdStr);
                        const remaining = order.qty - tradeQty;
                        if (remaining <= 0) {
                            allOrders.delete(sellIdStr);
                        } else {
                            allOrders.set(sellIdStr, { ...order, qty: remaining });
                        }
                    }
                }
                
                if (p.buyOrderId === '-1' && buyIdStr !== '0') {
                    if (allOrders.has(buyIdStr)) {
                        const order = allOrders.get(buyIdStr);
                        const remaining = order.qty - tradeQty;
                        if (remaining <= 0) {
                            allOrders.delete(buyIdStr);
                        } else {
                            allOrders.set(buyIdStr, { ...order, qty: remaining });
                        }
                    }
                }
                
                // Reduce pending trade quantity
                const newPendingQty = p.qty - tradeQty;
                if (newPendingQty <= 0) {
                    pendingTrades.shift();
                } else {
                    pendingTrades[0] = { ...p, qty: newPendingQty };
                }
                
                renderUI();
                return;
            }
        }
        
        // Mismatch - clear stale pending trades
        while (pendingTrades.length > 0) {
            pendingTrades.pop();
        }
    }
    
    // MANUAL trade (no pending match) - process normally
    addToTimeline('TRADE', `${buyIdStr} | ${sellIdStr} | ${tradePrice} | ${tradeQty}`);
    
    if (buyIdStr !== '0' && allOrders.has(buyIdStr)) {
        const buyOrder = allOrders.get(buyIdStr);
        const buyPrice = buyOrder.price;
        const remaining = buyOrder.qty - tradeQty;
        
        if (bidLedger.has(buyPrice)) {
            const ledgerQty = bidLedger.get(buyPrice);
            const newLedgerQty = ledgerQty - tradeQty;
            
            if (remaining <= 0 || newLedgerQty <= 0) {
                if (newLedgerQty <= 0) {
                    bidLedger.delete(buyPrice);
                    rebuildPriceLevels();
                }
                if (buyPrice === getBestBid()) recalculateBestBid();
                allOrders.delete(buyIdStr);
            } else {
                bidLedger.set(buyPrice, newLedgerQty);
                allOrders.set(buyIdStr, { ...buyOrder, qty: remaining });
                if (buyPrice === getBestBid()) md.bestBidQuantity = newLedgerQty;
            }
        } else {
            allOrders.delete(buyIdStr);
            if (buyPrice === getBestBid()) recalculateBestBid();
        }
    }
    
    if (sellIdStr !== '0' && allOrders.has(sellIdStr)) {
        const sellOrder = allOrders.get(sellIdStr);
        const sellPrice = sellOrder.price;
        const remaining = sellOrder.qty - tradeQty;
        
        if (askLedger.has(sellPrice)) {
            const ledgerQty = askLedger.get(sellPrice);
            const newLedgerQty = ledgerQty - tradeQty;
            
            if (remaining <= 0 || newLedgerQty <= 0) {
                if (newLedgerQty <= 0) {
                    askLedger.delete(sellPrice);
                    rebuildPriceLevels();
                }
                if (sellPrice === getBestAsk()) recalculateBestAsk();
                allOrders.delete(sellIdStr);
            } else {
                askLedger.set(sellPrice, newLedgerQty);
                allOrders.set(sellIdStr, { ...sellOrder, qty: remaining });
                if (sellPrice === getBestAsk()) md.bestAskQuantity = newLedgerQty;
            }
        } else {
            allOrders.delete(sellIdStr);
            if (sellPrice === getBestAsk()) recalculateBestAsk();
        }
    }
    
    applyLtp(tradePrice, tradeQty);
    renderUI();
     const afterBestBid = getBestBid() || 0;
    const afterBestAsk = getBestAsk() || 0;
    const afterBestBidQty = afterBestBid ? (bidLedger.get(afterBestBid) || 0) : 0;
    const afterBestAskQty = afterBestAsk ? (askLedger.get(afterBestAsk) || 0) : 0;
    
    addToTimeline('TRADE', `${buyIdStr} | ${sellIdStr} | ${tradePrice} | ${tradeQty}`, afterBestBid, afterBestAsk, afterBestBidQty, afterBestAskQty);
}
function clearBook() {
    bidLedger.clear();
    askLedger.clear();
    allOrders.clear();
    bidPriceLevels = [];
    askPriceLevels = [];
    ltp = 0;
    ltq = 0;
    totalVolume = 0;
    pendingTrades = [];
    nextOrderId = 1;
    progressionData = [];
    timelineEvents = [];
    eventCount = 0;
    
    md = { bestBidPrice: 0, bestBidQuantity: 0, bestAskPrice: 0, bestAskQuantity: 0 };
    
    document.getElementById('insOrderId').value = nextOrderId;
    updateTimelineDisplay();
    updateProgressionChart();
    renderUI();
}

function parseLogLine(line) {
    const content = line.replace(/^[\d:.\s]+\[INFO\]\s*/, '');
    const patterns = [
        { regex: /N\s*\|\s*([BS])\s*\|\s*(\d+)\s*\|\s*([\d.]+)\s*\|\s*(\d+)/, type: 'NEW', handler: (m) => {
            const side = m[1];
            const orderId = m[2];
            const price = parseFloat(m[3]);
            const qty = parseInt(m[4]);
            if (side === 'B') insertBuy(orderId, price, qty);
            else insertSell(orderId, price, qty);
        }},
        { regex: /M\s*\|\s*([BS])\s*\|\s*(\d+)\s*\|\s*([\d.]+)\s*\|\s*(\d+)/, type: 'MODIFY', handler: (m) => {
            const side = m[1];
            const orderId = m[2];
            const price = parseFloat(m[3]);
            const qty = parseInt(m[4]);
            if (side === 'B') modifyBuy(orderId, price, qty);
            else modifySell(orderId, price, qty);
        }},
        { regex: /X\s*\|\s*([BS])\s*\|\s*(\d+)/, type: 'DELETE', handler: (m) => {
            const side = m[1];
            const orderId = m[2];
            if (side === 'B') deleteBuy(orderId);
            else deleteSell(orderId);
        }},
        { regex: /T\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*([\d.]+)\s*\|\s*(\d+)/, type: 'TRADE', handler: (m) => {
            const buyId = m[1];
            const sellId = m[2];
            const price = parseFloat(m[3]);
            const qty = parseInt(m[4]);
            processTrade(buyId, sellId, price, qty);
        }}
    ];
    for (const pattern of patterns) {
        const match = content.match(pattern.regex);
        if (match) return { pattern, match };
    }
    return null;
}

function processFileAndPlay(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        const lines = content.split('\n');
        playbackCommands = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            const logInfo = parseLogLine(trimmed);
            if (logInfo) playbackCommands.push(logInfo);
        }
        document.getElementById('fileNameDisplay').innerHTML = `📄 Loaded: ${file.name} (${playbackCommands.length} commands)`;
        document.getElementById('playbackBtn').disabled = false;
    };
    reader.readAsText(file);
}

function startPlayback() {
    if (playbackCommands.length === 0 || isPlaying) return;
    isPlaying = true;
    currentCommandIndex = 0;
    document.getElementById('playbackBtn').disabled = true;
    document.getElementById('stopPlaybackBtn').disabled = false;
    document.getElementById('playbackStatus').innerHTML = `▶️ Playing: 0/${playbackCommands.length}`;
    
    function executeNext() {
        if (!isPlaying || currentCommandIndex >= playbackCommands.length) {
            stopPlayback();
            return;
        }
        const cmd = playbackCommands[currentCommandIndex];
        cmd.pattern.handler(cmd.match);
        currentCommandIndex++;
        document.getElementById('playbackStatus').innerHTML = `▶️ Playing: ${currentCommandIndex}/${playbackCommands.length}`;
        playbackInterval = setTimeout(executeNext, 1);
    }
    executeNext();
}

function stopPlayback() {
    if (playbackInterval) clearTimeout(playbackInterval);
    isPlaying = false;
    document.getElementById('playbackBtn').disabled = false;
    document.getElementById('stopPlaybackBtn').disabled = true;
    document.getElementById('playbackStatus').innerHTML = currentCommandIndex >= playbackCommands.length ? 
        `✅ Completed ${playbackCommands.length} commands` : `⏹️ Stopped at ${currentCommandIndex}/${playbackCommands.length}`;
}

function renderUnifiedBook() {
    const allPrices = new Set([...bidLedger.keys(), ...askLedger.keys()]);
    const sortedPrices = Array.from(allPrices).sort((a, b) => b - a);
    const container = document.getElementById('unifiedBookContainer');
    if (sortedPrices.length === 0) {
        container.innerHTML = '<div class="depth-row" style="justify-content:center;">No price levels</div>';
        return;
    }
    container.innerHTML = sortedPrices.map(price => {
        const bidQty = bidLedger.get(price) || 0;
        const askQty = askLedger.get(price) || 0;
        const isBestBid = (price === getBestBid());
        const isBestAsk = (price === getBestAsk());
        let rowClass = '';
        if (isBestBid && isBestAsk) rowClass = 'best-both-row';
        else if (isBestBid) rowClass = 'best-bid-row';
        else if (isBestAsk) rowClass = 'best-ask-row';
        return `<div class="depth-row ${rowClass}">
                    <div class="price-cell">${price.toFixed(2)}</div>
                    <div class="bid-cell">${bidQty || '-'}</div>
                    <div class="ask-cell">${askQty || '-'}</div>
                    <div class="total-cell">${bidQty + askQty}</div>
                </div>`;
    }).join('');
}

function renderUI() {
    renderUnifiedBook();
     updateDepthChart();
    const buyOrders = [], sellOrders = [];
    for (const [id, order] of allOrders.entries()) {
        if (order.side === 'B') buyOrders.push({ id, price: order.price, qty: order.qty });
        else sellOrders.push({ id, price: order.price, qty: order.qty });
    }
    const buyOrdersDiv = document.getElementById('buyOrdersList');
    buyOrdersDiv.innerHTML = buyOrders.length === 0 ? '— no buy orders —' : 
        buyOrders.map(o => `<div class="order-item"><span>🟢 ID:${o.id}</span><span>₹${o.price.toFixed(2)}</span><span>Q:${o.qty}</span></div>`).join('');
    const sellOrdersDiv = document.getElementById('sellOrdersList');
    sellOrdersDiv.innerHTML = sellOrders.length === 0 ? '— no sell orders —' : 
        sellOrders.map(o => `<div class="order-item"><span>🔴 ID:${o.id}</span><span>₹${o.price.toFixed(2)}</span><span>Q:${o.qty}</span></div>`).join('');
    const bestBid = getBestBid();
    const bestBidQty = bestBid ? (bidLedger.get(bestBid) || 0) : 0;
    const bestAsk = getBestAsk();
    const bestAskQty = bestAsk ? (askLedger.get(bestAsk) || 0) : 0;
    document.getElementById('bestBidDisplay').innerText = bestBid ? bestBid.toFixed(2) : '0.00';
    document.getElementById('bestBidQtyDisplay').innerHTML = `Qty: ${bestBidQty}`;
    document.getElementById('bestAskDisplay').innerText = bestAsk ? bestAsk.toFixed(2) : '0.00';
    document.getElementById('bestAskQtyDisplay').innerHTML = `Qty: ${bestAskQty}`;
    document.getElementById('ltpDisplay').innerText = ltp.toFixed(2);
    document.getElementById('ltqDisplay').innerHTML = `Qty: ${ltq}`;
    document.getElementById('volumeDisplay').innerText = totalVolume;
    document.getElementById('totalOrdersCount').innerHTML = `Orders: ${allOrders.size}`;
}

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab + 'Panel').classList.add('active');
    });
});

document.querySelectorAll('.order-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.order-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.orders-list').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.orderTab + 'OrdersList').classList.add('active');
    });
});

document.getElementById('insertBtn').addEventListener('click', () => {
    const type = document.getElementById('insType').value;
    const orderId = nextOrderId++;
    const price = parseFloat(document.getElementById('insPrice').value);
    const qty = parseInt(document.getElementById('insQty').value);
    if (isNaN(price) || isNaN(qty) || qty <= 0) {
        addToTimeline('ERROR', "Valid price > 0, qty > 0 required");
        nextOrderId--;
        return;
    }
    document.getElementById('insOrderId').value = nextOrderId;
    if (type === 'B') insertBuy(orderId, price, qty);
    else insertSell(orderId, price, qty);
});

document.getElementById('modifyBtn').addEventListener('click', () => {
    const type = document.getElementById('modType').value;
    const orderId = document.getElementById('modOrderId').value;
    const price = parseFloat(document.getElementById('modPrice').value);
    const qty = parseInt(document.getElementById('modQty').value);
    if (!orderId || isNaN(price) || isNaN(qty) || qty < 0) {
        addToTimeline('ERROR', "Valid orderId, price, and qty >= 0 required");
        return;
    }
    if (type === 'B') modifyBuy(orderId, price, qty);
    else modifySell(orderId, price, qty);
});

document.getElementById('deleteBtn').addEventListener('click', () => {
    const type = document.getElementById('delType').value;
    const orderId = document.getElementById('delOrderId').value;
    if (!orderId) {
        addToTimeline('ERROR', "Valid orderId required");
        return;
    }
    if (type === 'B') deleteBuy(orderId);
    else deleteSell(orderId);
});

document.getElementById('tradeBtn').addEventListener('click', () => {
    const buyId = document.getElementById('tradeBuyId').value;
    const sellId = document.getElementById('tradeSellId').value;
    const price = parseFloat(document.getElementById('tradePrice').value);
    const qty = parseInt(document.getElementById('tradeQty').value);
    if (!buyId || !sellId || isNaN(price) || isNaN(qty) || qty <= 0) {
        addToTimeline('ERROR', "Valid buyId, sellId, price > 0, qty > 0 required");
        return;
    }
    processTrade(buyId, sellId, price, qty);
});

document.getElementById('clearAllBtn')?.addEventListener('click', () => clearBook());
document.getElementById('sampleDataBtn')?.addEventListener('click', () => {
    clearBook();
    insertBuy(1001, 1250, 100);
    insertBuy(1002, 1248, 75);
    insertSell(2001, 1255, 120);
    insertSell(2002, 1258, 90);
});
document.getElementById('uploadBtn').addEventListener('click', () => document.getElementById('logFileInput').click());
document.getElementById('logFileInput').addEventListener('change', (e) => { if (e.target.files.length > 0) processFileAndPlay(e.target.files[0]); });
document.getElementById('playbackBtn').addEventListener('click', () => startPlayback());
document.getElementById('stopPlaybackBtn').addEventListener('click', () => stopPlayback());
document.getElementById('clearTimelineBtn').addEventListener('click', () => {
    timelineEvents = [];
    progressionData = [];
    eventCount = 0;
    updateTimelineDisplay();
    updateProgressionChart();
});
document.getElementById('clearChartBtn').addEventListener('click', () => {
    progressionData = [];
    updateProgressionChart();
});
// Modal functionality
const depthModal = document.getElementById('chartModal');
const progressionModal = document.getElementById('progressionModal');
const depthChartCanvas = document.getElementById('depthChart');
const progressionChartCanvas = document.getElementById('progressionChart');
const closeBtns = document.querySelectorAll('.modal-close');

depthChartCanvas.addEventListener('click', () => {
    updateModalDepthChart();
    depthModal.style.display = 'block';
});

progressionChartCanvas.addEventListener('click', () => {
    updateModalProgressionChart();
    progressionModal.style.display = 'block';
});

closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        depthModal.style.display = 'none';
        progressionModal.style.display = 'none';
    });
});

window.addEventListener('click', (e) => {
    if (e.target === depthModal) depthModal.style.display = 'none';
    if (e.target === progressionModal) progressionModal.style.display = 'none';
});

clearBook();