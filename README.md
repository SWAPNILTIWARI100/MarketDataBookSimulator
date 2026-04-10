# MarketDataBookSimulator

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Chart.js](https://img.shields.io/badge/Chart.js-4.4.0-ff69b4.svg)](https://www.chartjs.org/)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)

**Real-time Market Data Book Simulator with bid/ask ledgers, order matching engine, and interactive visualizations. Simulates exchange order book behavior with automatic trade execution when orders cross.**

## 🚀 Live Demo

[View Live Demo](https://your-demo-link.com) <!-- Add your live demo link here -->

## 📋 Table of Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Architecture](#architecture)
- [Usage](#usage)
- [File Format](#file-format)
- [Installation](#installation)
- [Technical Details](#technical-details)
- [Data Structures](#data-structures)
- [Contributing](#contributing)
- [License](#license)

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

- 📁 **Log File Playback** - Upload and replay `.log` files with order messages
- 📈 **Real-time Statistics** - Best bid/ask, LTP, volume, active orders count
- 🔍 **Chart Zoom** - Click on charts to expand and zoom for detailed view
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile devices
- 🎨 **Dark Theme** - Professional trading terminal aesthetic
- ⚡ **Fast Playback** - Optimized 1ms delay between commands

## 🏗️ Architecture

The simulator implements a complete limit order book matching engine with the following core data structures (mirroring the C++ implementation):

```javascript
// Core data structures
let bidLedger = new Map();      // Price -> Total Bid Quantity
let askLedger = new Map();      // Price -> Total Ask Quantity
let allOrders = new Map();      // Order ID -> {price, qty, side}
let bidPriceLevels = [];        // Sorted descending unique bid prices
let askPriceLevels = [];        // Sorted ascending unique ask prices
