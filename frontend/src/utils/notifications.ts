import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { api } from './api';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Routine Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }

  return finalStatus === 'granted';
}

export async function registerPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push tokens require a physical device');
    return null;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const pushToken = tokenResponse.data;

    // Send token to backend
    await api('/api/notifications/register-token', {
      method: 'POST',
      body: JSON.stringify({
        token: pushToken,
        platform: Platform.OS,
        device_name: Device.modelName || 'Unknown',
      }),
    });

    return pushToken;
  } catch (e) {
    console.log('Push token registration skipped:', (e as Error).message);
    return null;
  }
}

export async function scheduleLocalReminders(
  times: string[],
  language: string
): Promise<void> {
  // Cancel all existing scheduled notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (times.length === 0) return;

  const title = 'Routinely';
  const body =
    language === 'de'
      ? 'Hast du schon deine Routinen erledigt?'
      : 'Have you completed your routines today?';

  for (const time of times) {
    const [hoursStr, minutesStr] = time.split(':');
    const hour = parseInt(hoursStr, 10);
    const minute = parseInt(minutesStr, 10);

    if (isNaN(hour) || isNaN(minute)) continue;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          data: { type: 'reminder' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: Platform.OS === 'android' ? 'reminders' : undefined,
        },
      });
    } catch (e) {
      console.log(`Failed to schedule ${time}:`, (e as Error).message);
    }
  }
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export const PRESET_REMINDER_TIMES = [
  '06:00', '07:00', '08:00', '09:00', '10:00',
  '12:00', '14:00', '16:00', '18:00', '20:00', '21:00',
];
