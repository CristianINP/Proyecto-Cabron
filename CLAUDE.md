# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Frontend (React)
npm start          # Dev server on http://localhost:3000
npm run build      # Production build
npm test           # Run tests

# Backend proxy (must run alongside frontend for recipe generation)
cd Api && npm start   # Express server on http://localhost:3001
```

Both servers must run simultaneously for recipe generation to work — the React app calls `http://localhost:3001/openai` which proxies to OpenAI.

## Architecture

**Ready-To-Cook** is a React SPA for food inventory management and AI recipe generation. Firebase handles auth and data; an Express proxy in `Api/` forwards recipe requests to OpenAI GPT-4o-mini.

### Routing

There is no React Router. Navigation is view-based state in [src/App.js](src/App.js): a `currentView` string controls which component renders. Components call `setCurrentView('...')` to navigate. Valid views: `login`, `register`, `recovery`, `menu`, `inventory`, `register-ingredient`, `generate-recipe`, `recipe-results`, `recipe-detail`, `pending-dishes`.

Recipe data (`generatedRecipes`, `selectedRecipe`, `currentRecipeIndex`) is lifted to App.js and passed as props — there is no Context or Redux.

### Services

- [src/services/firebase.js](src/services/firebase.js) — Initializes Firebase; exports `auth` and `db` (Firestore). All components import directly from here.
- [src/services/openaiService.js](src/services/openaiService.js) — `generateRecipe()` builds the OpenAI prompt, enforces a JSON schema response, sanitizes the result (handles typographic quotes, invalid JSON chars), and applies retry logic with exponential backoff. Also exports `calculateDishShelfLife()`.
- [src/services/foodDatabase.js](src/services/foodDatabase.js) — Hardcoded shelf-life database (~90 foods, both `completo` and `fraccionado` variants). Key exports: `searchFoodComplete()` searches both the global DB and the user's personal Firestore collection; `calculateExpirationDateComplete()` computes expiry dates.

### Utils

- [src/utils/recipeHelpers.js](src/utils/recipeHelpers.js) — `normalizeOpenAIResponse()` validates recipe JSON shape; `retryOperation()` wraps async calls with exponential backoff; `cleanText()` coerces `null`/`"null"` values to empty strings.
- [src/utils/dateCalculations.js](src/utils/dateCalculations.js) — Date helpers for expiration display.
- [src/utils/Modal.js](src/utils/Modal.js) — Shared modal component.

### Key Data Flows

**Adding an ingredient**: `RegisterIngredient.js` → `searchFoodComplete()` for autocomplete → saves to Firestore user subcollection with computed expiry date.

**Generating a recipe**: `GenerateRecipe.js` → `openaiService.generateRecipe()` → proxy at `Api/index.js` → OpenAI → JSON sanitized/validated → results passed via App.js state to `RecipeResults.js`.

**Personal food DB**: Each user has a Firestore subcollection for custom foods with their own shelf-life data. `searchFoodComplete()` merges global and personal results.

### Styling

Tailwind CSS with a custom food theme in [tailwind.config.js](tailwind.config.js). Custom color families: `food` (orange/brown), `fresh` (green), `tomato` (red), `cream` (warm neutrals). Georgia serif is the primary font. Custom scrollbar and SVG background patterns are defined in [src/index.css](src/index.css).

### Environment Variables

| File | Variables |
|------|-----------|
| `.env` (root) | `REACT_APP_FIREBASE_*` keys |
| `Api/.env` | `OPENAI_API_KEY` |
