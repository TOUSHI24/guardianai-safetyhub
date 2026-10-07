import type { CapacitorConfig } from "@capacitor/cli";

// The app uses server-side logic (auth, SOS emails), so the Android shell
// loads the hosted GuardianAI app. Replace the URL with your published URL once published.
const config: CapacitorConfig = {
  appId: "com.guardianai.app",
  appName: "GuardianAI",
  webDir: "public",
  server: {
    url: "https://id-preview--c17667fa-983e-4863-8999-c1d276f5417e.lovable.app",
    cleartext: false,
    androidScheme: "https",
  },
  android: { allowMixedContent: false },
  plugins: {
    Geolocation: {},
  },
};

export default config;
