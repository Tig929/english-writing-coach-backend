---
name: Gemini API choice
description: The user's provider preference for Gemini calls in this app.
---

This app's Gemini coach must use the user's own Google Gemini API key rather than Replit-managed AI Integrations.

**Why:** the user explicitly chose direct API-key access.

**How to apply:** keep the key in Replit Secrets and make Gemini calls from the FastAPI backend only.
