# FoodBridge

FoodBridge is a full-stack MERN-based food redistribution platform that connects restaurants and other food donors with recipient organizations. It manages surplus-food listings, recipient requirements, location-based matching, real-time notifications, and dynamic redistribution priority.

FoodBridge does not independently certify, determine, or guarantee food safety. The platform facilitates redistribution and prioritizes donations operationally.

## Core Idea

FoodBridge helps answer: **Which available donation should be prioritized for redistribution?** Donors choose the intended recipient when they publish a donation. The platform does not automatically change that choice over time.

### Dynamic Redistribution Priority

Available donations receive a transparent score from 0 to 100 based on operational factors:

| Factor | Weight |
| --- | ---: |
| Waiting time | 35% |
| Demand match | 30% |
| Distance | 20% |
| Quantity | 10% |
| Pickup availability | 5% |

The score maps to application-level urgency:

| Score | Urgency |
| ---: | --- |
| 80–100 | URGENT |
| 60–79 | HIGH |
| 40–59 | MEDIUM |
| 0–39 | NORMAL |

These thresholds describe redistribution priority only. The weights and normalization ranges are configurable in `backend/utils/redistributionPriority.js`. Waiting time reaches its maximum over 24 hours, distance is normalized over 50 km, and quantity over 100 units. Demand match uses active NGO requirements with the same food type and quantity unit, considering unfulfilled quantity. The engine uses actual requirement records; it does not invent demand values.

Donation and recipient locations use GeoJSON coordinates and MongoDB `2dsphere` indexes. Distances are calculated with the haversine formula. Maps are displayed with Leaflet and React Leaflet.

## Roles

- `restaurant`: donor that creates and manages its own donations and accepts recipient requests
- `ngo`: human-beneficiary and redistribution organization that manages its food requirements and requests human-intended donations
- `animal_husbandry`: recipient organization for donations the donor explicitly intends for animal use
- `industry`: recipient organization for donations the donor explicitly intends for industrial processing, such as composting or biogas
- `admin`: platform administrator with user, listing, and operational analytics views

Animal and industry intent is donor-declared. FoodBridge does not automatically reclassify donations between recipient types.

## Main Workflows

### Donor

1. Create a donation with food type, quantity, description, intended recipient, and pickup window.
2. Review its priority score, urgency, waiting time, demand match, distance, and pickup availability.
3. Review incoming requests and accept a recipient.
4. Track the donation through completion.

### NGO

1. Create, edit, pause, activate, or delete food requirements.
2. Browse human-intended donations, sorted by priority by default.
3. Filter by food type, distance radius, quantity, priority range, urgency, or demand match.
4. Request a donation. After the donor accepts, confirm pickup to complete it and update fulfilled requirement quantity.

### Animal Husbandry and Industry

Browse and request available donations whose `intendedRecipientType` is respectively `animal` or `industry`. Each role has a requests and pickups view.

### Admin

Review users, current donations, operational statuses, urgency levels, intended recipient types, quantity totals, and average claim/pickup times.

## Donation Statuses

The listing model supports `available`, `requested`, `claimed`, `pickup_pending`, `completed`, and `cancelled`. The current UI flow uses `available` → `requested` → `claimed` → `completed`; donors can cancel available or requested donations. Listings are not automatically marked complete or expired by the priority score.

## Technology

- **Frontend:** React, Vite, React Router, Tailwind CSS, Axios, Recharts, Socket.IO Client, Leaflet, React Leaflet
- **Backend:** Node.js, Express, MongoDB, Mongoose, JWT, bcryptjs, multer, Socket.IO, node-cron, dotenv, cors

## Project Structure

```text
backend/
  middleware/       JWT authentication and role checks
  models/           User, FoodListing, NGORequirement, Notification, WasteHistory
  routes/           auth, food, requirements, analytics, notifications, admin
  socket/           authenticated role and user rooms
  utils/            priority engine, cron, geospatial and waste analytics utilities
  seed.js
  server.js
frontend/
  src/components/   shared cards, badges, maps, navigation and notifications
  src/context/      authentication and Socket.IO state
  src/pages/        role-specific dashboards and workflows
  src/utils/        API client
  src/App.jsx
README.md
```

## Configuration

Create `backend/.env` from `backend/.env.example`:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/foodbridge
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRE=7d
GOOGLE_MAPS_API_KEY=your_google_maps_key
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

The current map component uses Leaflet. The Google Maps key is an optional environment template value for integrations that need it.

Create `frontend/.env` with:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

No weather or sensor API credentials are used.

## Getting Started

Install Node.js dependencies in both folders and start a local MongoDB instance, or configure `MONGODB_URI` to use MongoDB Atlas.

Seed the demo accounts and example data:

```powershell
cd backend
npm install
Copy-Item .env.example .env
npm run seed
```

The seed script replaces records associated with the five FoodBridge demo accounts and their related demo listings, requirements, notifications, and waste history. It does not clear unrelated users or records.

Start the backend in one terminal:

```powershell
cd backend
npm run dev
```

Start the frontend in another terminal:

```powershell
cd frontend
npm install
npm run dev
```

The default frontend URL is `http://localhost:3000`. The backend health endpoint is `http://localhost:5000/api/health`.

### Demo Accounts

All seeded demo accounts use `password123`:

- `restaurant@foodbridge.com`
- `ngo@foodbridge.com`
- `animal@foodbridge.com`
- `industry@foodbridge.com`
- `admin@foodbridge.com`

## API Overview

All routes are prefixed with `/api`. Protected routes require a JWT bearer token.

### Authentication

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Donations

- `POST /food` — restaurant creates a donation
- `GET /food` — recipient sees available donations matching their role; supports food type, radius, quantity and priority ranges, urgency, demand match, and sorting
- `GET /food/restaurant` — restaurant's donations and recipient requests
- `GET /food/claimed/mine` — recipient's pending requests, accepted donations, and completed pickups
- `GET /food/:id` — donation details
- `PUT /food/:id` — restaurant updates its own active donation, including declared recipient intent and pickup window
- `PUT /food/:id/request` — recipient requests an available donation intended for its role
- `PUT /food/:id/claim` — owning restaurant accepts the request
- `PUT /food/:id/pickup-verify` — accepted recipient confirms pickup and completes the donation
- `DELETE /food/:id` — restaurant cancels an available or requested donation

### NGO Requirements

- `POST /ngo/requirements`
- `GET /ngo/requirements`
- `PUT /ngo/requirements/:id`
- `DELETE /ngo/requirements/:id`

Requirements store food type, required and fulfilled quantity, unit, location, and active/paused/fulfilled status.

### Analytics, Notifications, and Admin

- Restaurant analytics: `GET /analytics/restaurant/waste-summary`, `GET /analytics/restaurant/prediction`, `GET /analytics/restaurant/weekly-pattern`
- Notifications: `GET /notifications`, `PUT /notifications/:id/read`
- Admin: `GET /admin/users`, `GET /admin/listings`, `GET /admin/stats`

## Important Backend Modules

- `backend/models/FoodListing.js`: donor intent, listing status, pickup availability, priority data, and donor geolocation.
- `backend/models/NGORequirement.js`: NGO demand and fulfillment tracking.
- `backend/utils/redistributionPriority.js`: weighted operational score, urgency mapping, distance calculation, and factor details.
- `backend/utils/cronJob.js`: recalculates priority for available donations every 15 minutes and notifies recipients when priority changes meaningfully.
- `backend/utils/notificationService.js` and `backend/socket/socketHandler.js`: persisted user notifications; JWT-authenticated sockets join per-user and role rooms for live events.
- `backend/utils/wastePredictionModel.js`: rule-based prediction of historical surplus/waste patterns and preparation guidance. It does not predict safety, spoilage, or expiry.

## Frontend Highlights

- Role-specific restaurant, NGO, animal, industry, and admin routes
- `FoodCard`, `PriorityBadge`, and `WaitingTime` display operational donation details
- NGO requirement management in the NGO dashboard
- Leaflet donation maps
- Live notifications and listing refreshes over Socket.IO
- JWT session handling and role-protected routes

## Analytics and Current Limitations

Restaurant analytics summarize historical listed, claimed, and wasted quantities and provide a rule-based next-day waste estimate. Admin analytics report current donation status, urgency, intended recipient, quantities, and claim/pickup timing.

Demand matching currently supports NGO requirements and exact food-type/unit matching. Animal and industry demand requirements, quantity-unit conversion, and a richer pickup scheduling flow are not implemented. Existing database listings without `intendedRecipientType` are not shown in role-matched donation lists; their intended use must be explicitly reviewed before migration.

## Useful Commands

```powershell
# backend
npm run dev
npm start
npm run seed

# frontend
npm run dev
npm run build
npm run preview
```

## License

This project is for academic / capstone use unless a separate license is added.
