import 'dotenv/config';

export default {
  expo: {
    name: process.env.APP_NAME || 'Task Runner',
    slug: process.env.APP_SLUG || 'task-runner',
    version: process.env.APP_VERSION || '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: ['**/*'],
    locales: {
      en: './src/locales/en.json',
      fr: './src/locales/fr.json',
      es: './src/locales/es.json'
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: process.env.IOS_BUNDLE_ID || 'com.taskrunner.app',
      buildNumber: process.env.IOS_BUILD_NUMBER || '1.0.0',
      infoPlist: {
        NSLocationWhenInUseUsageDescription: 'This app uses location to provide delivery services and find nearby providers.',
        NSLocationAlwaysAndWhenInUseUsageDescription: 'This app uses location to provide delivery services and find nearby providers.',
        NSCameraUsageDescription: 'This app uses the camera to take photos for service listings and profile pictures.',
        NSPhotoLibraryUsageDescription: 'This app accesses your photo library to upload images for services and profile pictures.'
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff'
      },
      package: process.env.ANDROID_PACKAGE || 'com.taskrunner.app',
      versionCode: parseInt(process.env.ANDROID_VERSION_CODE || '1'),
      permissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE'
      ]
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
      output: 'server'
    },
    scheme: 'taskrunner',
    plugins: [
      'expo-router',
      [
        'expo-build-properties',
        {
          ios: {
            newArchEnabled: false
          },
          android: {
            newArchEnabled: false
          }
        }
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: 'Allow Task Runner to use your location for delivery services.'
        }
      ]
    ],
    extra: {
      eas: {
        projectId: process.env.EAS_PROJECT_ID || 'your-project-id'
      }
    },
    updates: {
      url: `https://u.expo.dev/${process.env.EAS_PROJECT_ID || 'your-project-id'}`
    },
    runtimeVersion: {
      policy: 'sdkVersion'
    }
  }
};