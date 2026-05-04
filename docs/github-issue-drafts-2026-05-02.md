# GitHub Issue Drafts - 2026-05-02

Repository: `adrianoggm/footballhubmanager`

## Deduplication Summary

- Do not create a new issue for profile image optimization. It overlaps with existing issue `#86` (`Add profile pictures to peñas & different accounts`).
- The statistics filters request is related to `#40` (`Improved Stats`) and `#49` (`Labels confgurables for filtering players on the different classifications`), but it is specific enough to track independently.
- The database decision request is related to historical MySQL-oriented work such as `#2`, `#4`, and `#17`, but it is not a duplicate because it is an architectural decision issue.
- Google sign-in and Google sign-up should be tracked as a single issue to avoid duplication.

## Existing Issue To Extend

### Issue `#86`

Comment to add:

```text
Additional scope for this feature: profile images should be size-limited, compressed, and cropped to a consistent aspect ratio so uploads stay lightweight and the UI remains visually consistent across peñas and account types.
```

## New Issues To Create

### 1. Add and validate a native Android app version

```text
We should adapt the product so it can run and be tested as a native Android app, not only as a web experience.

Scope:
- Define the native Android approach and packaging strategy.
- Make sure the current app flows work correctly on Android devices.
- Validate the Android build and document the setup.

Acceptance criteria:
- A native Android build can be generated successfully.
- Core flows are tested on Android devices or emulators.
- Platform-specific setup and limitations are documented.
```

### 2. Add responsive local and global filters to the statistics area

```text
The statistics section needs a clearer filtering model that works well on desktop and mobile.

Scope:
- Add global filters that affect the whole statistics view.
- Add local filters for specific charts, tables, or widgets when needed.
- Make the filter UX fully responsive.

Acceptance criteria:
- Users can apply global filters across the statistics page.
- Users can apply local filters to individual statistics modules.
- The filter layout is usable on mobile, tablet, and desktop.

Related context:
- This is related to broader statistics improvements, but it is specific enough to track independently.
```

### 3. Simplify the player registration flow

```text
Registering players should require fewer steps and less manual work.

Scope:
- Review the current player registration flow end to end.
- Reduce friction, duplicated inputs, and unnecessary decisions.
- Improve defaults, validation, and UX copy where needed.

Acceptance criteria:
- The registration flow has fewer steps or less manual input.
- Validation and error handling are clearer.
- Admins and users can register players faster with fewer mistakes.
```

### 4. Add Google authentication for sign-in and sign-up

```text
Users should be able to use Google as an authentication provider both for returning access and first-time account creation.

Scope:
- Add Google sign-in.
- Add Google-based account creation for new users.
- Define how Google accounts link to existing users if the email already exists.

Acceptance criteria:
- Users can sign in with Google.
- New users can create an account with Google.
- Existing account linking rules are documented and handled safely.
```

### 5. Decide the primary relational database: PostgreSQL vs MySQL

```text
We are still early enough to make an intentional database decision before the data layer becomes harder to change.

Scope:
- Compare PostgreSQL and MySQL for the current and expected product needs.
- Review migrations, indexing, hosting, operational complexity, and developer experience.
- Produce a clear recommendation and decision record.

Acceptance criteria:
- A documented comparison is created.
- The team chooses one primary relational database.
- Follow-up technical changes are identified from the decision.

Related context:
- There is already historical MySQL-oriented work in the repository, so the decision should explicitly address that context.
```

### 6. Add competition modes for league, championship, and peña teams

```text
The product should support multiple competition and team modes instead of assuming a single structure.

Scope:
- Define the data model and UX for league, championship, and peña team modes.
- Capture the different rules and behaviors for each mode.
- Make the system flexible enough to grow without hard-coded assumptions.

Acceptance criteria:
- The supported competition modes are clearly defined.
- The domain model can represent league, championship, and peña structures.
- Key flows behave correctly depending on the selected mode.
```

### 7. Add configurable matchday MVP voting with voter visibility

```text
Administrators should be able to configure matchday MVP voting and decide how transparent the voting process is.

Scope:
- Allow admins to define the voting time window.
- Allow admins to control who can vote.
- Show who voted when voter visibility is enabled.

Acceptance criteria:
- Admins can configure the voting window.
- Admins can enable or disable voter visibility.
- The system records votes and exposes voter information according to the configured rules.
```

### 8. Refactor the backend around a persistence library for multi-version app support

```text
The backend should be refactored to rely on a clearer persistence layer that can support multiple application versions and clients more safely.

Scope:
- Introduce a persistence abstraction or library boundary.
- Reduce coupling between business logic and database details.
- Make future versioning and client compatibility easier to maintain.

Acceptance criteria:
- Persistence responsibilities are isolated behind a well-defined layer.
- Business logic depends less on direct storage details.
- The architecture is better prepared for multi-version app support.
```

### 9. Add financial management features for clubs and league mode

```text
The product should support the financial side of clubs and league mode.

Scope:
- Define the main money-related use cases such as fees, balances, expenses, and payments.
- Model the required financial data and permissions.
- Expose the feature in a way that fits club and league workflows.

Acceptance criteria:
- Core financial use cases are documented and prioritized.
- The domain model supports club and league financial data.
- Users with the right permissions can manage financial records.
```

### 10. Add a match location field to the database and match flows

```text
Matches should store a location field so the venue can be managed consistently across the product.

Scope:
- Add the location field to the database schema.
- Expose it in backend create, update, and read flows.
- Surface it in the relevant UI forms and views.

Acceptance criteria:
- Match records can store a location value.
- APIs and backend flows support reading and writing the field.
- Users can see and manage the location from the app.
```

### 11. Support team colors in league mode and peña mode

```text
Teams should be able to define colors in both league mode and peña mode.

Scope:
- Add support for team color data such as primary and secondary colors.
- Make the configuration available in the relevant team management flows.
- Use the colors consistently in the UI where team identity is displayed.

Acceptance criteria:
- Teams can define their colors.
- League mode and peña mode both support the same capability.
- The UI reflects the configured team colors in a consistent way.
```
