# Job Entry And Invoice E2E Test Cases

## Purpose

Validate the Job Entry to Invoice flow, including rate selection, branch-wise job selection, billing location, internal invoices, charge rows, and draft updates.

## Environment And Test Data

- Run in a non-production environment whenever possible. The current configured API is production.
- Use a dedicated test customer and test Job IDs. Do not use live invoice data.
- Prepare one customer rate-master entry with a known description and rate.
- Prepare one job with rows for at least two branches and different billing locations.
- Prepare one job where production location and billing location are different.
- Record created Job IDs and Invoice IDs in the execution evidence.

## Test Cases

| ID | Scenario | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| E2E-JI-01 | Description applies rate on first selection | A customer-specific product rate exists. | 1. Open New Job. 2. Select the test customer. 3. Add dimensions and quantity. 4. Select the configured description once. | The rate, HSN, product rate ID, and calculated amount populate immediately. Reselecting the description must not be required. |
| E2E-JI-02 | Rate changes when customer changes | Two customers have different rates for the same description. | 1. Select customer A and description. 2. Confirm rate A. 3. Change to customer B. | The line refreshes to rate B or clears the rate when B has no configured rate. It must not retain rate A. |
| E2E-IV-01 | One Job ID selects all branch rows | One completed/challan-ready Job ID has rows for multiple branches/stores. | 1. Open Invoice Preview Builder. 2. Search for the test Job ID. 3. Select it once. | The Job ID appears once in the selector. All related branch/store rows appear in the invoice line list after the single selection. |
| E2E-IV-02 | Duplicate Job ID is not listed | The same Job ID appears in delivery, implementation, or multiple challan sources. | 1. Search the Job ID in the invoice selector. | Only one selectable option is shown for that Job ID. |
| E2E-IV-03 | PO and Project are not auto-filled | A selected job has PO/project fields in its source data. | 1. Start a new invoice. 2. Select the Job ID. | PO Number and Project Name remain blank until the user enters them. |
| E2E-IV-04 | New charge rows inherit Job ID | At least one Job ID is selected. | 1. Add Installation, Adaptation, Implementation, and Transportation rows. 2. Enter amount/rate for each row. | Each new row contains the selected Job ID and is selected for saving. The rows appear in the saved invoice payload/preview. |
| E2E-IV-05 | Customer invoice uses job billing location | A selected Job ID has a known billing location. | 1. Select the Job ID. 2. Save a draft. 3. Open the saved draft/invoice detail. | Customer invoice Billing Location and Bill From details match the billing location stored on the job, unless the user explicitly changes Bill From. |
| E2E-IV-06 | Internal invoice is generated | At least one selected line has a production location different from its billing location. | 1. Select the prepared Job ID. 2. Verify the internal bill preview. 3. Save a draft, then save final if allowed. | A Production To Billing internal invoice is created for the production-to-billing branch pair. Its Bill From is production location and Bill To is the line billing location. |
| E2E-IV-07 | Multiple billing destinations create separate internal invoices | One selected job has one production branch and rows for two billing locations. | 1. Select the Job ID. 2. Save the invoice. | Separate internal invoices are created for each unique Production Location plus Billing Location pair. No branch rows are mixed into the wrong internal invoice. |
| E2E-IV-08 | Draft save updates the same invoice | A saved draft exists with a known Invoice No and Invoice ID. | 1. Open the draft by selecting its Job ID. 2. Change PO, Project, Notes, or a line amount. 3. Save Draft again. | The same Invoice No and Invoice ID are retained. The existing draft is updated; no second customer invoice with the same Job ID is created. |
| E2E-IV-09 | Draft reload preserves data | A draft exists with addresses, charge rows, and manually entered metadata. | 1. Reload Invoice Preview Builder. 2. Select the draft Job ID. | Invoice number, addresses, PO, Project, notes, charge rows, selected Job IDs, and E-way Bill values load correctly. |
| E2E-IV-10 | Final invoice locks expected records | A valid draft is ready to finalise. | 1. Open the draft. 2. Save as Final. 3. Search Invoice List. | The final invoice retains Job IDs, branch billing data, rows, totals, and internal invoice references. The draft is not duplicated. |

## Evidence To Capture

- Screenshot before and after selecting the description, including rate and amount.
- Screenshot of Job ID selector showing one option for the test Job ID.
- Invoice line grid showing all branch rows after one Job ID selection.
- Saved customer invoice header with Invoice No, Invoice ID, Billing Location, PO, and Project values.
- Each generated internal invoice header with Production Location and Billing Location.
- Before/after screenshots of a draft update proving the Invoice No and Invoice ID did not change.
- API request/response for `SaveMultiLocationInvoice` when diagnosing a failed save.

## Exit Criteria

- All cases pass using dedicated test data.
- No duplicate Job ID options are present.
- No duplicate invoice is created when updating a draft.
- Billing and internal invoice branch locations match their source job lines.
- Test jobs and invoices are clearly marked as test records and removed only through the approved business process.
