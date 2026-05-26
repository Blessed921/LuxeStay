<p align="center">
  <img src="./public/luxestay_logo.png" alt="LuxeStay Luxury Logo" width="1200" height="475" />
</p>

# 🏰 LuxeStay: Premium Sanctuary Rentals & Operations Node

An elite full-stack real estate partnership, fractional sanctuary rental, and operations registry application. Designed for discerning patrons and real estate hosts to inspect luxury residences, execute secure booking engagements, manage ledger settlements, and handle operations tickets in a fully secure environment.

---

## 🌌 Core Pillars & Architecture

LuxeStay is divided into three major architectural pillars, fully connected with client-side React motion states and a persistent Firebase Firestore instance representing real-world transactions.

```
                  ┌─────────────────────────────────┐
                  │      LuxeStay Client Portal     │
                  └───────────────┬─────────────────┘
                                  ▼
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
 ┌───────────────┐        ┌───────────────┐        ┌───────────────┐
 │ Rent Sanctuary │        │ Portfolio Mgmt│        │Secure Tickets │
 └───────┬───────┘        └───────┬───────┘        └───────┬───────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  ▼
                   ┌──────────────────────────────┐
                   │  Firebase Firestore Systems  │
                   └──────────────────────────────┘
```

### 1. The Rental Sanctuary Portal
* **Explore Page (`ExplorePage.tsx`)**: An eye-catching luxury interface to discover available sanctuaries globally. Filters units based on categories, price targets, and rental durations. 
* **Listing Details (`ListingDetailPage.tsx`)**: High-contrast, interactive layout showing immersive imagery, detailed pricing breakdowns, and host profiles. Supports immediate reservation locks.
* **Booking Ledger & Success (`BookingSuccessPage.tsx`)**: Interactive booking confirmation rendering real-time booking calculations and dynamic receipt references.

### 2. Operational Host & Ledger Console
* **Portfolio Control Panel (`PortfolioPage.tsx` & `HostPage.tsx`)**: Custom dashboards for landlords and property investors. Includes dynamic ledger balancing, earnings calculators, and asset occupancy tracking.
* **Dynamic Ledger Settlement System**: Simulates bank wire distributions and digital lock-deed clearances. Includes deep ledger-matching rules keeping balances synchronized.
* **Secured Admin Controls**: Authenticated admins have elevated controls to review platform metrics, verify legal clearances, and override security flags.

### 3. Secured Operations Ticketing Desk
* **Secure Contact Channel (`ContactPage.tsx`)**: A hardware-grade secure contact interface where global clients transmit encrypted tickets under four priority departments:
  * *General Concierge Support*
  * *Real Estate & Host Partnership Audits*
  * *Inbound Wire / Settlement Ledger Queries*
  * *Key-vault Lock Protocols & Integrity Clearance*
* **Real-Time Ticket Management Console (`App.tsx`)**: Accessible directly to privileged system administrators. Enables staff to read incoming inquiries in real-time, inspect details, update procedural categories, and change ticket statuses (Pending ➔ In Process ➔ Resolved).

---

## 🛠️ Technology Stack & Libraries

LuxeStay uses industry-standard libraries selected for high visual polish and resilient execution:

* **Framework**: React 18+ powered by Vite (optimized ES build pipelines).
* **Language**: TypeScript (fully typed interfaces for listings, bookings, transactions, and support tickets).
* **Styling**: Tailwind CSS (light slate-gray aesthetic, custom high-contrast palettes, spacious negative margins, and editorial serif display typography).
* **Animations**: `motion` (imported from `motion/react` for buttery-smooth page transitions, spring-loaded buttons, and slide-in alert overlays).
* **Database & Auth**: Google Firebase (Firestore for real-time persistent data pipelines, Firebase Authentication for secure user logins).
* **Icons**: `lucide-react` (clean, minimalist SVG icons loaded as react components).

---

## 📂 File Directory Structure

```filepath
├── .env.example             # Defines required credentials for Firestore & Auth
├── firestore.rules          # Enterprise security rules validating writes and reads
├── firebase-blueprint.json  # Structural schemas defining the Firestore database layout
├── security_spec.md         # Cryptographic & logical specifications of user states
├── FLOWCHART.md             # Visually records the data-routing logic and views
├── index.html               # Main SPA viewport
├── tsconfig.json            # Strict TypeScript compiler configurations
├── src/
│   ├── App.tsx             # Root router, navbar layouts, and Admin Control Panel
│   ├── main.tsx            # React bootstrap entry point
│   ├── index.css           # Global typography definitions, Inter / JetBrains Mono
│   ├── pages/              # Custom application view controllers
│   │   ├── ExplorePage.tsx        # High-end listing finder and category filters
│   │   ├── ListingDetailPage.tsx  # Interactive detail layout with pricing modules
│   │   ├── BookingSuccessPage.tsx # Dynamic wire ledger and booking confirmations
│   │   ├── PortfolioPage.tsx      # Host statistics, ledger records, and transfer panels
│   │   ├── ProfilePage.tsx        # User accounts, direct messages, and reviews
│   │   ├── HostPage.tsx           # Host application protocols and promo codes
│   │   └── ContactPage.tsx        # Concierge support form and user clearance ticket log
│   ├── lib/
│   │   └── firebase.ts            # Firebase SDK setup and custom error-handling mechanics
```

---

## 🔐 Database Schema & Security Rules

All operations are audited and guarded via `firestore.rules`. Unauthorized records cannot reach the server:

### 🗄️ Firestore Collections Structure
1. **`users`**: Stores user authentication records, emails, roles (`host`, `admin`, `guest`), and profile notes.
2. **`listings`**: Accommodates available luxury properties, pricing structures, and specifications.
3. **`bookings`**: Connects tenants to rent schedules, security deposits, and final invoices.
4. **`contact_submissions`**: Houses secure concierge inquiry tickets.
   * *Required Fields*: `name`, `email`, `category`, `subject`, `message`, `userId`, `status`, `createdAt`
   * *Status Enums*: `PENDING_CONCIERGE`, `IN_PROCESS`, `RESOLVED`

### 🛡️ Secure Permissions Protocol
* **Submissions Visibility**: Guest users can uniquely create secure clearance tickets. Authenticated users can view only their own ticket histories.
* **Admin Verification**: Only authenticated administrative keys (`isAdmin() === true`) can list all contact tickets globally and update their clearance states.
* **Integrity Validation**: Security rules check string boundaries, preventing character injection and limiting message submissions to verified sizes (e.g. subject length $\le$ 200 chars; body length $\le$ 5000 chars).

---

## ⚡ Setup & Development Command Reference

### Local Setup
1. **Set Environment Credentials**:
   Duplicate `.env.example` and rename to `.env.local` or insert the keys in your cloud manager variables:
   ```env
   VITE_FIREBASE_API_KEY=your_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

2. **Execute Local Development Server**:
   ```bash
   npm run dev
   ```
   *Serves the app on port 3000.*

3. **Validate TypeScript & Build Errors**:
   ```bash
   npm run lint
   ```

4. **Compile Production Bundle**:
   ```bash
   npm run build
   ```
   *Prepares static production assets inside the `/dist` directory.*
