# Good Showroom Accounting Suite — Backend API Reference
Dealership: **Dandenong Hyundai (Booran Motor Group)**
Base URL: `/api`

---

## Authentication (`/api/auth`)

### POST `/api/auth/login`
Authenticates a dealership staff member and issues a signed JWT token.
- **Request Body**:
  ```json
  {
    "email": "sarah@dandenonghyundai.com.au",
    "password": "demo1234"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "user": {
      "_id": "66e85...",
      "name": "Sarah Mitchell",
      "email": "sarah@dandenonghyundai.com.au",
      "role": "controller"
    }
  }
  ```

### GET `/api/auth/me`
Returns current authenticated user profile. Requires Bearer Token.

---

## Entity Context (`/api/entity`)

### GET `/api/entity`
Returns dealership rooftop metadata, active accounting period, and available period calendar.
- **Response `200 OK`**:
  ```json
  {
    "entity": {
      "name": "Dandenong Hyundai",
      "abn": "12 345 678 901",
      "address": {
        "street": "223-225 Lonsdale Street",
        "suburb": "Dandenong",
        "state": "VIC",
        "postcode": "3175"
      },
      "isLocked": true
    },
    "activePeriod": {
      "code": "2026-09",
      "status": "open"
    },
    "periods": [...]
  }
  ```

---

## Command Centre Dashboard (`/api/dashboard`)

### GET `/api/dashboard/kpis`
Computes all 12 dealership Key Performance Indicators across Bank, AP, Inventory, and GL desks.
- **Query Params**: `periodId` (optional)
- **Response `200 OK`**:
  ```json
  {
    "periodCode": "2026-09",
    "kpis": [
      {
        "key": "inventory_total",
        "label": "Total In-Stock Inventory",
        "value": 43250000,
        "formattedValue": "$432,500.00",
        "status": "healthy",
        "desk": "inventory"
      },
      ...
    ],
    "exceptions": {
      "unmatchedBankTxnsCount": 1,
      "openApExceptionsCount": 1,
      "unreconciledControlRecsCount": 0,
      "totalExceptionsCount": 2
    },
    "facilityHeadroomCents": 580000000,
    "facilityLimitCents": 1000000000
  }
  ```

### GET `/api/dashboard/kpis/:key/drill`
Drills into any KPI tile to retrieve the granular sub-ledger items and journal entries supporting the figure.

---

## Bank Desk (`/api/bank`)

### GET `/api/bank/accounts`
Returns all bank accounts (Operating, Trust, Deposits) with balances.

### GET `/api/bank/transactions`
Returns paginated transactions with status, match confidence, and allocations.
- **Query Params**: `bankAccountId`, `status` (`unmatched` | `suggested` | `matched` | `parked` | `split`), `page`, `limit`

### GET `/api/bank/transactions/:id/suggest-matches`
Executes real-time candidate scoring engine against AP invoices, deals, and financier settlements.

### POST `/api/bank/transactions/:id/allocate`
Allocates transaction to target accounts/deals and posts matching ledger journal.

### POST `/api/bank/transactions/:id/split`
Splits a bulk receipt or payment across multiple deals. Requires split sum to equal transaction amount exactly.

### POST `/api/bank/transactions/:id/park`
Parks an un-reconciled item for controller investigation with an audit trail reason.

### GET `/api/bank/rec-pack/:bankAccountId`
Generates a monthly bank reconciliation pack proving `book balance = statement balance + outstanding items` ($0.00 difference).

### POST `/api/bank/statements/import`
Parses and imports a CSV/XLSX statement into the bank account.

---

## Accounts Payable Desk (`/api/ap`)

### GET `/api/ap/invoices`
Returns paginated supplier invoices with statuses (`captured`, `coded`, `matched`, `exception`, `approved`, `paid`).

### POST `/api/ap/invoices/upload`
Uploads invoice document and runs simulated OCR extraction.

### PUT `/api/ap/invoices/:id/extraction`
Saves manual corrections to OCR extracted fields.

### POST `/api/ap/invoices/:id/code`
Codes invoice lines to expense / asset accounts and posts to Accounts Payable Trade Control (Account 2000).

### POST `/api/ap/invoices/:id/match`
Executes 3-way match against target Purchase Order.

### POST `/api/ap/invoices/:id/exceptions/:exceptionId/resolve`
Resolves or waives a price/quantity variance with Controller authorization.

### POST `/api/ap/payment-runs`
Batches approved supplier invoices into an ABA disbursement run.

### POST `/api/ap/payment-runs/:id/execute`
Finalizes payment run, generates valid Australian Banking Association `.aba` file, and marks invoices as paid.

### GET `/api/ap/ageing`
Generates 30/60/90 day supplier ageing schedule and asserts zero variance against GL Control Account 2000.

---

## Vehicle Inventory & Deals (`/api/inventory`)

### GET `/api/inventory/vehicles`
Returns vehicles with status, class (`new`, `used`, `demo`), and full cost stack.

### GET `/api/inventory/vehicles/:id`
Returns individual vehicle with all 9 cost stack line types and linked deal jacket.

### POST `/api/inventory/vehicles/:id/cost-lines`
Appends a capitalized cost line (recon, transport, PDI, holdback, bonus) to the vehicle and updates inventory asset ledger.

### GET `/api/inventory/deals`
Returns delivered deal jackets with front gross, back gross, F&I reserve, and deal contribution.

### GET `/api/inventory/floorplan`
Returns wholesale facility line status, active vehicle draws, and accrued interest.

---

## General Ledger & Financial Control (`/api/gl`)

### GET `/api/gl/trial-balance`
Computes live Trial Balance across all 80+ accounts with department filtering. Asserts debits = credits.

### GET `/api/gl/accounts/:id/drill`
Drills into any chart of accounts code to inspect all historical debit/credit postings.

### GET `/api/gl/journals`
Returns paginated General Ledger journal register.

### POST `/api/gl/journals/manual`
Posts a manual journal entry. Validates integer balancing (sum debits === sum credits).

### POST `/api/gl/journals/:id/reverse`
Reverses a posted journal entry by generating an inverted mirror entry.

### GET `/api/gl/control-recs`
Returns the 8 dealership Control Reconciliations (Cash Operating, Cash Trust, AP, Inventory New, Inventory Used, Floorplan, Customer Deposits, GST).

### POST `/api/gl/control-recs/:type/complete`
Marks a verified $0.00 control reconciliation as completed and signed off.

### GET `/api/gl/evidence-pack`
Exports the complete auditor evidence pack bundle in JSON format.

---

## Immutable Audit Trail (`/api/audit`)

### GET `/api/audit`
Returns paginated immutable audit log events with before/after state diff payloads.
