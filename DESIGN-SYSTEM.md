# FixNest — considered property care

## Direction

A warm architectural identity for a practical maintenance workspace. The three considered directions were an industrial service desk, a neutral editorial ledger, and an architectural residential workspace. The architectural direction pairs a human public identity with a clear operational interface. No fabricated analytics, property photographs, testimonials or performance claims are part of the redesign.

## Visual language

| Element | Decision |
|---|---|
| Canvas | Warm ivory `#f7f5ef` |
| Primary ink / navigation | Forest `#243e32` |
| Primary action | `hsl(155 29% 24%)` |
| Secondary surfaces | Sage `#e7ecda`, warm paper `#fffefa` |
| Accent | Restrained terracotta in the wordmark and illustration |
| Borders | Warm grey / muted olive; thin rules define hierarchy |
| Body typography | Existing bundled Geist variable font; no font service requests |
| Editorial headings | Georgia, Times New Roman, serif; reserved for page titles and brand storytelling |
| Numeric summaries | Geist tabular numbers, joined metric ledger |
| Corners | Small 3–6px radii for working controls; the single architectural arch is a brand illustration treatment |
| Elevation | Borders by default; elevation reserved for overlays and transient feedback |
| Icons | Existing Lucide set, consistent small outline icons; original SVG brand/elevation artwork |

## Composition and behavior

- Public home: asymmetric editorial heading and original architectural SVG, followed by a three-role workflow. Actual authentication links and role redirects are preserved.
- Authentication: shared two-column story/form frame. The illustration drops out on mobile to prioritize the form. Login, registration, recovery, reset and invitation completion share the frame.
- Workspace: fixed forest sidebar at desktop widths, accessible Radix drawer below 1024px, contextual utility bar and a paper workspace.
- Dashboard: joined metric strip, portfolio summary for managers, assigned-home panel for tenants, scoped request ledger. No new analytics or unsupported counts.
- Filters: search remains immediately visible. A native disclosure contains status, priority, sort and existing role-permitted options. Existing URL persistence, submissions and pagination remain intact.
- Request detail: actual state-based progress indicator, description, private attachments, timeline and role-permitted actions. Cancellation does not imply progress through completion.
- Request composition: one primary form and secondary advice. Advice follows the form on mobile. Existing validation, upload limits, cleanup and uncertain-response handling remain intact.
- Properties: architectural covers, real unit counts, existing property/unit editors and tenant assignment.
- Staff: a technician roster and invitation history beside a dedicated invitation panel. Existing single-use link visibility, hiding, renewal, revocation and account-status safeguards remain intact.
- Notifications: an inbox ledger with readable states and existing authorized links and read behavior.
- Account: numbered profile/security sections with read-only email/role and existing credential/session rules.

## Accessibility and responsive rules

- Major interactive controls have at least 44px targets. Labels remain associated with fields.
- Focus outlines are visible; mobile drawer supports keyboard navigation, Escape and focus restoration. The existing skip link and single main landmark remain.
- Status always has text in addition to color. Destructive actions retain their existing confirmations.
- Reduced-motion preferences suppress nonessential transitions/animations. Normal effects are short color/position transitions; no animation library was added.
- Long names, emails and descriptions wrap; ticket rows reflow rather than forcing a wide table.
- Desktop, tablet and phone layouts are verified with actual browser captures. This is practical accessibility QA, not a formal certification.

## Final refinement pass — 19 October 2026

- Preserve the ivory, forest and sage palette, bundled Geist body typography and Georgia editorial headings.
- Group sidebar links into Workspace, Maintenance and Personal. Keep one selected destination, including dashboard section links and browser Back/Forward navigation.
- Use consistent 18px navigation icons in a 20px alignment slot, 45px rows, restrained hover surfaces and visible keyboard outlines. Keep the account area anchored while navigation scrolls on short screens.
- Give the mobile drawer an explicit forest surface so shared dialog defaults cannot obscure its light navigation text. Keep Escape, focus containment, focus return and close-after-navigation behavior.
- Increase supporting captions and badge sizes selectively. Adjust the secondary olive text token and several surface-specific captions for readability while preserving hierarchy.
- Use readable disabled controls, stronger field boundaries and two-pixel button focus rings. Native selects follow the same field palette.
- On mobile, an odd final metric spans the row. Keep existing layouts and workflows otherwise intact.

See `UI-POLISH-VERIFICATION.md` for the measured scope, browser checks and remaining release limitation.

## Scope boundary

No API handler, service, authentication rule, Prisma model, migration, dependency version or production configuration was changed for this design. The checkout was first fast-forwarded to the existing remote main baseline so the prior invitation security release was preserved. Previous local edits were retained; Git kept a backup autostash during that integration.
