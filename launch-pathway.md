# V1 Launch Pathway

Date: 2026-07-15

Purpose: this is the practical working order for finishing v1 launch readiness. The full audit remains in `audit.md`; this file is the shorter step-by-step pathway to work through without constantly re-reading the whole audit.

## Core V1 Rule

Every successful payment must result in either:

- one saved order, or
- one support recovery alert with enough detail to manually fulfil or refund.

There must be:

- no silent paid failures
- no duplicate orders from retries
- no double stock reduction
- no cart clearing before a clean order path

## Step 1: PayPal Post-Capture Recovery

Goal: once PayPal captures money, every later failure must go through the recovery/support-alert path.

Check/fix:

- missing or incomplete shipping address after capture
- cart changed after PayPal order creation
- product unavailable after capture
- variant unavailable after capture
- stock unavailable after capture
- amount mismatch after capture
- order save failure
- transaction save failure
- guest address save failure
- customer/internal email failure handling

Pass condition:

- PayPal captured payment always creates either a saved order or a support alert.

## Step 2: PayPal Duplicate And Retry Protection

Goal: the same PayPal order/capture must not create duplicate side effects.

Check/fix:

- duplicate capture request
- double-click capture button
- browser retry
- network retry
- same PayPal transaction submitted again

Pass condition:

- one order maximum
- one stock reduction maximum
- one transaction maximum
- safe response if already processed

## Step 3: PayPal Server-Side Validation

Goal: the backend remains the authority for checkout validity.

Check/fix:

- product/cart validity
- quantity validity
- variant validity
- fulfilment method validity
- delivery versus pickup rules
- expected total
- currency
- stock availability
- amount comparison against PayPal capture

Pass condition:

- the browser can help identify checkout intent, but the backend validates every important payment/order value.

## Step 4: Stripe Paid-Order Failure Recovery

Goal: if Stripe payment succeeds but order creation fails, support gets a recovery alert.

Check/fix:

- paid webhook order-save failure
- paid webhook transaction-save failure
- paid webhook stock failure
- guest address failure
- email failure behaviour
- alert contains enough detail to recover manually

Pass condition:

- Stripe paid failure never disappears silently.

## Step 5: Stripe Duplicate Webhook Protection

Goal: duplicate Stripe webhooks do not create duplicate side effects.

Check/fix:

- duplicate `checkout.session.completed`
- webhook retry
- same payment intent processed twice
- stock reduction timing
- transaction uniqueness

Pass condition:

- one order maximum
- one transaction maximum
- one stock reduction maximum

## Step 6: Shared Order Consistency

Goal: all payment routes leave the database in a consistent owner-usable state.

Check/fix:

- order saved
- transaction saved
- stock reduced once
- cart cleared only after successful order conversion
- guest address saved where needed
- customer email sent
- internal email sent
- payment success page can find the order

Pass condition:

- owner can fulfil the order from admin without needing provider dashboards for normal cases.

## Step 7: Admin Fulfilment Workflow

Goal: the owner and family can operate the shop manually after launch.

Check/fix:

- delivery order display
- pickup order display
- admin update for delivery orders
- admin update for pickup orders
- transaction status display
- fulfilment status display
- product links from order pages
- customer notes/address display

Pass condition:

- a real order can be received, understood, updated, and fulfilled from admin.

## Step 8: Guest And Customer Order Access

Goal: customers can reach the correct order information without exposing more than necessary.

Check/fix:

- logged-in order page
- guest order page
- guest order privacy risk
- payment success page polling
- cancelled payment page
- failed payment behaviour

Pass condition:

- customers can see their own result, and guest access risk is either fixed or consciously accepted for v1.

## Step 9: Live Config And Rollback

Goal: the app cannot accidentally launch with broken payment configuration, and preview rollback works.

Check/fix:

- live Stripe secret key
- live Stripe publishable key
- Stripe webhook secret
- live PayPal client ID
- live PayPal secret
- PayPal mode
- provider mode consistency
- `SITE_PREVIEW=true` blocks frontend checkout
- `SITE_PREVIEW=true` blocks backend payment routes

Pass condition:

- live mode has the right keys, and emergency preview rollback is proven.

## Step 10: Security Polish

Goal: reduce avoidable launch risk after money safety is handled.

Check/fix:

- sensitive local config handling
- production logging
- CSRF decision for admin/account writes
- review purchase verification
- PayPal response data minimisation
- guest order access decision

Pass condition:

- remaining risks are understood and acceptable for v1.

## Step 11: Performance And Launch Polish

Goal: make the public shop feel ready and avoid obvious performance problems.

Check/fix:

- large image compression
- favicon size
- static asset caching
- bundle/import cleanup
- deprecated dependency cleanup
- SEO placeholder text
- category/product metadata

Pass condition:

- the shop is fast enough, polished enough, and does not show obvious template leftovers.

## Step 12: Final Break-It Test

Goal: deliberately try to break the launch-critical flows.

Test:

- Stripe success
- Stripe decline
- Stripe cancel
- Stripe duplicate webhook
- PayPal logged-in cart success
- PayPal logged-in buy-now success
- PayPal guest buy-now success
- PayPal cancel/failure
- duplicate PayPal capture
- cart changed after PayPal create-order
- quantity changed after PayPal create-order
- stock changed after PayPal create-order
- malformed shipping
- pickup checkout
- delivery checkout
- admin delivery update
- admin pickup update
- guest order page
- customer order page
- customer/internal emails
- preview rollback

Pass condition:

- every test either succeeds cleanly or fails safely with no silent paid-order problem.

## Working Priority Summary

1. PayPal post-capture recovery
2. PayPal duplicate/retry protection
3. PayPal server-side validation
4. Stripe paid-order recovery
5. Stripe duplicate webhook protection
6. Shared order consistency
7. Admin fulfilment workflow
8. Guest/customer access
9. Live config and rollback
10. Security polish
11. Performance and launch polish
12. Final break-it test

