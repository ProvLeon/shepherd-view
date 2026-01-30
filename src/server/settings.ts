import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { settings } from '@/db/schema'
import { eq } from 'drizzle-orm'

// Default settings
const defaultSettings = {
    ministryName: 'Agape Bible Studies',
    campusName: 'CoHK',
    defaultMeetingUrl: 'https://meet.google.com/pqr-wira-sxh',
    birthdayReminders: 'true',
    attendanceAlerts: 'true',
    newConvertFollowups: 'true',
    theme: 'agape-blue',
}

// Get all settings
export const getSettings = createServerFn({ method: "GET" })
    .handler(async () => {
        try {
            const allSettings = await db.select().from(settings);

            // Convert to object and merge with defaults
            const settingsObj = { ...defaultSettings };
            for (const s of allSettings) {
                settingsObj[s.key as keyof typeof defaultSettings] = s.value;
            }

            return settingsObj;
        } catch (error) {
            console.error('Error fetching settings:', error);
            return defaultSettings;
        }
    });

// Save a single setting
export const saveSetting = createServerFn({ method: "POST" })
    .handler(async ({ data }: { data: unknown }) => {
        const { key, value } = data as { key: string; value: string };

        try {
            // Upsert: try to update, if not exists, insert
            const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);

            if (existing.length > 0) {
                await db.update(settings)
                    .set({ value, updatedAt: new Date() })
                    .where(eq(settings.key, key));
            } else {
                await db.insert(settings).values({ key, value });
            }

            return { success: true };
        } catch (error: any) {
            console.error('Error saving setting:', error);
            return { success: false, message: error.message };
        }
    });

// Save multiple settings at once
export const saveAllSettings = createServerFn({ method: "POST" })
    .handler(async ({ data }: { data: unknown }) => {
        const settingsData = data as Record<string, string>;

        try {
            for (const [key, value] of Object.entries(settingsData)) {
                const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);

                if (existing.length > 0) {
                    await db.update(settings)
                        .set({ value, updatedAt: new Date() })
                        .where(eq(settings.key, key));
                } else {
                    await db.insert(settings).values({ key, value });
                }
            }

            return { success: true, message: 'Settings saved successfully!' };
        } catch (error: any) {
            console.error('Error saving settings:', error);
            return { success: false, message: error.message };
        }
    });

// Get just the sync progress (POST to avoid caching)
export const getSyncProgress = createServerFn({ method: "POST" })
    .handler(async () => {
        try {
            const result = await db.select().from(settings).where(eq(settings.key, 'sync_progress')).limit(1);
            if (result.length > 0) {
                return JSON.parse(result[0].value);
            }
            return null;
        } catch (error) {
            console.error('Error fetching sync progress:', error);
            return null;
        }
    });
