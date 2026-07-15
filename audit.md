# Ang Hiyas V1 Security And Optimization Audit

Date: 2026-07-15

Scope: read-only project audit of the current workspace for v1 launch readiness. No application code, config, assets, dependencies, or docs were changed. This file is the only written artifact.

## Executive Verdict

The project has several strong foundations: preview-mode payment blocking exists on the backend, Stripe webhook verification is present, PayPal/Stripe frontend keys are no longer hard-coded into the bundle, auth cookies are `httpOnly` and production-secure, image uploads are constrained and converted, and the public/admin route split is broadly sensible.

However, I would not call this codebase fully shop-ready yet. There are still launch-blocking payment integrity risks, mainly around PayPal post-capture handling and lack of atomic/idempotent checkout state. Some risks are recoverable operationally, but they are exactly the kind of "paid but no clean order" edge cases that should be closed before accepting real customers.

## Audit Checks Performed

- `git status --short`: clean at the time of audit.
- JavaScript syntax check across source files excluding bundled/minified files: passed.
- `npm.cmd ls --depth=0`: dependency tree available.
- `npm.cmd audit --json`: completed after network approval; 1 high-severity dev/transitive vulnerability reported.
- Static review of:
  - server/app middleware
  - auth/user/admin routes
  - product/category/upload flows
  - checkout/payment/order/webhook flows
  - public payment scripts
  - key Pug views
  - models/utilities
  - env/secret hygiene indicators
  - asset and bundle sizes

Limitations: I did not run the live app, hit real provider dashboards, mutate the database, run payment flows, or perform browser QA. Final sandbox/live tests are still required.

## What Looks Good

- Backend preview switch exists and blocks checkout/payment routes while `SITE_PREVIEW=true`: `middleware/previewCheckoutDisabled.js`, `routes/orderRoutes.js`.
- Payment success pages are informational and poll order status instead of creating paid orders: `controllers/viewController.js:1926-1960`, `views/payment-success.pug`, `views/payment-success-guest.pug`.
- Stripe webhook uses raw body before JSON parsing and verifies the Stripe signature: `app.js:204-207`, `controllers/webhookController.js:88-112`.
- Stripe webhook duplicate handling checks existing transactions by `payment_intent`: `controllers/webhookController.js:142-151`.
- Stripe paid-order failure alerts exist for webhook failures after payment: `controllers/webhookController.js:821-840`.
- PayPal frontend checks create/capture response status before redirecting: `public/js/paypal.js`.
- Auth cookies are `httpOnly`, `sameSite=lax`, and `secure` in production: `controllers/authController.js:35-44`, `controllers/authController.js:177-185`.
- Login, signup, password reset, and general API rate limiters exist: `app.js:290-352`.
- Helmet security headers and a CSP are present: `app.js:104-187`.
- Uploads use memory storage, a 10 MB per-file limit, image-only filtering, and Sharp conversion to WebP: `controllers/productController.js:46-68`, `controllers/productController.js:89-190`.
- Admin routes are protected and role-restricted: `routes/adminRoutes.js:13-18`.

## P0 Launch Blockers

### P0-1 PayPal Still Has No Durable Server-Side Checkout Snapshot

Evidence:
- PayPal create-order validates the current product/cart and returns only `order.result.id`: `controllers/orderController.js:165-299`, `controllers/orderController.js:314-442`.
- PayPal capture still accepts mutable browser-submitted checkout context after approval: `controllers/orderController.js:463-474`.
- Cart capture rebuilds the order from the current user cart after PayPal has already captured: `controllers/orderController.js:647-731`.
- Buy-now/guest capture rebuilds from `product`, `qty`, `variant`, and `fulfilmentMethod` submitted by the browser after capture: `controllers/orderController.js:809-873`.

Risk:
- The PayPal order ID is not tied to a stored checkout intention before capture.
- Cart/product/quantity/variant/fulfilment changes between create-order and capture can result in payment being captured and then rejected or converted incorrectly.
- This does not yet meet the hardening target described in `docs/paypal-hardening.md`.

Launch requirement:
- Add/use a pending PayPal checkout snapshot keyed by PayPal order ID, and have capture load that snapshot instead of trusting current cart/body data.

### P0-2 PayPal Can Capture Money And Then Return Normal Errors Without Support Alert

Evidence:
- PayPal capture happens at `controllers/orderController.js:537-543`.
- After capture, several validations can return `next(new AppError(...))` directly rather than entering the paid-order failure alert path:
  - incomplete PayPal shipping address: `controllers/orderController.js:601-605`
  - cart item/product/variant/price issues: `controllers/orderController.js:651-701`
  - PayPal amount mismatch for cart: `controllers/orderController.js:729-734`
  - buy-now product/variant/stock/amount issues: `controllers/orderController.js:816-873`

Risk:
- In these cases PayPal may already have captured funds, but the app can respond as a normal 400/404/500 error without creating an order and without sending the PayPal captured-payment failure alert.
- This is a customer-support and trust risk: customer paid, no order, no guaranteed internal alert.

Launch requirement:
- Anything after a completed PayPal capture must either create/link a recoverable order record or send the PayPal failure alert and return a careful customer message. Do not use ordinary validation exits after capture.

### P0-3 Paid Order Processing Is Not Atomic

Evidence:
- Stripe webhook decrements stock before order/transaction/user updates complete: `controllers/webhookController.js:420-493`, `controllers/webhookController.js:677-740`.
- PayPal decrements stock before order creation for cart and buy-now: `controllers/orderController.js:738-766`, `controllers/orderController.js:879-917`.
- Transactions are created after orders and stock changes: `controllers/orderController.js:980-994`, `controllers/webhookController.js:466-481`, `controllers/webhookController.js:742-754`.
- No Mongoose session/transaction is used around stock, order, transaction, guest address, and cart clear operations.

Risk:
- A failure after stock decrement can leave stock reduced without a complete order.
- A failure after order creation but before transaction creation can leave a paid order without a transaction.
- Concurrent retries can pass duplicate checks before the transaction exists, especially around webhooks/retries.

Launch requirement:
- Use MongoDB transactions if supported, or introduce durable processing states/idempotency records so partial paid states are recoverable and duplicate-safe.

### P0-4 Final Launch Must Prove Stripe/PayPal Idempotency Under Concurrency

Evidence:
- Duplicate handling depends mostly on finding an existing transaction by provider ID before processing: `controllers/webhookController.js:142-151`, `controllers/orderController.js:613-635`.
- The transaction is created late in the processing sequence.

Risk:
- Two near-simultaneous webhook/capture retries can both pass the initial "no transaction yet" check. The unique `transactionId` index helps, but only after order/stock side effects may already have happened.

Launch requirement:
- Break-test concurrent duplicate webhook/capture/retry scenarios, not just sequential duplicate clicks.

## P1 Serious Before Launch

### P1-1 Startup Checks Do Not Protect Live Payment Configuration

Evidence:
- `server.js` only requires core env vars: `server.js:14-23`.
- Stripe secret is required at module load, but publishable key, webhook secret, PayPal mode/client/secret, and key-mode consistency are not validated centrally before `SITE_PREVIEW=false`.
- PayPal credentials are checked only when the PayPal utility is called: `utilities/paypalUtility.js:11-25`.

Risk:
- The app can start with `SITE_PREVIEW=false` and missing/mismatched live payment variables, leading to customer-facing checkout failure.

Required before launch:
- Startup should refuse `SITE_PREVIEW=false` unless Stripe secret, Stripe publishable key, Stripe webhook secret, PayPal client ID, PayPal secret, PayPal mode, provider modes, and key prefixes are valid and consistent.

### P1-2 Stripe Can Capture Payment But Fail Order Creation If Prices/Discounts Change Before Webhook

Evidence:
- Stripe checkout session metadata stores product/cart identifiers, but webhook recalculates current product prices/discounts later: `controllers/orderController.js:1328-1337`, `controllers/orderController.js:1749-1779`, `controllers/webhookController.js:328-408`, `controllers/webhookController.js:590-664`.
- The webhook rejects paid sessions if the recalculated current total does not match Stripe amount.

Risk:
- If a price, discount, category discount, stock, or product state changes between checkout session creation and webhook processing, payment may be captured but order conversion fails. There is a support alert, which is good, but this is still not clean shop behavior.

Recommendation:
- Store a server-side Stripe checkout snapshot or make webhook order creation use the trusted session/line-item amount created at checkout time, with clear fraud checks.

### P1-3 Stripe Shipping Collection Can Diverge From Site Shipping Metadata

Evidence:
- Stripe sessions enable `shipping_address_collection` for delivery: `controllers/orderController.js:1308-1312`, `controllers/orderController.js:1492-1496`, `controllers/orderController.js:1732-1736`.
- The webhook creates the order from app metadata address, not Stripe `shipping_details`: `controllers/webhookController.js:218-229`.

Risk:
- If a customer edits shipping address in Stripe Checkout, the website order may store the earlier site address instead.

Recommendation:
- Either do not collect shipping again in Stripe, or use/compare Stripe `shipping_details` deliberately.

### P1-4 PayPal Shipping Address Mapping Is Incorrect/Messy

Evidence:
- PayPal address mapping uses `address_line_2 || address_line_1` for `street`, and `address_line_1 || admin_area_2` for `city`: `controllers/orderController.js:589-596`.

Risk:
- Delivery orders can store street/city incorrectly, causing fulfilment mistakes.

Recommendation:
- Map PayPal line 1/line 2/city/state/postcode cleanly into the app address shape and test admin/customer display.

### P1-5 Admin Cannot Reliably Update Pickup Orders

Evidence:
- Pickup admin page serializes `{}` as shipping address data: `views/admin/be_order-page.pug`.
- Order update always requires `address.street`, `address.city`, and `address.postcode`: `controllers/orderController.js:1936-1963`.

Risk:
- Admin status/transaction updates for local pickup orders can fail because pickup orders intentionally have no delivery address.

Recommendation:
- Allow pickup order updates without delivery address validation.

### P1-6 Guest Order Page Has No Access Token Or Verification

Evidence:
- Public guest route is `/guest-order-number/:orderId`: `routes/viewRoutes.js:103-106`.
- It loads by raw order ObjectId through `GuestAddress.findOne({ order: orderId })`: `controllers/viewController.js:2020-2071`.

Risk:
- MongoDB ObjectIds are hard to guess but not an access-control mechanism. Anyone with the URL can view guest order details.

Recommendation:
- Use a random guest access token, signed link, or email/postcode verification for guest order pages.

### P1-7 Customer Reviews Are Not Server-Verified Against Purchases

Evidence:
- Frontend computes `hasPurchased`, but API create review only requires logged-in user and product ID: `controllers/viewController.js:1062-1074`, `controllers/reviewController.js:20-37`.
- Review route allows any logged-in user to create a review for a product route: `routes/reviewRoutes.js:10-18`.

Risk:
- A logged-in user can post a review for a product they did not buy by calling the API directly.

Recommendation:
- Enforce verified purchase server-side before creating a review.

### P1-8 Sensitive Local Configuration Exists In The Workspace

Evidence:
- `config.env` exists locally and contains real-looking credentials/secrets. Values are not repeated here.
- `.gitignore` ignores `*.env`: `.gitignore:2`.
- `git ls-files config.env` returned no tracked file.

Risk:
- Not currently tracked, but local secret files are easy to expose through screenshots, manual upload, zip deploys, chat, or backups.

Recommendation:
- Rotate any secrets that have been exposed in chat/screenshots. Keep live secrets only in Render/provider dashboards. Keep local test secrets minimal.

### P1-9 PayPal Capture Response Returns Full Order And Transaction Objects

Evidence:
- PayPal capture response returns `order` and `transaction` objects in addition to `orderUrl`: `controllers/orderController.js:1110-1115`.

Risk:
- This exposes more data than the browser needs and can accidentally leak populated user/order details if model population changes.

Recommendation:
- Return only `success` and `orderUrl` unless the browser truly needs more.

## P2 Important Hardening

### P2-1 CSRF Protection Is Baseline Only

Evidence:
- Cross-origin authenticated writes are rejected only when an `Origin` header exists: `app.js:251-269`.
- Missing `Origin` is allowed: `app.js:260-262`.

Risk:
- `sameSite=lax` helps, but admin/account write routes still do not have real CSRF tokens.

Recommendation:
- Add token-based CSRF protection for authenticated write actions, especially admin writes.

### P2-2 Production Logging Is Too Noisy And Sometimes Too Detailed

Evidence:
- `morgan('dev')` always runs: `app.js:225-227`.
- Every request logs an API timestamp: `app.js:277-284`.
- Payment catch blocks log stacks/provider errors: `controllers/orderController.js:772-774`, `controllers/orderController.js:938-940`, `controllers/orderController.js:1523-1526`, `controllers\webhookController.js`.

Risk:
- Production logs can become noisy and may include customer/payment context. This is avoidable operational risk.

Recommendation:
- Use production-appropriate logging and avoid full provider/error object dumps unless sanitized.

### P2-3 Dependency Posture Needs Cleanup

Evidence:
- `npm audit` reports 1 high-severity transitive dev vulnerability in `picomatch@2.3.1`, via `nodemon -> chokidar -> anymatch/readdirp`.
- Package-lock marks deprecated packages:
  - `@babel/polyfill`: `package-lock.json:76-80`
  - `@paypal/checkout-server-sdk`: `package-lock.json:940-944`
  - `core-js@<3.23.3`: `package-lock.json:1499`
  - `xss-clean`: `package-lock.json:3645-3649`
- Direct dependencies include those deprecated packages: `package.json:17-18`, `package.json:41`.

Risk:
- The audit issue is dev-only, but launch projects should have a clean dependency story. Deprecated PayPal and XSS libraries are especially relevant for future maintenance.

Recommendation:
- Update/remove deprecated packages in a controlled dependency pass. Do not run `npm audit fix` blindly.

### P2-4 No Automated Test Suite

Evidence:
- `package.json` test script intentionally fails: `package.json:7`.

Risk:
- For a payment-enabled shop, there is no regression safety net for auth, admin, checkout, webhooks, stock, and emails.

Recommendation:
- At minimum add focused integration tests for checkout totals, PayPal capture idempotency, Stripe webhook duplicate handling, auth/role guards, and admin order updates.

### P2-5 Non-Variant Products Have No Stock Control

Evidence:
- Stock decrement returns immediately if product has no variants or no variant ID: `controllers/orderController.js:115-151`, `controllers/webhookController.js:34-67`.
- Bag/accessory base models do not define stock fields.

Risk:
- Bags/accessories can be oversold if they are limited stock.

Recommendation:
- Add stock handling for non-variant products or mark them enquiry-only if stock cannot be controlled.

### P2-6 Static Asset Caching Is Disabled

Evidence:
- Production static cache block is commented out: `app.js:80-85`.

Risk:
- Repeat visits and product browsing will be slower than necessary.

Recommendation:
- Re-enable production-safe caching with deliberate cache-busting for CSS/JS/assets.

### P2-7 Bundle And Icon Imports Are Heavy

Evidence:
- `public/js/bundle.js` is about 582 KB.
- `public/js/index.js` imports all Lucide icons: `public/js/index.js:34-39`.
- `@babel/polyfill` is imported globally: `public/js/index.js:1`.

Risk:
- Larger initial JS hurts performance, especially mobile.

Recommendation:
- Import only used icons and replace deprecated/global polyfill strategy.

### P2-8 Large Images Need A Launch Performance Pass

Evidence:
- Several local product image files are very large, including PNGs around 5.9 MB and multiple 1 MB+ assets.
- Favicon image is over 1 MB.

Risk:
- Large assets can hurt mobile load time and Lighthouse performance.

Recommendation:
- Compress/resize large product and favicon assets, and confirm rendered dimensions match served sizes.

### P2-9 JSON-LD Inline Scripts May Conflict With CSP

Evidence:
- CSP requires nonces/hashes for scripts: `app.js:126-134`.
- Base template emits JSON-LD scripts without nonce: `views/base.pug:77-79`, `views/base.pug:174-175`.

Risk:
- Browsers may report CSP violations for structured data scripts, and tooling may show noise.

Recommendation:
- Add nonce to JSON-LD script tags or verify current browser behavior and Search Console parsing.

### P2-10 Product/SEO Placeholder Text Remains

Evidence:
- Shoe page uses placeholder title/description: `controllers/viewController.js:695-696`.
- Categories pages still use "Template Website" / generic descriptions: `controllers/viewController.js:1114-1157`.

Risk:
- Not a security blocker, but it weakens launch quality and SEO polish.

Recommendation:
- Replace all remaining template/generic metadata before v1.

### P2-11 Product Slugs Can Collide More Easily For Some Models

Evidence:
- Barong slug includes product SKU: `models/specProdModel.js:204-207`.
- Bag/accessory/shoe slugs are only `slugify(name)`: `models/bagModel.js`, `models/accessoryModel.js`, `models/shoeModel.js`.

Risk:
- Duplicate product names can fail creation/update through unique slug collisions.

Recommendation:
- Use a consistent name-plus-SKU slug strategy across product models.

### P2-12 Public API Pagination Limit Is User-Controlled

Evidence:
- API limit defaults to 100 but is not capped: `utilities/apiFeatures.js:70-76`.

Risk:
- A caller can request large result sets if data grows.

Recommendation:
- Cap public `limit` to a sane maximum.

### P2-13 Admin Order Status Can Diverge From Provider Reality

Evidence:
- Admin updates order status and transaction status directly: `controllers/orderController.js:1930-2007`.

Risk:
- Admin can mark transaction `Refunded`/`Failed` in the app without provider-side refund/dispute action.

Recommendation:
- Document this clearly for v1, or separate operational status from provider payment status.

## P3 Future Quality / Maintainability

- `docs/` is ignored in git: `.gitignore:4`. That may be deliberate, but it means launch docs are not version-controlled unless stored elsewhere.
- `stripe.exe` is ignored but present locally. Keep it out of deploy artifacts.
- `Order` pre-find auto-populates user and products on every find: `models/orderModel.js`. This is convenient but can become slow and surprising as order volume grows.
- Product links in order pages appear model-specific/hard-coded in places, which can break for bags/accessories/shoes.
- Admin/account passwords only require 8 characters. Consider stronger admin password policy and/or 2FA for future releases.
- Enquiry spam controls are basic honeypot/phrase checks plus global API rate limiting. Consider route-specific enquiry limits if spam appears.

## Required Final Test Matrix Before Launch

Do not set `SITE_PREVIEW=false` until these pass:

- Stripe card success, decline, cancel, duplicate webhook/retry.
- Stripe Afterpay/Clearpay success/cancel/ineligible flows if enabled.
- Stripe paid webhook failure simulation confirms support alert and no silent paid-without-order state.
- PayPal success for logged-in cart, logged-in buy-now, guest buy-now.
- PayPal failed/cancelled approval creates no order.
- PayPal duplicate capture/retry creates no duplicate order or stock decrement.
- PayPal product/quantity/variant/cart/fulfilment tampering after create-order does not leave paid-without-alert.
- PayPal shipping missing/malformed test does not leave paid-without-alert.
- Stock update after successful payment only.
- Cart clear after successful order conversion only.
- Guest order link works and does not expose unrelated orders.
- Admin order page works for delivery and pickup.
- Customer/internal order emails arrive correctly.
- Emergency rollback by `SITE_PREVIEW=true` blocks frontend and backend payment routes.

## Bottom Line

The codebase is close enough that this is now a launch-readiness hardening problem, not a rebuild. But the current workspace still has payment edge cases I would classify as launch blockers. The highest-priority fixes are PayPal snapshot/idempotency, post-capture failure handling, and atomic/recoverable paid-order processing.

After those are fixed and the final payment matrix passes, the remaining work is mostly operational polish: dependency cleanup, production logging, static caching, image optimization, SEO placeholders, and test coverage.
