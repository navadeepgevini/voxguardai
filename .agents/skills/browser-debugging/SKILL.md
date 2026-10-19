---
name: browser-debugging
description: >-
  Use this skill to diagnose browser console errors, failed network requests, rendering glitches, accessibility issues, and UI flows using Chrome DevTools MCP.
---

# Browser Debugging & QA Skill

## Capabilities
- Inspects real-time console messages (`list_console_messages`).
- Inspects network requests and response status codes (`list_network_requests`).
- Captures full-page and element screenshots (`take_screenshot`).
- Runs Lighthouse audits and performance traces (`lighthouse_audit`, `performance_start_trace`).

## Safety Protocol
- Redact all authorization headers, session cookies, passwords, API keys, and user audio waveforms from diagnostics.
- Ensure temporary screenshot files are stored in scratchpad or ignored paths.
