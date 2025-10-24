# Lockpick Multiplayer

Real-time cooperative card game built with React and Socket.IO.

## Development

```bash
npm install
npm run install:all
npm run dev
```

Front-end runs on `localhost:3000`, server on `localhost:3001`.

## Testing

```bash
npm test              # client tests
npm run test:server   # server tests
```

## Production Build

```bash
npm run build:client
npm run start:server
```

Express will serve the compiled React bundle when `NODE_ENV=production`.

## Deployment (Railway)

1. Create Railway project (staging + production recommended).
2. Add Node service pointing to repo root.
   - Install: `npm install`
   - Build: `npm run build:client`
   - Start: `npm run start:server`
3. Configure environment variables:
   - `PORT` (Railway auto-sets)
   - `CLIENT_ORIGIN` (comma-separated allowed origins)
   - `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` (optional tuning)
   - `SOCKET_PING_TIMEOUT_MS`, `SOCKET_PING_INTERVAL_MS` (optional)
4. Set health check to `/api/health`.
5. Attach domain; enable HTTPS (Railway manages TLS).
6. Point DNS if using custom domain.

## Security Notes

- Names/room codes validated and sanitized server-side.
- Helmet, compression, and rate-limiting enabled.
- Socket.IO CORS restricted to `CLIENT_ORIGIN`.
- Enforces HTTPS in production (honors `x-forwarded-proto`).
- Secrets must be stored in Railway environment settings.
- Run `npm audit` regularly for both root and `server/` packages.

## Monitoring & Maintenance

- Review Railway logs; configure alerts if available.
- Add external uptime monitor (e.g. UptimeRobot) hitting `/api/health`.
- Monthly: dependency audit, secret rotation, CORS/origin review.
- Document redeploy/rollback plan (Railway rollback or git revert).
