---
name: Bug Report
about: Defect intake with reproduction, verification, design linkage, and stage hints for `/research`, `/plan`, `/build`, `/vqa`
labels: bug
---

<!--
BUG workflow: characterize → reproduce → isolate → fix → verify. Sections below mirror that so triage agents do not reinvent structure.
Stages: 🔍 Understand / reproduce → 📋 Isolate & plan fix → 🛠️ Implement → ✅ Verify & regression
-->

## Goal

<!--
One paragraph: acceptable resolution — restored behavior **or** intentional product/doc change tracked separately.
-->

---

## Summary

<!-- One brutal sentence engineers can skim in Slack / JIRA cards -->

-

## Severity & user impact *(triage hints)*

| | |
| --- | --- |
| **Who is affected** | <!-- personas / % of users --> |
| **Frequency** | <!-- always \| often \| intermittent \| rare --> |
| **Workaround exists?** | <!-- yes \| no \| partial --> |
| **Revenue / safety / compliance** | <!-- yes \| no \| note --> |

---

## Steps to reproduce

1. <!-- environment / account preconditions -->

2. <!-- action -->

3. <!-- observe -->

**Fastest reproduction path:**

<!-- Alternative one-liner for devs -->

---

## Expected vs actual

### Expected *(correct behavior)*

-

### Actual *(defect symptom)*

-

### Environment *(fill what you know)*

| | |
| --- | --- |
| **OS / device** | |
| **Browser / app version** | |
| **Branch / deployment** | |
| **Feature flags** | |

---

## Design reference *(for UI/visual bugs)*

| | |
| --- | --- |
| **Figma** | <!-- intended state — omit if N/A --> |
| **Node / frame** | |
| **Regression screenshot** *(optional)* | <!-- attach --> |

*N/A:* say **Does not apply — API / logic / infra bug**.*

---

## User story *(who loses when we leave this unfixed)*

<!--
As a [persona], I expect [behavior] because [business or trust reason].

Optional: related analytics or support-volume note.
-->

-

---

## Acceptance criteria *(fix verification)*

- [ ] Reproduction succeeds on `main` *(or nominated branch)* before fix
- [ ] After fix: expected behavior verified on **[platform list]**
- [ ] Automated tests *(if feasible)* cover regression at **[layer: unit/integration/e2e]**
- [ ] Accessibility / localization reviewed if UX surface changed
- [ ] Observability *(logs/alerts/dashboards)* updated if incidence was silent

<!-- Add product-specific bullets below -->

-

---

## Figma VQA Checklist

<!--
For visual/UI bugs, `/vqa` populates and evaluates this section AUTOMATICALLY against the Figma node referenced in **Design reference** above. The post-fix build must match the design ~1:1. Same structure as the work-order template — the agent fills both columns and marks PASS / FAIL / N/A.

If this is a non-visual bug (API / logic / infra), replace the section body with:
**N/A — non-visual bug; functional QA only.**
-->

**Figma source (must be filled before `/vqa` runs):**

| Field | Value |
| --- | --- |
| `file_key` | |
| `node_id` | |
| Figma deep link | |
| Frame / scope | |
| Captured at | |

**Assertions** *(agent fills `Design (Figma)` and `Build (implemented)` columns):*

| # | Category | Property | Design (Figma) | Build (implemented) | Result |
| --- | --- | --- | --- | --- | --- |
| 1 | Layout | Frame width × height | | | |
| 2 | Layout | Auto-layout direction / gap | | | |
| 3 | Layout | Padding (T/R/B/L) | | | |
| 4 | Layout | Alignment / distribution | | | |
| 5 | Typography | Font family | | | |
| 6 | Typography | Font weight | | | |
| 7 | Typography | Font size | | | |
| 8 | Typography | Line height | | | |
| 9 | Typography | Letter spacing | | | |
| 10 | Typography | Text token | | | |
| 11 | Color | Background fill | | | |
| 12 | Color | Foreground / text fill | | | |
| 13 | Color | Border / stroke | | | |
| 14 | Color | State variants (hover / pressed / disabled) | | | |
| 15 | Spacing | Margin / gap tokens | | | |
| 16 | Effects | Border radius | | | |
| 17 | Effects | Shadow / elevation token | | | |
| 18 | Effects | Opacity | | | |
| 19 | Iconography | Icon set / size | | | |
| 20 | Components | Code Connect / shadcn primitive | | | |
| 21 | Components | Variants present | | | |
| 22 | Content | Copy matches Figma | | | |
| 23 | Content | Localization placeholders | | | |
| 24 | Responsive | Breakpoint variants | | | |
| 25 | Accessibility | Contrast ratio (WCAG AA) | | | |
| 26 | Accessibility | Hit target ≥ 44×44 pt | | | |
| 27 | Accessibility | Focus ring visible & token-based | | | |
| 28 | Screenshot | Side-by-side overlay diff (path) | | | |

**Per-row deviations:**

-

## Suspected cause *(optional)*

<!-- Engineer / agent hypothesis — avoids duplicate spelunking -->

-

## Blast radius / regression risk

<!-- Data migration, caches, CDN, downstream services, correlated features -->

-

---

## 🔍 Ready for `/research`

<!--
Questions that must land in **`research/`** before sizing:

-

-->

-

## 📋 Ready for `/plan`

<!--
Dependencies blocking fix:

-

-->

-

## 🛠️ Ready for `/build`

<!--
 Preconditions (flags, mocks, seeded data):

-

-->

-

---

## Additional context *(optional)*

<!-- Stack traces (**redacted**), HAR excerpts, Slack threads -->

-

## References *(optional)*

<!-- Related BUG/WO/Jira, incident links, RCA docs -->

-
