import { getSupabaseClient } from './supabase'

const BUCKET_NAME = 'member-avatars'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export interface UploadResult {
    success: boolean
    url?: string
    error?: string
}

/**
 * Upload a profile picture to Supabase Storage
 * @param file - The file to upload
 * @param memberId - The member's ID (used as folder name)
 * @returns Upload result with public URL or error
 */
export async function uploadProfilePicture(file: File, memberId: string): Promise<UploadResult> {
    const supabase = getSupabaseClient()

    if (!supabase) {
        return { success: false, error: 'Storage not available' }
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
        return { success: false, error: 'File too large. Maximum size is 5MB.' }
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
        return { success: false, error: 'Invalid file type. Please upload JPEG, PNG, WebP, or GIF.' }
    }

    try {
        // Create a unique filename with timestamp
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const fileName = `${memberId}/avatar-${Date.now()}.${fileExt}`

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true
            })

        if (error) {
            console.error('Storage upload error:', error)
            return { success: false, error: error.message }
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(data.path)

        return { success: true, url: urlData.publicUrl }
    } catch (error) {
        console.error('Upload error:', error)
        return { success: false, error: 'Failed to upload image' }
    }
}

/**
 * Delete old profile picture from storage
 * @param url - The public URL of the file to delete
 */
export async function deleteProfilePicture(url: string): Promise<boolean> {
    const supabase = getSupabaseClient()

    if (!supabase) {
        return false
    }

    try {
        // Extract path from URL
        const urlObj = new URL(url)
        const path = urlObj.pathname.split(`/${BUCKET_NAME}/`)[1]

        if (!path) {
            return false
        }

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([path])

        return !error
    } catch (error) {
        console.error('Delete error:', error)
        return false
    }
}
