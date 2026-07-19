# Enterprise Carpooling Platform

A modern, high-performance corporate ridesharing and carpool management platform designed to streamline employee daily commutes, optimize travel costs, and audit fleet operations. 

The application utilizes a **Django + Django REST Framework** backend backed by **Django Channels (WebSockets)**, and a **Vite + React + TypeScript** frontend with a custom coffee-ochre design system.

---

## Technical Architecture

### Tech Stack
* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, React Leaflet (OpenStreetMap map overlays).
* **Backend**: Django 5.x, Django REST Framework, Django Channels (ASGI connection streaming), SQLite.
* **Integrations**: Google Maps JS SDK (Autocomplete prediction & Geocoding queries), Photon API (District/street fallback geocoding lookup), Razorpay Sandbox payment gateway.

---

## Key Core Features

### 1. Interactive Route Maps & Geocoding
* **Interactive Pickers**: Double-click or click-tap on Leaflet maps to drop pickup (green pin) and destination (red pin) locations automatically.
* **OSM Driving Engine Integration**: Queries the Open Source Routing Machine (OSRM) driving route API to map street-by-street path polylines.
* **Street-Level Autocomplete**: Sourced from Google Places Autocomplete services with a Photon reverse geocoding fallback, formatting detailed neighborhood, suburb, street, and address listings.
* **Distance & Duration (ETA)**: Calculates exact driving kilometers and formats duration strings (e.g. *1 hr 15 mins*) side-by-side.

### 2. Live Commuter Dashboard & Carbon Analytics
* **Trip Cost Calculator**: Formulates estimated operational fuel cost based on passenger shared distance, fuel cost parameters, and car fuel efficiency.
* **Carbon Offset Indicator**: Computes CO₂ greenhouse gas savings (kg/km) dynamically based on logged commutes.
* **Interactive Data Views**: Audits active bookings, completed rides lists, and carbon footprints.

### 3. Integrated VoIP calling & Chat Console
* **Voice Call Client**: Interactive simulated dialer terminal panel inside ride status screens. Displays Connecting states, speaker toggles, hold toggles, mute recording nodes, and a running call timer.
* **Chat Console**: WebSocket synchronized instant messaging.

### 4. Admin Management Dashboard
* **Staff Verification Console**: Inline editable employee table allowing administrators to verify driving licenses and toggle corporate access flags (`is_active`).
* **Fleet Audit Management**: Overview grid listing registered cars, license plates, seating limits, and ownership details.
* **Dynamic Operational Configuration**: Control global variables (Fuel Cost, Default Fuel Efficiency, CO₂ Savings Factor, Seating Cap limits) directly from the database config form.

### 5. WebSocket Notification Broadcasts
* **Real-time Notifications**: Custom Django Signals hook connected to the `Notification` model. Triggers instant browser alerts, updates unread badges, and prepends notifications on layout mount.

---

## Experimental Module: Tracking Sandbox

The **Tracking Sandbox** is an isolated prototype module located inside `src/modules/trackingSandbox/` for testing real-road live simulation mechanics.

* **Route URL**: `/tracking-sandbox/:tripId`
* **Features**:
  * Loads trip coordinates dynamically from API.
  * Queries directions dynamically using Google Maps `DirectionsService`.
  * Decodes Overview Polylines using an isolated coordinate stepper engine.
  * **Role-Based WebSocket Telemetry Connection**:
    * **Driver**: Stepper increments coordinates every **1 second**, broadcasting telemetry updates (lat/lng, distance covered, remaining ETA, and status) to the socket.
    * **Passenger**: Subscribes read-only to coordinate streams and animates the Leaflet map vehicle marker in real-time.

---

## Getting Started

### Prerequisites
* Python 3.10+
* Node.js 18+ & npm

### Backend Setup (Django ASGI Server)
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run migrations:
   ```bash
   python manage.py migrate
   ```
5. Start the development server:
   ```bash
   python manage.py runserver
   ```

### Frontend Setup (Vite React Client)
1. Install node dependencies from the root directory:
   ```bash
   npm install
   ```
2. Launch the Vite development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser.
