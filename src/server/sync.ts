import { createServerFn } from '@tanstack/react-start'
import { google } from 'googleapis'
import { db } from '../db'
import { members, camps } from '../db/schema'
import { eq } from 'drizzle-orm'

// Define the shape of our Google Sheet row
// Assuming headers: First Name, Last Name, Email, Phone, Campus
interface SheetRow {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    campus: string;
}

export const syncFromGoogleSheet = createServerFn({ method: "POST" })
    .handler(async ({ data }: { data: unknown }) => {
        const { sheetId } = data as { sheetId: string }; // Manual cast since validator is skipped
        try {
            if (!sheetId) throw new Error("Missing sheetId");
            console.log('Starting sync from sheet:', sheetId);

            // 1. Authenticate
            const auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: process.env.GOOGLE_CLIENT_EMAIL,
                    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                },
                scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
            });

            const sheets = google.sheets({ version: 'v4', auth });

            // 2. Fetch Data
            // First, get the sheet name dynamically to avoid "Unable to parse range" errors
            const meta = await sheets.spreadsheets.get({
                spreadsheetId: sheetId
            });

            const firstSheetName = meta.data.sheets?.[0]?.properties?.title;
            if (!firstSheetName) throw new Error("Could not find any sheets in this spreadsheet.");

            console.log(`Syncing from sheet: "${firstSheetName}"`);

            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: `${firstSheetName}!A2:E`, // Use dynamic sheet name
            });

            const rows = response.data.values;
            if (!rows || rows.length === 0) {
                return { success: false, message: 'No data found in sheet.' };
            }

            console.log(`Found ${rows.length} rows to sync.`);

            // 3. Process & Upsert
            let syncedCount = 0;

            // Cache camps to avoid repeated DB hits within loop
            // cache: Camp Name -> ID
            const campCache = new Map<string, string>();

            const getCampId = async (campName: string) => {
                const normalized = campName.trim();
                if (!normalized) return null;

                if (campCache.has(normalized)) return campCache.get(normalized);

                // Find or Create
                const existing = await db.select().from(camps).where(eq(camps.name, normalized)).limit(1);
                if (existing.length > 0) {
                    campCache.set(normalized, existing[0].id);
                    return existing[0].id;
                }

                const newCamp = await db.insert(camps).values({ name: normalized }).returning();
                if (newCamp && newCamp[0]) {
                    campCache.set(normalized, newCamp[0].id);
                    return newCamp[0].id;
                }
                return null;
            }

            for (const row of rows) {
                // Map columns (adjust index based on your actual sheet)
                const [firstName, lastName, email, phone, rawCamp] = row;

                if (!email) continue; // Skip if no email (key identifier)

                // Parse Logic for Camp & Role
                let role: 'Leader' | 'Shepherd' | 'Member' = 'Member';
                let campName = rawCamp || '';

                // Check for specific keywords in the Camp column
                if (campName.toLowerCase().includes('leader')) {
                    role = 'Leader';
                    campName = campName.replace(/leader/i, '').trim();
                } else if (campName.toLowerCase().includes('shepherd')) {
                    role = 'Shepherd';
                    campName = campName.replace(/shepherd/i, '').trim();
                }

                // Find correct Camp ID
                let campId: string | null = null;
                if (campName) {
                    campId = await getCampId(campName) ?? null;
                }

                const cleanEmail = email.trim().toLowerCase();

                // Upsert Member
                const upsertedMember = await db.insert(members).values({
                    firstName: firstName || 'Unknown',
                    lastName: lastName || 'Unknown',
                    email: cleanEmail,
                    phone: phone || '',
                    role: role,
                    campId: campId,
                    campus: 'CoHK', // Default to CoHK as per current schema default, logical mapping can be added if sheet provides it
                    status: 'Active'
                }).onConflictDoUpdate({
                    target: members.email,
                    set: {
                        firstName: firstName || 'Unknown',
                        lastName: lastName || 'Unknown',
                        phone: phone || '',
                        role: role,
                        campId: campId,
                    }
                }).returning();

                // If this member is a Leader, update the Camp's leader_id
                if (role === 'Leader' && campId && upsertedMember[0]) {
                    await db.update(camps)
                        .set({ leaderId: upsertedMember[0].id })
                        .where(eq(camps.id, campId));
                }

                syncedCount++;
            }

            return { success: true, count: syncedCount, message: `Successfully synced ${syncedCount} members.` };

        } catch (error: any) {
            console.error('Sync Error:', error);
            return { success: false, message: error.message || 'Failed to sync.' };
        }
    });
