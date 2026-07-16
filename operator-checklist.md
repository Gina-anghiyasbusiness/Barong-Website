# Ang Hiyas V1 Operator Checklist

Date: 2026-07-16

Purpose: day-to-day reference for operating Ang Hiyas V1 while the site is public, during payment go-live, and after real orders start arriving.

## Current Operating Mode

- The public website may be deployed and visible before payments are live.
- If `SITE_PREVIEW=true`, checkout/payment should be blocked by the site.
- Live payment testing should happen only after final break testing is complete.
- If anything payment-related looks wrong after go-live, switch back to `SITE_PREVIEW=true` and restart/redeploy the Render service.

## Daily Preview-Site Checks

Check these while payments are still blocked:

- Home page loads.
- Product list pages load.
- Product detail pages load.
- Static pages load: sales, services, custom, rentals, contact, about.
- Login page loads.
- Reset-password page loads.
- Admin login works.
- Admin order pages still load.
- Render logs show safe request lines such as `GET /...` and `POST /...`.
- Checkout buttons do not allow payment while `SITE_PREVIEW=true`.

## Before Payment Go-Live

Confirm these before setting `SITE_PREVIEW=false`:

- Product names are final enough for launch.
- Product prices are correct.
- Discounts are correct.
- Categories are correct.
- Product images display correctly.
- Stock counts are correct for variant products.
- Pickup wording is clear.
- Delivery wording is clear.
- Contact details are correct.
- Customer email sending works.
- Internal alert email sending works.
- Recovery alert email recipient is monitored.
- Render environment values are present.
- `SITE_URL` and `CANONICAL_URL` use the live website URL and end with `/`.
- `SITE_PREVIEW=true` still blocks frontend and backend payments.
- Final `npm run build` has been run before deploy.

## First Real Order Checklist

When a new paid order arrives:

- Confirm the customer received an order confirmation email.
- Confirm the internal order email arrived.
- Open the order in admin.
- Check order number.
- Check customer name and email.
- Check fulfilment method: delivery or pickup.
- For delivery, check street, city, state and postcode.
- For pickup, confirm there is no missing-address problem.
- Check purchased product names.
- Check sizes/variants.
- Check quantity.
- Check order total.
- Check transaction status.
- Check provider reference in the transaction record.
- Check stock reduced once only.
- If it was a cart checkout, confirm the cart cleared after success.

## Stripe Order Checks

For Stripe orders:

- Check the order exists in admin.
- Check the transaction exists in admin.
- Check the Stripe Dashboard payment exists.
- Compare the Stripe payment amount with the order total.
- Confirm the order is not duplicated.
- Confirm stock was reduced once.
- Confirm customer and internal emails arrived.

## PayPal Order Checks

For PayPal orders:

- Check the order exists in admin.
- Check the transaction exists in admin.
- Check the PayPal Dashboard capture exists.
- Compare the PayPal capture amount with the order total.
- Confirm the order is not duplicated.
- Confirm stock was reduced once.
- Confirm customer and internal emails arrived.

## Delivery Fulfilment

For delivery orders:

- Confirm payment status is paid/completed before fulfilment.
- Confirm delivery address is complete.
- Confirm ordered items and sizes.
- Pack the correct items.
- Add or record tracking details if available.
- Update the admin order status as the order moves forward.
- Keep provider payment status separate from fulfilment progress.

## Pickup Fulfilment

For pickup orders:

- Confirm payment status is paid/completed before fulfilment.
- Confirm the order is marked as pickup.
- Confirm ordered items and sizes.
- Prepare the order for collection.
- Contact the customer with pickup details if needed.
- Update the admin order status as the order moves forward.
- Do not treat missing delivery address as an error for pickup.

## Recovery Alert Procedure

If a recovery alert email arrives:

- Treat it as urgent.
- Do not ignore it because it may mean the customer paid but the normal order path failed.
- Open the provider dashboard first: Stripe or PayPal.
- Confirm whether money was actually captured.
- Search admin for the order.
- Search admin for the transaction.
- Check whether stock changed.
- Check customer email/details from the alert.
- If payment succeeded and no clean order exists, manually create a support record or fulfilment note before doing anything else.
- Decide whether to manually fulfil or refund.
- Contact the customer if needed.
- Do not retry random actions in the browser until the payment state is understood.

## Duplicate Payment Warning Signs

Investigate immediately if you see:

- Two orders with the same provider transaction/payment ID.
- Two transactions with the same provider reference.
- Stock reduced more than once for one payment.
- A customer reports being charged but no order appears.
- Render logs show repeated payment capture or webhook attempts.
- Stripe or PayPal shows paid/completed, but admin does not.

## Rollback Procedure

If live payments need to be stopped:

1. In Render, set `SITE_PREVIEW=true`.
2. Redeploy or restart the service.
3. Confirm checkout/payment is blocked on the frontend.
4. Confirm backend payment routes are blocked.
5. Leave Stripe webhook processing available so already-paid Stripe sessions can still reconcile where possible.
6. Check Render logs for startup errors.
7. Check internal email for recovery alerts.

## Payment Go-Live Order

Do this only after final break testing passes:

1. Keep `SITE_PREVIEW=true`.
2. Add or confirm live Stripe and PayPal environment values in Render.
3. Redeploy/restart while still in preview mode.
4. Confirm public pages still work.
5. Confirm checkout is still blocked.
6. Set `SITE_PREVIEW=false`.
7. Redeploy/restart.
8. Confirm startup succeeds.
9. Run one small Stripe payment.
10. Run one small PayPal payment.
11. Confirm order, transaction, stock, emails and admin workflow.
12. If anything is wrong, rollback immediately with `SITE_PREVIEW=true`.

## What Not To Do

- Do not set `SITE_PREVIEW=false` until final break testing is complete.
- Do not change live payment keys during an active customer checkout unless rolling back.
- Do not refund or fulfil from memory; check provider and admin records first.
- Do not ignore recovery alerts.
- Do not assume a customer did not pay just because admin has no order.
- Do not run broad dependency updates during launch.

## Post-Launch Notes

These can wait until after V1 payments are stable:

- Controlled dependency cleanup.
- Static asset caching.
- Lucide/icon bundle cleanup.
- Full automated test suite.
- More complete CSRF token protection.
- Maintenance banner or richer preview/maintenance mode.
