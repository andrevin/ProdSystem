import webpush from "web-push";
import { storage } from "./storage";
import type { PushSubscription } from "@shared/schema";

// VAPID keys for push notifications
// In production, these should be environment variables
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BGlqn_3z5u5YZ0x3pMqH2S1WZJvDvr7wY-hH0LF6nKYqMN7wKxVzY8fVZ0Y6qRF3_2Y5Q0X8F9K7L6M5N4P3Q2R1";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "nQ5X6vKxYy8fVZ0Y6qRF3_2Y5Q0X8F9K7L6M5N4P3Q2R";

webpush.setVapidDetails(
  "mailto:admin@empresa.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export { VAPID_PUBLIC_KEY };

/**
 * Send push notification to a user
 */
export async function sendPushToUser(userId: number, payload: any) {
  const subscriptions = await storage.getPushSubscriptionsByUser(userId);
  
  const notifications = subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        JSON.stringify(payload)
      );
    } catch (error: any) {
      // If subscription is invalid (410), remove it
      if (error?.statusCode === 410) {
        await storage.deletePushSubscription(sub.id);
      }
      console.error(`Push notification failed for subscription ${sub.id}:`, error);
    }
  });

  await Promise.allSettled(notifications);
}

/**
 * Send push notification to users by role
 */
export async function sendPushToRole(role: string, payload: any) {
  const users = await storage.getUsersByRole(role);
  
  for (const user of users) {
    await sendPushToUser(user.id, payload);
  }
}
