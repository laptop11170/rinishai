# Railway Deployment

## PostgreSQL Database Setup

Your data (users, chats, sessions, images) is now stored in PostgreSQL for persistent storage across redeploys.

### Step 1: Add PostgreSQL Database

1. Go to your Railway project dashboard
2. Click **Add a Service** → **Database** → **PostgreSQL**
3. Railway will automatically create a PostgreSQL database and set the `DATABASE_URL` environment variable

### Step 2: Verify Setup

Railway automatically provides the connection string via the `DATABASE_URL` environment variable. No manual configuration needed.

### Step 3: Run Database Migrations

After deployment, run the migration to create tables:

```bash
npx prisma migrate deploy
```

Or let Railway run it automatically on deploy by adding a build command:

**In Railway Dashboard:**
1. Go to your service → Settings → Deploy
2. Add a **Before Deploy Command**: `npx prisma migrate deploy`

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string (auto-provided by Railway) | Yes |
| `ALLOW_REGISTRATION` | Set to `false` to disable new user registration | No |
| `OPUSMAX_API_KEY` | Your OpusMax API key | Yes (for LLM access) |

---

## First-Time Setup

1. Deploy the app to Railway
2. Add PostgreSQL database to your project
3. Run migrations: `npx prisma migrate deploy`
4. Visit your app and register your admin account
5. Set `ALLOW_REGISTRATION=false` to prevent new registrations

## Adding Users

Users can register directly through the app if `ALLOW_REGISTRATION=true`. Alternatively, create users through the admin panel (login as admin user).

## Custom Domain

1. Go to Railway project → Settings → Domains
2. Add your custom domain
3. Follow Railway's DNS instructions (typically add a CNAME record)

## Local Development

For local development with PostgreSQL:

1. Install PostgreSQL locally or use Docker:
   ```bash
   docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
   ```

2. Create a `.env.local` file:
   ```
   DATABASE_URL=postgresql://postgres:password@localhost:5432/rinish_ai
   ```

3. Run migrations:
   ```bash
   npx prisma migrate dev
   ```

4. Start the dev server:
   ```bash
   npm run dev
   ```
