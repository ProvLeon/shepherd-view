import { createServerFn } from '@tanstack/react-start'
import { google } from 'googleapis'
import { db } from '../db'
import { members, camps } from '../db/schema'
import { eq } from 'drizzle-orm'

/**
 * Dynamic Google Sheets Sync
 * 
 * This sync reads the header row first and maps columns by name,
 * making it flexible to different sheet structures.
 * 
 * Expected column names (case-insensitive, partial match):
 * - "first name" → firstName
 * - "surname" OR "last name" → lastName
 * - "contact" OR "phone" → phone
 * - "date of birth" OR "birthday" OR "dob" → birthday
 * - "camp" → campId (lookup)
 * - "new or old" OR "member type" → role
 * - "region" → stored for reference
 * - "residence" → stored for reference
 */

// Helper to find a column by partial name match
function findColumn(headers: string[], ...searchTerms: string[]): number {
    const headerLower = headers.map(h => (h || '').toLowerCase().trim());
    for (const term of searchTerms) {
        const index = headerLower.findIndex(h => h.includes(term.toLowerCase()));
        if (index !== -1) return index;
    }
    return -1;
}

export const syncFromGoogleSheet = createServerFn({ method: "POST" })
    .handler(async ({ data }: { data: unknown }) => {
        const { sheetId } = data as { sheetId: string };
        try {
            if (!sheetId) throw new Error("Missing sheetId");
            console.log('Starting dynamic sync from sheet:', sheetId);

            // 1. Authenticate
            const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
            const privateKey = process.env.GOOGLE_PRIVATE_KEY;

            if (!clientEmail || !privateKey) {
                throw new Error("Missing Google credentials. Please check GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY environment variables.");
            }

            const auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: clientEmail,
                    private_key: privateKey.replace(/\\n/g, '\n'),
                },
                scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
            });

            const sheets = google.sheets({ version: 'v4', auth });

            // 2. Get sheet name dynamically
            const meta = await sheets.spreadsheets.get({
                spreadsheetId: sheetId
            });

            const firstSheetName = meta.data.sheets?.[0]?.properties?.title;
            if (!firstSheetName) throw new Error("Could not find any sheets in this spreadsheet.");

            console.log(`Syncing from sheet: "${firstSheetName}"`);

            // 3. Fetch ALL data including headers (row 1)
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: `${firstSheetName}!A1:Z`, // Get columns A-Z to be flexible
            });

            const allRows = response.data.values;
            if (!allRows || allRows.length < 2) {
                return { success: false, message: 'No data found in sheet (needs header + at least 1 row).' };
            }

            // 4. Parse header row and find column indices
            const headers = allRows[0] as string[];
            console.log('Found headers:', headers);

            const columnMap = {
                firstName: findColumn(headers, 'first name', 'firstname'),
                lastName: findColumn(headers, 'surname', 'last name', 'lastname'),
                middleName: findColumn(headers, 'middle name', 'middlename'),
                phone: findColumn(headers, 'contact', 'phone', 'mobile', 'tel'),
                birthday: findColumn(headers, 'date of birth', 'birthday', 'dob', 'birth'),
                camp: findColumn(headers, 'camp'),
                memberType: findColumn(headers, 'new or old', 'member type', 'type', 'status'),
                region: findColumn(headers, 'region'),
                residence: findColumn(headers, 'residence', 'address', 'location'),
                email: findColumn(headers, 'email'),
            };

            console.log('Column mapping:', columnMap);

            // Validate minimum required columns
            if (columnMap.firstName === -1 && columnMap.lastName === -1) {
                return {
                    success: false,
                    message: `Could not find name columns. Found headers: ${headers.join(', ')}. Expected "First Name" or "Surname" columns.`
                };
            }

            // 5. Process data rows (skip header)
            const dataRows = allRows.slice(1);
            console.log(`Found ${dataRows.length} data rows to sync.`);

            let syncedCount = 0;
            let skippedCount = 0;
            const errors: string[] = [];

            // Cache camps to avoid repeated DB hits
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
            };

            for (let i = 0; i < dataRows.length; i++) {
                const row = dataRows[i];

                try {
                    // Extract values using dynamic column mapping
                    const getValue = (colIndex: number) => colIndex >= 0 ? (row[colIndex] || '').toString().trim() : '';

                    const firstName = getValue(columnMap.firstName);
                    const lastName = getValue(columnMap.lastName);
                    const phone = getValue(columnMap.phone);
                    const birthdayRaw = getValue(columnMap.birthday);
                    const campRaw = getValue(columnMap.camp);
                    const memberTypeRaw = getValue(columnMap.memberType);
                    const email = getValue(columnMap.email);

                    // Skip if no name at all
                    if (!firstName && !lastName) {
                        skippedCount++;
                        continue;
                    }

                    // Determine role based on member type column
                    let role: 'Leader' | 'Shepherd' | 'Member' | 'New Convert' | 'Guest' = 'Member';
                    const memberTypeLower = memberTypeRaw.toLowerCase();
                    if (memberTypeLower.includes('new')) {
                        role = 'New Convert';
                    } else if (memberTypeLower.includes('old') || memberTypeLower.includes('member')) {
                        role = 'Member';
                    } else if (memberTypeLower.includes('leader')) {
                        role = 'Leader';
                    } else if (memberTypeLower.includes('shepherd')) {
                        role = 'Shepherd';
                    } else if (memberTypeLower.includes('guest')) {
                        role = 'Guest';
                    }

                    // Check camp name for role keywords too
                    let campName = campRaw;
                    if (campName.toLowerCase().includes('leader')) {
                        role = 'Leader';
                        campName = campName.replace(/leader/i, '').trim();
                    } else if (campName.toLowerCase().includes('shepherd')) {
                        role = 'Shepherd';
                        campName = campName.replace(/shepherd/i, '').trim();
                    }

                    // Get camp ID
                    let campId: string | null = null;
                    if (campName) {
                        campId = await getCampId(campName) ?? null;
                    }

                    // Parse birthday
                    let birthday: string | null = null;
                    if (birthdayRaw) {
                        try {
                            const parsed = new Date(birthdayRaw);
                            if (!isNaN(parsed.getTime())) {
                                birthday = parsed.toISOString().split('T')[0];
                            }
                        } catch {
                            // Ignore invalid dates
                        }
                    }

                    // Clean phone number
                    const cleanPhone = phone.replace(/[^\d+]/g, '');

                    // Upsert member - use email if available, otherwise phone
                    const memberData = {
                        firstName: firstName || 'Unknown',
                        lastName: lastName || 'Unknown',
                        email: email || null,
                        phone: cleanPhone || null,
                        role: role,
                        campId: campId,
                        campus: 'CoHK' as const,
                        status: 'Active' as const,
                        birthday: birthday,
                    };

                    if (email) {
                        // Use email as unique key
                        await db.insert(members).values(memberData)
                            .onConflictDoUpdate({
                                target: members.email,
                                set: {
                                    firstName: memberData.firstName,
                                    lastName: memberData.lastName,
                                    phone: memberData.phone,
                                    role: memberData.role,
                                    campId: memberData.campId,
                                    birthday: memberData.birthday,
                                }
                            });
                    } else if (cleanPhone) {
                        // Use phone as unique key
                        await db.insert(members).values(memberData)
                            .onConflictDoUpdate({
                                target: members.phone,
                                set: {
                                    firstName: memberData.firstName,
                                    lastName: memberData.lastName,
                                    role: memberData.role,
                                    campId: memberData.campId,
                                    birthday: memberData.birthday,
                                }
                            });
                    } else {
                        // No unique key, just insert
                        await db.insert(members).values(memberData);
                    }

                    // Update camp leader if applicable
                    if (role === 'Leader' && campId && cleanPhone) {
                        const memberRecord = await db.select().from(members).where(eq(members.phone, cleanPhone)).limit(1);
                        if (memberRecord[0]) {
                            await db.update(camps)
                                .set({ leaderId: memberRecord[0].id })
                                .where(eq(camps.id, campId));
                        }
                    }

                    syncedCount++;
                } catch (rowError: any) {
                    errors.push(`Row ${i + 2}: ${rowError.message}`);
                }
            }

            const result = {
                success: true,
                count: syncedCount,
                skipped: skippedCount,
                errors: errors.length,
                message: `Successfully synced ${syncedCount} members.${skippedCount > 0 ? ` Skipped ${skippedCount} rows with missing names.` : ''}${errors.length > 0 ? ` ${errors.length} rows had errors.` : ''}`,
                columnMapping: columnMap,
                foundHeaders: headers,
            };

            console.log('Sync result:', result);
            return result;

        } catch (error: any) {
            console.error('Sync Error:', error);
            return { success: false, message: error.message || 'Failed to sync.' };
        }
    });
