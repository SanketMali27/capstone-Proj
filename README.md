# FoodBridge 🍽️♻️

## Overview

**FoodBridge** is a full-stack MERN (MongoDB, Express.js, React.js, Node.js) application designed to reduce food waste by intelligently routing surplus food from restaurants to the most suitable receivers based on food safety conditions.

Unlike generic food donation or marketplace platforms, FoodBridge acts as a **role-based waste-routing system** that categorizes food dynamically according to its safety score and ensures that food reaches:

* **Humans (NGOs / shelters)**
* **Animal husbandry organizations**
* **Industrial processing units**
* **Expired disposal systems**

The platform integrates:

* Time-sensitive food safety classification
* Role-based access control
* Real-time notifications
* Geospatial receiver matching
* Automated food lifecycle downgrading
* Waste analytics and prediction dashboards

---

# Core Problem Solved

Restaurants often dispose of excess food due to:

* Lack of proper redistribution systems
* Food safety uncertainty
* Time-sensitive spoilage
* Poor receiver coordination

**FoodBridge solves this by:**

1. Allowing restaurants to list surplus food.
2. Automatically calculating food safety.
3. Assigning food to the safest possible category.
4. Notifying appropriate nearby receivers.
5. Downgrading food over time if not claimed.
6. Tracking waste reduction performance.

---

# Key Features

## Restaurant Module

* Register/Login securely using JWT authentication
* Create food listings with:

  * Food type
  * Quantity
  * Temperature
  * Humidity
  * Seasonal factors
* View active listings
* Track claims and pickups
* Access analytics dashboard
* Waste prediction insights

## NGO Module (Human-safe food)

* View only food categorized for human consumption
* Claim food listings
* Confirm pickup
* Receive notifications for nearby listings

## Animal Husbandry Module

* Access food downgraded to animal-safe category
* Claim suitable listings

## Industry Module

* Access food suitable for industrial reuse
* Claim recyclable food waste

## Admin Module

* Monitor:

  * User counts
  * Listing counts
  * Category distribution
  * Waste reduction summaries

---

# Tech Stack

## Frontend

* React.js
* Vite
* Tailwind CSS
* React Router DOM
* Context API
* Socket.IO Client

## Backend

* Node.js
* Express.js
* MongoDB Atlas / Mongoose
* JWT Authentication
* Socket.IO
* Node-Cron

## Additional Services

* Geolocation filtering
* Safety scoring engine
* Analytics engine
* Waste prediction system

---

# System Architecture

```txt
Restaurant → Food Listing Creation → Safety Score Calculation → Category Assignment
          ↓
 Nearby Receiver Matching (Geo-based)
          ↓
 Role-specific Notifications
          ↓
 Claim / Pickup Process
          ↓
 Cron Job Reclassification or Expiry
          ↓
 Waste Analytics + Historical Predictions
```

---

# Food Safety Model

The platform uses a **rule-based heuristic model** to determine food usability.

## Safety Score Factors

### Base Safe Hours

Each food type starts with a predefined safe consumption window.

### Safety Reductions Based On:

* High temperature
* Humidity
* Seasonal risks:

  * Summer
  * Monsoon

## Category Thresholds

| Safety Score | Category |
| ------------ | -------- |
| >= 60        | Human    |
| >= 30        | Animal   |
| > 0          | Industry |
| 0            | Expired  |

---

# Database Models

## User Model

Stores:

* Personal details
* Authentication credentials
* Role
* Organization info
* Geolocation

## FoodListing Model

Stores:

* Source restaurant
* Food details
* Quantity
* Safety score
* Current category
* Expiry predictions
* Listing status

## Notification Model

Stores:

* User alerts
* Claim updates
* Pickup notifications

## WasteHistory Model

Stores:

* Historical food listing patterns
* Claims
* Waste quantities
* Prediction metrics

---

# Backend Workflow

## Listing Creation

### Endpoint:

```bash
POST /api/food
```

### Process:

* Restaurant submits listing
* Safety model calculates:

  * safetyScore
  * predictedExpiryTime
  * humanExpiryTime
  * animalExpiryTime
  * currentCategory
* MongoDB stores listing
* Nearby role-matched users notified

---

## Listing Retrieval

### Endpoint:

```bash
GET /api/food
```

### Filters:

* Only available listings
* Role-specific categories:

  * NGO → Human
  * Animal → Animal
  * Industry → Industry
* Radius-based location filtering
* Quantity filters
* Food type filters

---

## Automated Cron Job

Runs every **15 minutes** to:

* Recalculate safety score
* Downgrade categories
* Expire unsafe food
* Send notifications
* Trigger frontend socket refreshes

---

# Frontend Architecture

## Authentication

Managed via `AuthContext`:

* JWT token storage
* Persistent sessions
* Auto user validation
* Role-based route access

## Route Protection

`ProtectedRoute` ensures:

* Unauthorized users redirected
* Incorrect role blocked

## Real-Time Communication

Socket.IO powers:

* Live notifications
* Listing updates
* Instant dashboard refreshes

---

# Reusable Components

## Navbar

Dynamic links based on role.

## FoodCard

Displays:

* Food details
* Source
* Quantity
* Safety data
* Actions

## CountdownTimer

Shows:

* Downgrade timers
* Expiry timers

## MapView

Displays source geolocation.

## NotificationBell

Combines:

* API notifications
* Live socket notifications

---

# Analytics & Prediction

Restaurants gain insights into:

* Total food listed
* Claimed food
* Wasted food
* Weekly trends
* Monthly trends
* Predicted next-day waste
* Suggested preparation reduction percentages

---

# Installation Guide

## Clone Repository

```bash
git clone https://github.com/yourusername/foodbridge.git
cd foodbridge
```

## Backend Setup

```bash
cd backend
npm install
npm run dev
```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

# Environment Variables

## Backend `.env`

```env
PORT=5000
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_secret_key
CLIENT_URL=http://localhost:5173
```

---

# Project Structure

```txt
FoodBridge/
│
├── backend/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── utils/
│   ├── cron/
│   └── server.js
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── routes/
│   │   └── App.jsx
│
└── README.md
```

---

# Current Strengths

* Strong capstone architecture
* Clear role-based design
* Real-time updates
* Geospatial matching
* Automated food lifecycle management
* Waste analytics integration
* Scalable modular backend

---

# Current Limitations

* Safety model is heuristic, not scientific
* Limited test coverage
* Basic validation in some modules
* Prototype-level admin dashboard
* Some code cleanup pending

---

# Future Improvements

* Machine learning safety prediction
* Advanced supply-demand optimization
* Mobile app support
* Payment/logistics integrations
* Enhanced admin analytics
* Scientific food safety validation
* IoT sensor integration for real-time storage monitoring

---

# Use Cases

* Restaurants
* NGOs
* Animal farms
* Composting industries
* Municipal food redistribution programs
* Smart city waste management systems

---

# Author

**Sanket Mali**

Computer Science & Business Systems Student
AI/ML + Full Stack Developer
Capstone Project: FoodBridge

---

# License

This project is intended for educational, research, and prototype demonstration purposes.

---

# Final Note

**FoodBridge is more than a food donation app — it is an intelligent redistribution ecosystem that combines technology, sustainability, logistics, and analytics to tackle food waste efficiently.**

