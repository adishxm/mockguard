# MockGuard Data and Retention Policy

## Default

MockGuard is local-first and sends no source code or test output to a remote service by default.

## Reports

Reports may contain file paths, source excerpts, test output, and mutation diffs. Users should review them before sharing. The tool should support a redacted report mode.

## Optional AI assistance

If enabled, the user must explicitly opt in and see the context sent. The default remains off. The model receives bounded context and no tool access.

## Retention

Run artifacts remain local until the user deletes or shares them. No telemetry is required for the MVP.
