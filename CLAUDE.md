# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Frontend (React)
npm start          # Dev server on http://localhost:3000
npm run build      # Production build
npm test           # Run tests
npm test -- --testPathPattern=<file>  # Run a single test file

# Backend proxy (must run alongside frontend for recipe generation)
cd Api && npm start   # Express server on http://localhost:3001
```

Both servers must run simultaneously for recipe generation to work — the React app calls `http://localhost:3001/openai` which proxies to OpenAI.

## Architecture

**Ready-To-Cook** is a React SPA for food inventory management and AI recipe generation. Firebase handles auth and data; an Express proxy in `Api/` forwards recipe requests to OpenAI GPT-4o-mini.

### Routing

There is no React Router. Navigation is view-based state in [src/App.js](src/App.js): a `currentView` string controls which component renders. Components call `setCurrentView('...')` to navigate. Valid views: `login`, `register`, `recovery`, `menu`, `inventory`, `register-ingredient`, `generate-recipe`, `recipe-results`, `recipe-detail`, `pending-dishes`.

Recipe data (`generatedRecipes`, `selectedRecipe`, `currentRecipeIndex`) is lifted to App.js and passed as props — there is no Context or Redux.

**Auth navigation guards**: App.js holds two refs — `registrationInProgress` and `loginInProgress` — that block `onAuthStateChanged` from automatically redirecting to `menu` while an auth flow is in progress. The auth callback navigates only after the flow's own modal/callback fires. Login and Register each receive two callbacks: `onLoginComplete`/`onRegistrationComplete` (sets ref to `true` before showing the success modal) and `onLoginReset`/`onRegistrationReset` (sets ref back to `false` when the modal is dismissed without navigating, e.g. via the X button). Both must be called in `closeModal` to avoid the user being stuck authenticated but on the login screen.

### Firestore Data Model

Each authenticated user has these subcollections under `users/{userId}/`:

| Subcollection | Fields | Notes |
|---|---|---|
| `ingredients` | `name`, `quantity`, `unit`, `purchaseDate`, `expirationDate`, `isFractioned` | Inventory items. `isFractioned` = quantity < 1. |
| `pendingDishes` | `name`, `ingredients[]`, `instructions[]`, `expirationDate` | Saved recipes to finish later. Shelf life set by GPT-4o-mini. |
| `personalFoods` | `name`, `completo`, `fraccionado`, `category` | User's custom food DB entries matching global `foodDatabase` schema. |

### Services

- [src/services/firebase.js](src/services/firebase.js) — Initializes Firebase; exports `auth` and `db` (Firestore). All components import directly from here.
- [src/services/openaiService.js](src/services/openaiService.js) — `generateRecipe()` builds the OpenAI prompt, enforces a `json_schema` response format (structured output), sanitizes the result (handles typographic quotes, invalid JSON chars), and applies retry logic with exponential backoff. Temperature is 0.5 for new recipes and 0.7 for regeneration. `calculateDishShelfLife()` calls GPT-4o-mini to get refrigeration days for a pending dish (falls back to 3 days on error).
- [src/services/foodDatabase.js](src/services/foodDatabase.js) — Hardcoded shelf-life database (~90 foods, both `completo` and `fraccionado` days). Key exports: `getFoodSuggestionsComplete(query, userId)` for autocomplete (merges global + personal DB); `calculateExpirationDateComplete(name, unit, purchaseDate, userId)` computes expiry; `addToPersonalFoodDatabase(userId, name, shelfLifeDays)` saves a new custom food; `searchFood(name)` returns the best global DB match (used internally when recalculating expiry after fractioning).

### Components

- [src/components/Recipes/RecipeResults.js](src/components/Recipes/RecipeResults.js) — Renders the generated recipe card with carousel navigation (`currentIndex`/`setCurrentIndex`). Handles the "regenerate" flow by calling `generateRecipe()` again with `regenerate: true` and the list of already-used recipe names. Navigates to `recipe-detail` by setting `selectedRecipe` in App.js state.

### Utils

- [src/utils/recipeHelpers.js](src/utils/recipeHelpers.js) — `normalizeOpenAIResponse()` validates and normalizes recipe JSON shape; `retryOperation()` wraps async calls with exponential backoff; `cleanText()` coerces `null`/`"null"` to empty strings; `formatQuantity()` / `parseSafeQuantity()` / `isNumeric()` handle safe numeric display (avoid NaN in UI).
- [src/utils/dateCalculations.js](src/utils/dateCalculations.js) — `isPriority()` (≤3 days), `isExpired()`, `getDaysRemaining()`, `formatDate()`, `toISODateString()`, `getTodayISO()`.
- [src/utils/Modal.js](src/utils/Modal.js) — Shared modal component used by all views; supports `type`: `confirm`, `success`, `error`.

### Key Data Flows

**Adding an ingredient**: `RegisterIngredient.js` → `getFoodSuggestionsComplete()` for autocomplete → `calculateExpirationDateComplete()` for expiry → saves to Firestore `users/{userId}/ingredients`. Dates are normalized to 12:00 PM local time to avoid UTC offset issues.

**Generating a recipe**: `GenerateRecipe.js` → `openaiService.generateRecipe()` → proxy at `Api/index.js` → OpenAI (structured `json_schema` output) → JSON sanitized/validated → results passed via App.js state to `RecipeResults.js`. Available categories: `Snack`, `Postre`, `Saludable`, `Rápida`, `Internacional`, `Mexicana`, `Vegana`, `Vegetariana`, `Alta en proteína`.

**Completing a recipe** (`RecipeDetail.js`): decrements ingredient quantities in Firestore; deletes if quantity ≤ 0; if a `Piezas` ingredient transitions from whole to fractional (`isFractioned = true`), recalculates expiry using the `fraccionado` days from `foodDatabase`. Also removes any pending dishes consumed by the recipe.

**Saving as pending dish**: `RecipeDetail.js` → calls `calculateDishShelfLife(ingredients)` via GPT-4o-mini → saves to Firestore `users/{userId}/pendingDishes` with an expiration date.

**Personal food DB**: Each user has a Firestore subcollection for custom foods with their own shelf-life data. `getFoodSuggestionsComplete()` merges global and personal results.

### Proxy Error Strategy

`Api/index.js` passes OpenAI's actual HTTP status through (`res.status(response.status)`). This lets the frontend's `retryOperation()` distinguish 429 (rate-limit, retry), 5xx (server error, retry), and 400/other (don't retry). Network-level failures from the proxy return 503.

### Styling

Tailwind CSS with a custom food theme in [tailwind.config.js](tailwind.config.js). Custom color families: `food` (orange/brown), `fresh` (green), `tomato` (red), `cream` (warm neutrals). `font-cooking` maps to Georgia serif. Custom animations: `bounce-food`, `pulse-fresh`, `wiggle`. Icons are from `lucide-react`.

Component-level utility classes are defined with `@layer` in [src/index.css](src/index.css):

| Class | Purpose |
|---|---|
| `card-food` | White card with depth shadow |
| `btn-food` | Primary CTA button (orange outline → filled on hover) |
| `input-food` | Styled text input with orange focus ring |
| `table-food` | Table with warm header and hover rows |
| `badge-fresh` | Green pill for non-expiring items |
| `badge-priority` | Red pill for near-expiry items |
| `badge-expired` | Dark red pill for expired items |
| `fresh-glow` | Green box-shadow glow |
| `warning-glow` | Red box-shadow glow for near-expiry |
| `expired-glow` | Darker red glow for expired items |
| `bg-food-pattern` | SVG star crosshatch background |
| `bg-kitchen` | Gradient kitchen background |
| `border-cooking` | Orange dashed double-border effect |

### Environment Variables

| File | Variables |
|------|-----------|
| `.env` (root) | `REACT_APP_FIREBASE_*` keys |
| `Api/.env` | `OPENAI_API_KEY` |
