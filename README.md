# FoodBridge

FoodBridge is a full-stack MERN-based food redistribution platform that connects restaurants and other food donors with recipient organizations. It manages surplus-food listings, recipient requirements, location-based matching, real-time notifications, and dynamic redistribution priority.

FoodBridge does not independently certify, determine, or guarantee food safety. The platform facilitates redistribution and prioritizes donations operationally.

## Core Idea

FoodBridge helps answer: **Which available donation should be prioritized for redistribution?** It does not make food-safety determinations. A donor chooses the intended recipient type when publishing a donation; that choice is not changed automatically.

### Dynamic Redistribution Priority

Each available listing receives a transparent 0–100 score using operational factors:

| Factor | Weight |
| --- | ---: |
| Waiting time | 35% |
| Demand match | 30% |
| Distance | 20% |
| Quantity | 10% |
| Pickup availability | 5% |

The score maps to application-level urgency: 80–100 URGENT, 60–79 HIGH, 40–59 MEDIUM, and 0–39 NORMAL. These thresholds describe redistribution priority only. Waiting time increases progressively over a configurable 24-hour range; distance is normalized over 50 km, and quantity over 100 units. The weights and ranges live in `backend/utils/redistributionPriority.js`.

Demand match uses active NGO requirements with a matching food type and outstanding quantity. Distance uses stored GeoJSON coordinates and haversine ranking; MongoDB `2dsphere` indexes are retained for geospatial queries. The engine does not invent requirement demand.

## Features

- JWT authentication and role-based routes
- Donor-created donation listings with recipient intent and pickup windows
- NGO requirement creation, update, pause, activation, and deletion
- Dynamic priority and urgency recalculation, including a 15-minute scheduled refresh
- Location-aware listing search and Leaflet map views
- Request, donor acceptance, and recipient pickup completion workflow
- User and role-room notifications over Socket.IO
- Restaurant waste and surplus analytics based on historical records
- Administrative donation, status, urgency, and recipient analytics
- Demo seed data across all five roles

## Implemented Roles

- `restaurant`: donor that creates and manages its own donations and accepts requests
- `ngo`: human-beneficiary / redistribution organization; manages its requirements and requests human-intended donations
- `animal_husbandry`: recipient organization for donations the donor explicitly marks for animal use
- `industry`: recipient organization for donations the donor explicitly marks for industrial processing such as composting or biogas
- `admin`: platform administrator

Animal and industry listings are not automatic downgrades. FoodBridge does not decide whether a donation has become suitable only for a different recipient type.

## Main Workflows

### Restaurant / Donor

1. Create a donation with food type, quantity, description, donor location, intended recipient, and pickup window.
2. Review its score, urgency, waiting time, demand match, distance, and pickup availability.
3. Review incoming requests and accept one.
4. Track completion and waste analytics.

### NGO

1. Create active food requirements, including food type and quantity.
2. Browse donor-declared human / NGO donations, sorted by priority by default.
3. Filter by food type, radius, quantity, urgency, and demand match.
4. Request a donation; after donor acceptance, confirm pickup to complete it.

### Animal Husbandry and Industry

Browse available donations whose `intendedRecipientType` is respectively `animal` or `industry`, then request them. The recipient type reflects donor-declared intended use and is not derived from a safety score.

### Admin

Review users, listings, donation statuses, urgency levels, intended recipient types, quantities, and average time to claim.

## Tech Stack

- Frontend: React, React Router, Tailwind CSS, Axios, Recharts, Socket.IO Client, Leaflet / React Leaflet, Vite
- Backend: Node.js, Express, MongoDB / Mongoose, JWT, bcryptjs, multer, Socket.IO, node-cron, dotenv, cors

## Project Structure

```text
backend/
  middleware/  models/  routes/  socket/  uploads/  utils/
  seed.js  server.js
frontend/
  src/components/  src/context/  src/pages/  src/utils/
  src/App.jsx  src/main.jsx
README.md
```

## Environment Variables

Backend `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/foodbridge
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRE=7d
GOOGLE_MAPS_API_KEY=optional_key_if_used_by_your_maps_setup
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

Frontend `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

No weather or sensor credentials are used.

## Getting Started

Install dependencies in `backend` and `frontend`, configure the backend `.env`, and start MongoDB. Then:

```powershell
cd backend
npm run seed
npm run dev
```

In a second terminal:

```powershell
cd frontend
npm run dev
```

The Vite frontend runs at `http://localhost:3000`; the API health endpoint is `http://localhost:5000/api/health`.

### Demo Accounts

All seeded accounts use `password123`:

- `restaurant@foodbridge.com`
- `ngo@foodbridge.com`
- `animal@foodbridge.com`
- `industry@foodbridge.com`
- `admin@foodbridge.com`

## Backend API

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Donations

- `POST /api/food` — restaurant creates a donation
- `GET /api/food` — role-matched available donations; supports food type, radius, quantity and priority ranges, urgency, demand filters, and sorting
- `GET /api/food/restaurant` — restaurant's own donations and requests
- `GET /api/food/claimed/mine` — recipient's pending requests and accepted/completed donations
- `GET /api/food/:id`
- `PUT /api/food/:id` — restaurant updates its own donation details or donor-declared intended recipient
- `PUT /api/food/:id/request` — recipient requests an available, correctly intended donation
- `PUT /api/food/:id/claim` — owning restaurant accepts a request
- `PUT /api/food/:id/pickup-verify` — accepted recipient completes pickup
- `DELETE /api/food/:id` — owning restaurant cancels an available/requested donation

### NGO Requirements

- `POST /api/ngo/requirements`
- `GET /api/ngo/requirements`
- `PUT /api/ngo/requirements/:id`
- `DELETE /api/ngo/requirements/:id`

### Other APIs

- Analytics: `GET /api/analytics/restaurant/waste-summary`, `/prediction`, `/weekly-pattern`
- Notifications: `GET /api/notifications`, `PUT /api/notifications/:id/read`
- Admin: `GET /api/admin/users`, `/listings`, `/stats`

## Important Backend Modules

- `backend/models/FoodListing.js`: donor-declared recipient intent, operational status, pickup window, priority fields, and geospatial index.
- `backend/models/NGORequirement.js`: NGO demand, fulfilled quantity, location, and active/paused/fulfilled state.
- `backend/utils/redistributionPriority.js`: configurable transparent priority formula and factor explanations.
- `backend/utils/cronJob.js`: recalculates priorities for available listings every 15 minutes and notifies relevant recipients when scores change meaningfully.
- `backend/socket/socketHandler.js` and `backend/utils/notificationService.js`: JWT socket rooms, persistent notifications, and live redistribution events.
- `backend/utils/wastePredictionModel.js`: rule-based historical surplus/waste prediction and preparation guidance. It does not predict safety, spoilage, or expiry.

## Frontend Highlights

- Role-specific donor, NGO, animal, industry, and admin dashboards
- `FoodCard`, `PriorityBadge`, and `WaitingTime` show listing and operational priority details
- NGO requirements are managed from the NGO dashboard
- Listing maps use Leaflet and available coordinates
- Protected routes and Socket.IO live notifications

## Notes

- Listing statuses are `available`, `requested`, `claimed`, `pickup_pending`, `completed`, and `cancelled`.
- There is no automatic listing or food expiration based on a priority score. A donor may cancel an available/requested listing.
- Priority factors explain operational redistribution ranking; they are not food-safety measurements.
- Food image uploads are stored under `backend/uploads/`.
- Legacy databases should be reseeded or migrated to remove obsolete food listing fields and status values.

## Current Status

This repository includes the MERN app, role-based donation and requirement flows, priority scoring, geospatial matching, live notifications, historical restaurant analytics, and demo accounts. The priority model is a deterministic operational rules engine, not machine learning.

## Future Improvements

- Add recipient demand models for animal husbandry and industry organizations
- Add a richer request negotiation and pickup scheduling flow
- Improve unit-aware demand matching and conversion between quantity units
- Add email/SMS delivery, cloud image storage, audit trails, and automated integration coverage
- Future research could investigate ML-based food safety prediction using validated food-specific datasets; the current application does not perform this.

## License

This project is for academic / capstone use unless you choose to add a specific license.
