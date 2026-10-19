# RoboCourier Mobile

Cross-platform mobile app for requesting and tracking deliveries made by indoor courier robots.

## Features

- Create deliveries and track them by tracking code
- QR code handoff between sender, robot and recipient
- Live robot status and map via ROS bridge (roslib)
- Push notifications and password reset by email

## Tech

React Native (Expo Router), TypeScript, Node.js / Express backend, PostgreSQL (Docker)

## Getting started

```bash
# database
docker compose up -d

# backend
cd backend
cp ENV_EXAMPLE.txt .env   # fill in your values
npm install && node index.js

# mobile app
cd ..
cp ENV_EXAMPLE.txt .env   # set EXPO_PUBLIC_API_URL
npm install && npx expo start
```
