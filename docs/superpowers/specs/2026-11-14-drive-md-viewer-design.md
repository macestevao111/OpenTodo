# Drive MD tunnel + viewer (v1)

**Status:** implementing  
**Auth:** Google service account · app read-only viewer  
**Render:** markdown-it (no Mermaid/KaTeX v1)

## Flow

1. MD files live in a Drive folder shared with the SA (`DRIVE_FOLDER_ID`).
2. Citations: `gdrive:FILE_ID` or Drive URL → click opens modal.
3. `GET /api/drive/md/:fileId` proxies file content (cookie auth).
4. `POST /api/drive/md` uploads for skill/humans via SA.
5. UI modal renders markdown-it HTML (read-only).

## Env

- `GOOGLE_SERVICE_ACCOUNT_JSON` — full JSON key string (or base64)
- `DRIVE_FOLDER_ID` — shared folder id
