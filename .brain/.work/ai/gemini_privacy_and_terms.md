# MockGuard Gemini Privacy and Terms Gate

Before enabling Gemini for real user repositories, review Google Gemini API terms, privacy/data handling, safety guidance, region availability, and the selected model’s retention/training terms. The MLH page provides access/resources but does not replace these reviews.

## User disclosure

Show what will be sent: selected source/test excerpts, finding, mutant diff, and metadata. Let the user cancel.

## Data minimization

Send only the smallest context needed. Prefer symbol-level excerpts over full files. Remove absolute paths and redact likely secrets.

## Retention

Raw Gemini prompt/response storage is off by default. If enabled for a fixture, label it as test data and retain locally only.

## Terms gate

A provider configuration is not production-ready until the team records the selected model, account type, terms version/date, data controls, and cost owner.
