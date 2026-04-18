# Railway Deployment

## Setup

1. Create a new project on Railway (https://railway.app)
2. Connect your GitHub repository
3. Add environment variables in Railway dashboard:
   - `ALLOW_REGISTRATION=true` (set to false after creating all users)
   - Add any LLM API keys if needed (e.g., `ANTHROPIC_API_KEY`)
4. Deploy

## First-Time Setup

When you first deploy, the app will show a registration screen. Create your admin account here. After that, you can:
- Set `ALLOW_REGISTRATION=false` to disable new registrations
- Or keep it `true` if you want users to be able to sign up

## Adding Users

Users can register directly through the app if `ALLOW_REGISTRATION=true`. Alternatively, manually add to `.data/users/users.json`:

```json
[
  {
    "id": "user_1234567890",
    "username": "john",
    "passwordHash": "$2a$12$...",
    "createdAt": 1234567890
  }
]
```

## Custom Domain

1. Go to Railway project → Settings → Domains
2. Add your custom domain
3. Follow Railway's DNS instructions (typically add a CNAME record)

## Storage

Chats are stored in `.data/chats/` on Railway's persistent filesystem. Data persists across deploys but NOT across project recreation. For backups, consider connecting Railway to a database or external storage.