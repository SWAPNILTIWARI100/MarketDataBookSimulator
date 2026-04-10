# MarketDataBookSimulator

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Chart.js](https://img.shields.io/badge/Chart.js-4.4.0-ff69b4.svg)](https://www.chartjs.org/)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)

**Real-time Market Data Book Simulator with bid/ask ledgers, order matching engine, and interactive visualizations. Simulates exchange order book behavior with automatic trade execution when orders cross.**
## 🚀 Live Demo

[View Live Demo](https://swapniltiwari100.github.io/MarketDataBookSimulator/)


### Screenshots

<img width="1914" height="834" alt="image" src="https://github.com/user-attachments/assets/953fab43-9490-46a3-8c64-4296d0e2af61" />

<img width="1879" height="829" alt="image" src="https://github.com/user-attachments/assets/bec029ad-0c06-419c-8458-03fb7c58fc36" />

<img width="1848" height="437" alt="image" src="https://github.com/user-attachments/assets/4909f8a2-9a61-4960-b158-c86e2581dc63" />



## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Usage](#usage)
- [File Format](#file-format)
- [Installation](#installation)
- [Technical Details](#technical-details)
- [Contributing](#contributing)

---

## ✨ Features

### Core Order Management

| Operation | Description |
|-----------|-------------|
| **INSERT** | Add new buy/sell limit orders with automatic order ID assignment |
| **MODIFY** | Change existing order price and quantity |
| **DELETE** | Remove orders from the book |
| **TRADE** | Execute manual trades between orders |

### Automatic Trade Matching

- ⚡ Immediate trade execution when ASK price ≤ BID price
- 📊 FIFO (First-In-First-Out) order matching at each price level
- 🔄 Partial fill support with remaining quantity staying in book
- 📝 Pending trade tracking for exchange confirmation
- 🎯 Multiple price level crossing support

### Visual Components

| Component | Description |
|-----------|-------------|
| **Unified Order Book** | Combined view showing both bid and ask sides |
| **Market Depth Chart** | Bar chart visualization of bid/ask quantities |
| **Bid/Ask Progression Chart** | Line chart tracking price evolution over time |
| **Event Timeline** | Complete history with state snapshots at each operation |
| **Individual Orders View** | Separate lists for active buy and sell orders |

### Advanced Features

- 📁 **Log File Playback** — Upload and replay `.log` files with order messages
- 📈 **Real-time Statistics** — Best bid/ask, LTP, volume, active orders count
- 🔍 **Chart Zoom** — Click on charts to expand and zoom for detailed view
- 📱 **Responsive Design** — Works on desktop, tablet, and mobile devices
- 🎨 **Dark Theme** — Professional trading terminal aesthetic
- ⚡ **Fast Playback** — Optimized 1ms delay between commands

---

## 🏗️ Architecture

The simulator implements a complete limit order book matching engine with the following core data structures (mirroring the C++ implementation):

```javascript
// Core data structures
let bidLedger = new Map();      // Price -> Total Bid Quantity
let askLedger = new Map();      // Price -> Total Ask Quantity
let allOrders = new Map();      // Order ID -> {price, qty, side}
let bidPriceLevels = [];        // Sorted descending unique bid prices
let askPriceLevels = [];        // Sorted ascending unique ask prices
```

### Order Matching Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    New Order Received                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Is this a BUY? │
                    └─────────────────┘
                     │               │
                    YES              NO
                     │               │
                     ▼               ▼
        ┌─────────────────┐  ┌─────────────────┐
        │price >= bestAsk?│  │price <= bestBid?│
        └─────────────────┘  └─────────────────┘
            │         │           │         │
           YES        NO         YES        NO
            │         │           │         │
            ▼         ▼           ▼         ▼
      ┌──────────┐ ┌──────┐ ┌──────────┐ ┌──────┐
      │ Execute  │ │ Add  │ │ Execute  │ │ Add  │
      │  Trade   │ │to Bid│ │  Trade   │ │to Ask│
      │          │ │Ledger│ │          │ │Ledger│
      └──────────┘ └──────┘ └──────────┘ └──────┘
```

---

## 📖 Usage

### Manual Order Entry

#### 1. INSERT Order

1. Select **BUY** or **SELL** from the dropdown
2. Enter **Price** and **Quantity**
3. Order ID is automatically assigned (read-only field)
4. Click **INSERT ORDER**

#### 2. MODIFY Order

1. Select **BUY** or **SELL** order type
2. Enter the existing **Order ID**
3. Enter new **Price** and **Quantity**
4. Click **MODIFY ORDER**

#### 3. DELETE Order

1. Select **BUY** or **SELL** order type
2. Enter the **Order ID** to delete
3. Click **DELETE ORDER**

#### 4. TRADE (Manual)

1. Enter **Buy Order ID** and **Sell Order ID**
2. Enter **Trade Price** and **Quantity**
3. Click **EXECUTE TRADE**

### Log File Playback

1. Click **CHOOSE FILE** and select a `.log` or `.txt` file containing order messages
2. Click **RUN** to execute commands sequentially
3. Use **STOP** to pause playback
4. Click **CLEAR** to reset

---

## 📁 File Format

The simulator accepts log files with the following format:

```
[Timestamp] [INFO] N | B | 1001 | 1250.50 | 100
[Timestamp] [INFO] N | S | 2001 | 1255.00 | 50
[Timestamp] [INFO] M | B | 1001 | 1260.00 | 80
[Timestamp] [INFO] X | S | 2001
[Timestamp] [INFO] T | 1001 | 2001 | 1255.00 | 50
```

### Message Types

| Type   | Code | Format                          | Description           |
|--------|------|---------------------------------|-----------------------|
| NEW    | `N`  | `N \| B/S \| OrderID \| Price \| Qty` | New order insertion   |
| MODIFY | `M`  | `M \| B/S \| OrderID \| Price \| Qty` | Order modification    |
| DELETE | `X`  | `X \| B/S \| OrderID`                 | Order deletion        |
| TRADE  | `T`  | `T \| BuyID \| SellID \| Price \| Qty` | Trade execution      |

### Sample Log Entries

```
11:39:59.453249725 [INFO] N | S | 4831355201497395544 | 780150 | 1
11:39:59.453284237 [INFO] X | S | 4831355201497205224
11:39:59.453305591 [INFO] M | B | 4831355201497345320 | 776500 | 1
11:39:59.453318185 [INFO] T | 4831355201497395568 | 4831355201497205176 | 779600 | 1
```

---

## 💻 Installation

### Local Setup

```bash
git clone https://github.com/swapniltiwari100/MarketDataBookSimulator.git
cd MarketDataBookSimulator
```

Open `index.html` directly in your browser, or serve locally:

```bash
python -m http.server 8000
# Then visit http://localhost:8000
```

### Requirements

- No build tools required
- No backend server needed
- Works completely in the browser
- Internet connection required for Chart.js CDN (or download it locally)

### Browser Support

| Browser | Support |
|---------|---------|
| Chrome  | ✅ Latest |
| Firefox | ✅ Latest |
| Safari  | ✅ Latest |
| Edge    | ✅ Latest |

---

## 🔧 Technical Details

### Algorithms

| Component | Algorithm | Complexity |
|-----------|-----------|------------|
| Best Price Access | Direct Map lookup | O(1) |
| Price Level Insertion | Flat Set with binary search | O(log n) |
| Order Matching | Price-time priority | O(1) per match |
| FIFO at Price Level | Insertion order by timestamp | O(1) per order |

### Performance Characteristics

- ✅ Handles hundreds of orders per second
- ✅ Real-time UI updates with Chart.js
- ✅ Efficient event timeline with virtual scrolling
- ✅ Optimized playback with 1ms delay
- ✅ No memory leaks with proper cleanup

 

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m 'Add some AmazingFeature'`
4. Push to the branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Add comments for complex logic
- Test before submitting
- Update documentation as needed

---


## 🙏 Acknowledgments

- [Chart.js](https://www.chartjs.org/) for data visualization
- Inspired by exchange order book mechanics from major trading platforms
- C++ market data book implementation reference
- Font: [Inter](https://fonts.google.com/specimen/Inter) by Google Fonts
