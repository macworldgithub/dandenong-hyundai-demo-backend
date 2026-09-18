# Good Showroom Accounting Suite — Backend

**Dealership Instance**: Dandenong Hyundai (Booran Motor Group)  
**ABN**: 12 345 678 901  
**Location**: 223–225 Lonsdale Street, Dandenong VIC 3175  

This is the backend service powering the single-rooftop dealership accounting suite. It provides four deep operational desks (Bank, Accounts Payable, Vehicle Inventory & Deals, General Ledger) with strict accounting invariants, candidate match scoring, simulated OCR, and immutable audit logging.

---

## Core Features & Invariants

1. **Strict General Ledger Posting Engine**:
   - The posting engine (`src/services/posting.js`) is the ONLY path to the ledger.
   - Every journal entry must balance: $\sum \text{Debits} - \sum \text{Credits} = 0$ (exact integer cents).
   - Posted entries are immutable. Corrections are executed via explicit reversal journals only.
   - No vehicle revenue can be booked without inventory relief (COGS).
   - Duplicate supplier invoice numbers are strictly blocked.

2. **Real-time Match Scoring Engine**:
   - Scores bank transactions against open AP invoices, deal deposits, and financier floorplan settlements.
   - Uses token matching, date proximity windows, and exact amount proximity.
   - Match confidence $\ge 90\%$ is auto-suggested; $<90\%$ routes to Controller review.

3. **Four Deep Dealership Desks**:
   - **Bank Desk**: Ingests NAB statements, executes 1-click matching, multi-deal split allocation, and generates $0.00 difference rec packs.
   - **AP Desk**: Simulated OCR extraction, GL coding, 3-way PO matching, price variance resolution, and ABA payment runs.
   - **Inventory Desk**: VIN cost stack waterfall (invoice, freight, PDI, recon, accessories, holdback/bonus reductions) and floorplan wholesale facility management.
   - **GL Desk**: Multi-department live Trial Balance, account drilldown, 8 Control Reconciliations, and Auditor Evidence Pack export.

---

## Prerequisites

- **Node.js**: v18 or higher
- **MongoDB**: Running instance (local `mongodb://localhost:27017/dandenong-hyundai` or MongoDB Atlas URI)

---

## Installation & Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Ensure `MONGODB_URI` points to your MongoDB instance:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/dandenong-hyundai
   JWT_SECRET=supersecretkey12345demo
   JWT_EXPIRES_IN=7d
   CLIENT_ORIGIN=http://localhost:5173
   ```

3. **Seed Dealership Data**:
   Populates 80+ accounts, 40 vehicles, 25 delivered deals, 40 suppliers, AP invoices, statements, and asserts trial balance equilibrium:
   ```bash
   npm run seed
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   The backend API will listen on `http://localhost:5000`.

---

## Demo Credentials (All Passwords: `demo1234`)

| Name | Role | Email |
|------|------|-------|
| Sarah Mitchell | Controller | `sarah@dandenonghyundai.com.au` |
| Michael Chang | Senior Accountant | `michael@dandenonghyundai.com.au` |
| Jessica Taylor | AP Clerk | `jessica@dandenonghyundai.com.au` |
| David Wilson | System Admin | `david@dandenonghyundai.com.au` |

---

## API Documentation

See [docs/API.md](file:///d:/dandenong-hyundai/dandenong-hyundai-demo-backend/docs/API.md) for full endpoint specifications.
