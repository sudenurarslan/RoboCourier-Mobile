// Dynamic Expo config so we can inject EAS projectId for push notifications.
// This keeps app.json static, and reads EXPO_PUBLIC_EAS_PROJECT_ID from env.

module.exports = ({ config }) => {
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || config?.extra?.eas?.projectId;

  return {
    ...config,
    extra: {
      ...(config.extra ?? {}),
      eas: {
        ...(config.extra?.eas ?? {}),
        projectId,
      },
    },
  };
};


