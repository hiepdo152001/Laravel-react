# Mộc frontend

React interface for Laravel authentication: registration, sign-in, password recovery, password reset, session restore, and sign-out.

## Configure the API

Copy `.env.example` to `.env` and set `REACT_APP_API_URL` to the public Laravel API base URL. The default matches this repository's Docker setup (`http://localhost:8001/api`). The backend must allow the frontend origin through `CORS_ALLOWED_ORIGINS`.

For the backend, set `FRONTEND_URL` to the public frontend URL and add its origin to `CORS_ALLOWED_ORIGINS` in `backend/.env`. For example:

```dotenv
FRONTEND_URL=http://localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

The frontend keeps the short-lived Sanctum bearer token in `sessionStorage`; the backend's `SANCTUM_EXPIRATION` defaults to seven days. Use HTTPS in production and set the frontend/backend URLs and allowed CORS origin to their HTTPS origins.

Apply backend migrations after deploying the API changes:

```sh
cd backend
php artisan migrate
```

## Start the app

```sh
npm install
npm start
```

Run the frontend checks with `npm test -- --watchAll=false` and create the production bundle with `npm run build`.
