---
name: Gemini API choice
description: Provider preference and Gemini model availability behavior for this app.
---

This app's Gemini coach must use the user's own Google Gemini API key rather than Replit-managed AI Integrations.

**Why:** the user explicitly chose direct API-key access.

**How to apply:** keep the key in Replit Secrets and make Gemini calls from the FastAPI backend only.

Model identifiers can change in provider availability. On October 16, 2026, Gemini rejected `gemini-2.5-flash` for new API users and recommended `gemini-3.8-flash`; the new model then returned a temporary high-demand 503 during verification.

**Why:** the provider's response demonstrated that a configured key can be valid while a model ID is unavailable or temporarily overloaded.

**How to apply:** follow the model recommendation in provider errors and verify with a real request; distinguish transient provider capacity failures from credential or configuration failures.
