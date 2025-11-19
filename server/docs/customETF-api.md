# Custom ETF API Documentation

## Overview
This API provides endpoints for managing custom ETFs in the Momentum Rider application. It allows users to add, retrieve, update, remove, and validate custom ETFs.

## Base URL
```
/api/etfs
```

## Authentication
Currently, authentication is disabled for single-user access. All endpoints are publicly accessible within the configured CORS origins.

## Data Types

### CustomETF Object
```typescript
interface CustomETF {
  ticker: string;                // ETF ticker symbol (uppercase, 1-10 chars)
  name: string;                  // Full ETF name
  category: string;              // Category: STOCKS, BONDS, COMMODITIES, ALTERNATIVES, CUSTOM
  expenseRatio: number;          // Expense ratio as decimal (0-1, e.g., 0.03 for 3%)
  inceptionDate: string;         // Inception date in YYYY-MM-DD format
  addedDate: string;             // Date when ETF was added to system (ISO 8601)
  updatedDate?: string;          // Date when ETF was last updated (ISO 8601)
  isValid: boolean;              // Whether ETF data is valid and available
  lastValidation: string;        // Last validation date (ISO 8601)
  notes?: string;                // Optional notes about the ETF (max 500 chars)
  description?: string;          // ETF description
  currency?: string;             // Currency code (default: USD)
  exchange?: string;             // Exchange where ETF is traded
}
```

## Endpoints

### 1. Add Custom ETF
**POST** `/api/etfs/custom`

Adds a new custom ETF to the system. The ETF is validated against external data sources before being added.

#### Request Body
```json
{
  "ticker": "VGT",               // Required: Ticker symbol (1-10 chars)
  "category": "STOCKS",          // Optional: Category (STOCKS|BONDS|COMMODITIES|ALTERNATIVES|CUSTOM)
  "expenseRatio": 0.0004,        // Optional: Expense ratio as decimal (0-1)
  "inceptionDate": "2004-01-26", // Optional: Inception date (YYYY-MM-DD)
  "notes": "Technology sector"   // Optional: Notes (max 500 chars)
}
```

#### Response
**201 Created**
```json
{
  "message": "Custom ETF added successfully",
  "etf": {
    "ticker": "VGT",
    "name": "Vanguard Information Technology ETF",
    "category": "STOCKS",
    "expenseRatio": 0.0004,
    "inceptionDate": "2004-01-26",
    "addedDate": "2025-11-17T12:00:00.000Z",
    "isValid": true,
    "lastValidation": "2025-11-17T12:00:00.000Z",
    "notes": "Technology sector",
    "description": "Vanguard Information Technology ETF",
    "currency": "USD",
    "exchange": "PCX"
  }
}
```

#### Error Responses
**400 Bad Request**
```json
{
  "error": "Validation failed",
  "message": "Ticker must contain only letters, numbers, dots, and hyphens"
}
```
```json
{
  "error": "Invalid ETF: ETF name not found"
}
```
```json
{
  "error": "ETF VGT already exists"
}
```

---

### 2. Get All Custom ETFs
**GET** `/api/etfs/custom`

Retrieves all custom ETFs stored in the system.

#### Response
**200 OK**
```json
{
  "etfs": [
    {
      "ticker": "VGT",
      "name": "Vanguard Information Technology ETF",
      "category": "STOCKS",
      "expenseRatio": 0.0004,
      "inceptionDate": "2004-01-26",
      "addedDate": "2025-11-17T12:00:00.000Z",
      "isValid": true,
      "lastValidation": "2025-11-17T12:00:00.000Z",
      "notes": "Technology sector",
      "description": "Vanguard Information Technology ETF",
      "currency": "USD",
      "exchange": "PCX"
    }
  ],
  "count": 1
}
```

#### Error Responses
**500 Internal Server Error**
```json
{
  "error": "Failed to retrieve custom ETFs"
}
```

---

### 3. Update Custom ETF
**PUT** `/api/etfs/custom/:ticker`

Updates an existing custom ETF. Only the fields provided in the request body will be updated.

#### URL Parameters
- `ticker` (string, required): ETF ticker symbol to update

#### Request Body
```json
{
  "category": "ALTERNATIVES",    // Optional: New category
  "expenseRatio": 0.0025,        // Optional: New expense ratio
  "inceptionDate": "2020-01-01", // Optional: New inception date
  "notes": "Updated notes"       // Optional: New notes
}
```
*At least one field must be provided*

#### Response
**200 OK**
```json
{
  "message": "ETF VGT updated successfully",
  "etf": {
    "ticker": "VGT",
    "name": "Vanguard Information Technology ETF",
    "category": "ALTERNATIVES",
    "expenseRatio": 0.0025,
    "inceptionDate": "2020-01-01",
    "addedDate": "2025-11-17T12:00:00.000Z",
    "updatedDate": "2025-11-17T13:00:00.000Z",
    "isValid": true,
    "lastValidation": "2025-11-17T12:00:00.000Z",
    "notes": "Updated notes",
    "description": "Vanguard Information Technology ETF",
    "currency": "USD",
    "exchange": "PCX"
  }
}
```

#### Error Responses
**400 Bad Request**
```json
{
  "error": "Validation failed",
  "message": "At least one field must be provided for update"
}
```
```json
{
  "error": "ETF INVALID not found"
}
```
```json
{
  "error": "Parameter validation failed",
  "message": "Ticker must contain only letters, numbers, dots, and hyphens"
}
```

---

### 4. Delete Custom ETF
**DELETE** `/api/etfs/custom/:ticker`

Removes a custom ETF from the system.

#### URL Parameters
- `ticker` (string, required): ETF ticker symbol to remove

#### Response
**200 OK**
```json
{
  "message": "ETF VGT removed successfully"
}
```

#### Error Responses
**400 Bad Request**
```json
{
  "error": "Parameter validation failed",
  "message": "Ticker parameter is required"
}
```
```json
{
  "error": "ETF INVALID not found"
}
```

---

### 5. Validate ETF Ticker
**GET** `/api/etfs/validate/:ticker`

Validates if an ETF ticker exists and has available data.

#### URL Parameters
- `ticker` (string, required): ETF ticker symbol to validate

#### Response
**200 OK**
```json
{
  "ticker": "VGT",
  "valid": true,
  "name": "Vanguard Information Technology ETF"
}
```

#### Error Responses
**400 Bad Request**
```json
{
  "error": "Parameter validation failed",
  "message": "Ticker parameter is required"
}
```
```json
{
  "ticker": "INVALID",
  "valid": false,
  "error": "ETF name not found"
}
```

---

### 6. Get Combined ETF Universe
**GET** `/api/etfs/universe`

Retrieves the combined ETF universe including default ETFs and custom ETFs, grouped by category.

#### Response
**200 OK**
```json
{
  "universe": {
    "STOCKS": ["VTI", "VEA", "VWO", "VGT"],
    "BONDS": ["TLT", "BWX", "BND"],
    "COMMODITIES": ["PDBC", "GLDM"],
    "ALTERNATIVES": ["IBIT"],
    "CUSTOM": ["SPY", "QQQ"]
  },
  "categories": ["STOCKS", "BONDS", "COMMODITIES", "ALTERNATIVES", "CUSTOM"]
}
```

#### Error Responses
**500 Internal Server Error**
```json
{
  "error": "Failed to retrieve ETF universe"
}
```

---

### 7. Validate All Custom ETFs
**POST** `/api/etfs/validate-all`

Validates all custom ETFs in the system (admin endpoint for maintenance).

#### Response
**200 OK**
```json
{
  "message": "Custom ETF validation completed",
  "validated": 3,
  "invalid": 0
}
```

#### Error Responses
**500 Internal Server Error**
```json
{
  "error": "Failed to validate custom ETFs"
}
```

## Validation Rules

### Ticker Symbol
- Must be 1-10 characters
- Can contain letters, numbers, dots, and hyphens
- Automatically converted to uppercase
- Example: `VGT`, `SPY`, `QQQ`, `ARK.K`

### Category
- Must be one of: `STOCKS`, `BONDS`, `COMMODITIES`, `ALTERNATIVES`, `CUSTOM`
- Automatically converted to uppercase
- Default: `CUSTOM`

### Expense Ratio
- Must be a number between 0 and 1
- Maximum 4 decimal places
- Example: `0.0004` (0.04%), `0.03` (3%)

### Date Fields
- Must be in ISO format (YYYY-MM-DD or full ISO 8601)
- Inception date cannot be in the future
- Example: `2004-01-26`, `2025-11-17`

### Notes
- Maximum 500 characters
- Optional field
- Can be empty string

## Caching
- ETF validation results are cached for 24 hours
- ETF metadata is cached for 24 hours
- Cache is automatically cleared when ETFs are updated or removed

## Error Handling
All endpoints follow consistent error response format:
```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

## Rate Limiting
All endpoints are subject to rate limiting as configured in the application's rate limiting middleware.

## CORS
The API supports CORS requests from configured origins:
- `http://localhost:5173`
- `http://localhost:3000`
- `http://frontend:5173`
- `http://backend:3001`

## File Storage
Custom ETFs are stored locally in `/server/local_data/customETFs.json` in JSON format.

## External Data Integration
The API integrates with Yahoo Finance to:
- Validate ETF tickers
- Fetch ETF names and metadata
- Retrieve current price data for validation

## Examples

### Adding a new custom ETF
```bash
curl -X POST http://localhost:3001/api/etfs/custom \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "VGT",
    "category": "STOCKS",
    "expenseRatio": 0.0004,
    "notes": "Vanguard Information Technology ETF"
  }'
```

### Updating a custom ETF
```bash
curl -X PUT http://localhost:3001/api/etfs/custom/VGT \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Updated: Vanguard Information Technology ETF - Focus on tech sector"
  }'
```

### Getting all custom ETFs
```bash
curl http://localhost:3001/api/etfs/custom
```

### Deleting a custom ETF
```bash
curl -X DELETE http://localhost:3001/api/etfs/custom/VGT
```

### Validating an ETF ticker
```bash
curl http://localhost:3001/api/etfs/validate/VGT
```