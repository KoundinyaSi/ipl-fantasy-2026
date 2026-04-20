import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminDashboard from '@/components/AdminDashboard'

const ADMIN_EMAILS = [
    process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? '',
    process.env.NEXT_PUBLIC_ADMIN_EMAIL_2 ?? '',
].filter(Boolean)

export default async function AdminPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/')

    const email = user.email ?? ''
    const isAdmin = ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email.toLowerCase())

    if (!isAdmin) redirect('/home')

    return <AdminDashboard currentUserEmail={email} />
}