# CodeMem: Local Runtime & Environment Ports

| Component | Technology | Default Port / URL | Launch Script |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | Next.js 16.3.4 (Turbopack) | `http://localhost:3000` | `run_frontend.bat` |
| **Backend API** | FastAPI / Python 3.13 | `http://127.0.0.1:8000` | `run_backend.bat` |
| **Combined Dev** | Concurrent Launcher | Both `:3000` & `:8000` | `run_project.bat` |
| **Database** | SQLite 3 | `backend/voxguard.db` | Auto-initialized |
| **Chrome DevTools** | MCP Debugging | Port 9222 (optional) | Requires Chrome + MCP enable |
| **DBHub Gateway** | `@bytebase/dbhub` | Stdio / Local MCP | Optional; DBCode is Cursor fallback |
| **Context7** | Remote MCP | `CONTEXT7_API_KEY` | Optional docs retrieval |
| **Serena** | Local MCP via `uvx` | Project root | Optional code intel |

App runtime does **not** require any MCP server. See `docs/development-tooling.md`.
