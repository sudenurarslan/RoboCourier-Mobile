# RoboCourier Mobile

Mobile app of RoboCourier, our team's graduation project at Yaşar University (2026). This repository contains the mobile app and the backend API it uses; the robot (ROS) code is kept in the team's private repository. My main contribution was the mobile app.

Cross-platform mobile app for requesting and tracking deliveries made by indoor courier robots.

## Features

- Create deliveries and track them by tracking code
- QR code handoff between sender, robot and recipient
- Live robot status and map via ROS bridge (roslib)
- Push notifications and password reset by email

## Screenshots

<!-- Add screenshots here -->

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
