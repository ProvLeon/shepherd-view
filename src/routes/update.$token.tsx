import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { validateUpdateToken, updateMemberProfile } from '@/server/profile-update'
import { uploadProfilePicture } from '@/lib/storage'
import { User, Mail, Phone, Calendar, MapPin, Camera, Loader2, CheckCircle, AlertCircle, Sparkles, Upload, Users, ChevronRight, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/update/$token')({
    component: PublicProfileUpdate,
})

interface MemberData {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    birthday: string | null
    residence: string | null
    region: string | null
    guardian: string | null
    guardianContact: string | null
    guardianLocation: string | null
    profilePicture: string | null
    campus: string | null
}

function PublicProfileUpdate() {
    const { token } = Route.useParams()
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [member, setMember] = useState<MemberData | null>(null)
    const [uploading, setUploading] = useState(false)
    const [step, setStep] = useState(1) // Multi-step form: 1 = Personal, 2 = Location, 3 = Guardian
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Form state
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        birthday: '',
        residence: '',
        region: '',
        guardian: '',
        guardianContact: '',
        guardianLocation: '',
        profilePicture: ''
    })

    useEffect(() => {
        const validate = async () => {
            try {
                const result = await validateUpdateToken({ data: { token } })
                if (result.valid && result.member) {
                    setMember(result.member)
                    setFormData({
                        firstName: result.member.firstName || '',
                        lastName: result.member.lastName || '',
                        email: result.member.email || '',
                        phone: result.member.phone || '',
                        birthday: result.member.birthday || '',
                        residence: result.member.residence || '',
                        region: result.member.region || '',
                        guardian: result.member.guardian || '',
                        guardianContact: result.member.guardianContact || '',
                        guardianLocation: result.member.guardianLocation || '',
                        profilePicture: result.member.profilePicture || ''
                    })
                } else {
                    setError(result.message || 'Invalid or expired link')
                }
            } catch (e) {
                setError('Unable to validate link')
            } finally {
                setLoading(false)
            }
        }
        validate()
    }, [token])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        setError(null)

        try {
            const result = await updateMemberProfile({
                data: {
                    token,
                    updates: {
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        email: formData.email || null,
                        phone: formData.phone || null,
                        birthday: formData.birthday || null,
                        residence: formData.residence || null,
                        region: formData.region || null,
                        guardian: formData.guardian || null,
                        guardianContact: formData.guardianContact || null,
                        guardianLocation: formData.guardianLocation || null,
                        profilePicture: formData.profilePicture || null
                    }
                }
            })

            if (result.success) {
                setSuccess(true)
            } else {
                setError(result.message || 'Failed to update profile')
            }
        } catch (e) {
            setError('Error updating profile')
        } finally {
            setSubmitting(false)
        }
    }

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !member) return

        setUploading(true)
        setError(null)

        try {
            const result = await uploadProfilePicture(file, member.id)
            if (result.success && result.url) {
                setFormData(prev => ({ ...prev, profilePicture: result.url! }))
            } else {
                setError(result.error || 'Failed to upload image')
            }
        } catch (err) {
            setError('Error uploading image')
        } finally {
            setUploading(false)
        }
    }

    const nextStep = () => setStep(s => Math.min(s + 1, 3))
    const prevStep = () => setStep(s => Math.max(s - 1, 1))

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-linear-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-purple-600 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Validating your link...</p>
                    <p className="text-sm text-gray-400 mt-1">Please wait</p>
                </div>
            </div>
        )
    }

    // Error state
    if (error && !member) {
        return (
            <div className="min-h-screen bg-linear-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-10 h-10 text-red-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Expired</h1>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <p className="text-sm text-gray-500">Please contact your shepherd to request a new update link.</p>
                </div>
            </div>
        )
    }

    // Success state
    if (success) {
        return (
            <div className="min-h-screen bg-linear-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Updated!</h1>
                    <p className="text-gray-600 mb-6">Thank you for updating your information. You can now close this page.</p>
                    <div className="p-4 bg-purple-50 rounded-2xl">
                        <Sparkles className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                        <p className="text-sm text-purple-700 font-medium">God bless you!</p>
                    </div>
                </div>
            </div>
        )
    }

    // Multi-step Form
    return (
        <div className="min-h-screen bg-linear-to-br from-purple-50 via-white to-blue-50 py-6 px-4">
            <div className="max-w-lg mx-auto">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-linear-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                        <User className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900">Update Your Profile</h1>
                    <p className="text-gray-500 text-sm">Agape Incorporated Ministries</p>
                </div>

                {/* Progress Indicator */}
                <div className="flex items-center justify-center gap-2 mb-6">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${step === s
                                        ? 'bg-purple-600 text-white'
                                        : step > s
                                            ? 'bg-green-500 text-white'
                                            : 'bg-gray-200 text-gray-500'
                                    }`}
                            >
                                {step > s ? '✓' : s}
                            </div>
                            {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-green-500' : 'bg-gray-200'}`} />}
                        </div>
                    ))}
                </div>
                <div className="text-center mb-6">
                    <p className="text-sm text-gray-500">
                        {step === 1 && 'Personal Information'}
                        {step === 2 && 'Location Details'}
                        {step === 3 && 'Guardian Information'}
                    </p>
                </div>

                {/* Profile Picture - Always Visible */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            {formData.profilePicture ? (
                                <img
                                    src={formData.profilePicture}
                                    alt="Profile"
                                    className="w-16 h-16 rounded-full object-cover border-4 border-purple-100"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-linear-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xl font-bold border-4 border-purple-100">
                                    {formData.firstName[0]}{formData.lastName[0]}
                                </div>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="absolute -bottom-1 -right-1 w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-md hover:bg-purple-700 transition-colors disabled:opacity-50"
                            >
                                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-gray-900">{formData.firstName} {formData.lastName}</p>
                            <p className="text-xs text-gray-500">{member?.campus || 'Member'}</p>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="text-xs text-purple-600 hover:text-purple-700 mt-1 flex items-center gap-1"
                            >
                                <Upload className="w-3 h-3" />
                                {uploading ? 'Uploading...' : 'Upload Photo'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Form Steps */}
                <form onSubmit={handleSubmit}>
                    {/* Step 1: Personal Information */}
                    {step === 1 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4 animate-in fade-in duration-300">
                            <div className="flex items-center gap-2 mb-2">
                                <User className="w-4 h-4 text-purple-600" />
                                <h2 className="font-semibold text-gray-900">Personal Information</h2>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
                                    <Input
                                        value={formData.firstName}
                                        onChange={(e) => handleChange('firstName', e.target.value)}
                                        placeholder="First Name"
                                        required
                                        className="h-10"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
                                    <Input
                                        value={formData.lastName}
                                        onChange={(e) => handleChange('lastName', e.target.value)}
                                        placeholder="Last Name"
                                        required
                                        className="h-10"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    <Mail className="w-3.5 h-3.5 inline mr-1" />Email
                                </label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    placeholder="your@email.com"
                                    className="h-10"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    <Phone className="w-3.5 h-3.5 inline mr-1" />Phone
                                </label>
                                <Input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                    placeholder="0XX XXX XXXX"
                                    className="h-10"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    <Calendar className="w-3.5 h-3.5 inline mr-1" />Birthday
                                </label>
                                <Input
                                    type="date"
                                    value={formData.birthday}
                                    onChange={(e) => handleChange('birthday', e.target.value)}
                                    className="h-10"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Location */}
                    {step === 2 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4 animate-in fade-in duration-300">
                            <div className="flex items-center gap-2 mb-2">
                                <MapPin className="w-4 h-4 text-purple-600" />
                                <h2 className="font-semibold text-gray-900">Location Details</h2>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    <MapPin className="w-3.5 h-3.5 inline mr-1" />Residence
                                </label>
                                <Input
                                    value={formData.residence}
                                    onChange={(e) => handleChange('residence', e.target.value)}
                                    placeholder="e.g., Ayeduase, Bomso, Kentinkrono"
                                    className="h-10"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Region</label>
                                <Input
                                    value={formData.region}
                                    onChange={(e) => handleChange('region', e.target.value)}
                                    placeholder="e.g., Ashanti Region"
                                    className="h-10"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Guardian Information */}
                    {step === 3 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4 animate-in fade-in duration-300">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="w-4 h-4 text-purple-600" />
                                <h2 className="font-semibold text-gray-900">Guardian / Next of Kin</h2>
                            </div>
                            <p className="text-xs text-gray-500 -mt-2 mb-3">Emergency contact information</p>

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Guardian Name</label>
                                <Input
                                    value={formData.guardian}
                                    onChange={(e) => handleChange('guardian', e.target.value)}
                                    placeholder="Full name of guardian"
                                    className="h-10"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    <Phone className="w-3.5 h-3.5 inline mr-1" />Guardian Contact
                                </label>
                                <Input
                                    type="tel"
                                    value={formData.guardianContact}
                                    onChange={(e) => handleChange('guardianContact', e.target.value)}
                                    placeholder="0XX XXX XXXX"
                                    className="h-10"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    <MapPin className="w-3.5 h-3.5 inline mr-1" />Guardian Location
                                </label>
                                <Input
                                    value={formData.guardianLocation}
                                    onChange={(e) => handleChange('guardianLocation', e.target.value)}
                                    placeholder="e.g., Accra, Kumasi"
                                    className="h-10"
                                />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex gap-3 mt-6">
                        {step > 1 && (
                            <Button
                                type="button"
                                onClick={prevStep}
                                variant="outline"
                                className="flex-1 h-12 rounded-xl"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Back
                            </Button>
                        )}

                        {step < 3 ? (
                            <Button
                                type="button"
                                onClick={nextStep}
                                className="flex-1 h-12 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-medium"
                            >
                                Next
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 h-12 bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-medium shadow-lg shadow-green-200"
                            >
                                {submitting ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </form>

                <p className="text-center text-xs text-gray-400 mt-6">
                    Agape Incorporated Ministries © 2026
                </p>
            </div>
        </div>
    )
}
