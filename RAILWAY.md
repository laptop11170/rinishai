# Railway Deployment

## Persistent Storage Setup (CRITICAL)

**By default, Railway's filesystem is ephemeral - all data is deleted on every redeploy.**

To preserve your data (users, chats, images, sessions), you MUST set up a persistent volume.

### Step 1: Create a Persistent Volume

1. Go to your Railway project dashboard
2. Navigate to **Storage** → **Add Persistent Disk**
3. Create a new volume (e.g., named "data" or "storage")
4. Note the **Volume Mount Path** shown (e.g., `/var/data`)

### Step 2: Configure the Volume Mount

1. Go to your ** NixOS** (or service) settings
2. Under **Storage**, mount the persistent disk to your service
3. Set the mount path to match what your code expects

### Step 3: Add Environment Variable

In Railway dashboard, add this environment variable:

| Variable | Value |
|----------|-------|
| `RAILWAY_VOLUME_MOUNT_PATH` | The mount path from Step 1 (e.g., `/var/data`) |

### How It Works

When `RAILWAY_VOLUME_MOUNT_PATH` is set:
- Data is stored at `<volume_path>/.data/`
- This persists across all deploys
- Example path: `/var/data/.data/chats/`, `/var/data/.data/images/`

When NOT set (local development):
- Falls back to `<project_dir>/.data/`
- Data is stored locally for development

### Data Locations (when volume is configured)

```
/var/data/.data/
├── chats/          # User conversations (userId.json)
├── images/        # Uploaded images
│   └── [userId]/
│       └── [image files]
├── sessions/      # Session tokens
├── usage/         # Token quota tracking
└── users/         # User accounts
```

---

## Initial Setup

1. Create a new project on Railway (https://railway.app)
2. Connect your GitHub repository
3. Add environment variables in Railway dashboard:
   - `ALLOW_REGISTRATION=true` (set to false after creating all users)
   - `RAILWAY_VOLUME_MOUNT_PATH=/var/data` (replace with your volume mount path)
   - Add any LLM API keys if needed (e.g., `ANTHROPIC_API_KEY`)
4. Set up the persistent volume as described above
5. Deploy

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

## Backup Recommendation

For production use, consider:
- Regular backups of the persistent volume
- Railway's native backup features (if available in your plan)
- External database migration for critical data
