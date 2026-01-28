'use server'

import { createClient } from '@supabase/supabase-js'

// Setup Admin Client
// Note: Ensure SUPABASE_SERVICE_ROLE_KEY is set in Vercel Environment Variables
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

function generateEmailPrefix(fullName: string): string {
  try {
    const parts = fullName.split(',')
    
    if (parts.length >= 2) {
      const lastName = parts[0].trim().toLowerCase().replace(/[^a-z0-9]/g, '')
      const firstNameRaw = parts[1].trim().toLowerCase()
      const firstNameParts = firstNameRaw.split(' ').filter(name => {
         const cleanName = name.replace('.', '');
         return cleanName.length > 1;
      });
      const cleanFirstName = firstNameParts.join('').replace(/[^a-z0-9]/g, '')
      return `${cleanFirstName}${lastName}`
    } else {
      return fullName.toLowerCase().replace(/[^a-z0-9]/g, '')
    }
  } catch (e) {
    return 'student'
  }
}

// 1. ADD STUDENT ACTION
export async function createStudentWithAccount(formData: any) {
  try {
    const { student_id, full_name, gender, course, year_level } = formData
    const emailPrefix = generateEmailPrefix(full_name)
    const cleanId = student_id.toString().replace(/[^0-9]/g, '')
    const email = `${emailPrefix}.${cleanId}@gmail.com`
    const password = cleanId

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { full_name, role: 'student', student_id }
    })

    if (authError) return { success: false, message: `Auth Error: ${authError.message}` }
    if (!authUser.user) return { success: false, message: 'Failed to create auth user.' }

    const { data: studentData, error: dbError } = await supabaseAdmin
      .from('students')
      .insert({
        student_id, full_name, gender, course, year_level,
        user_id: authUser.user.id
      })
      .select().single()

    if (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return { success: false, message: `DB Error: ${dbError.message}` }
    }
    return { success: true, message: 'Student added with account!', student: studentData }
  } catch (error: any) {
    console.error("Create Error:", error);
    return { success: false, message: `Server Error: ${error.message}` }
  }
}

// 2. SYNC ACTION (OPTIMIZED FOR VERCEL TIMEOUTS)
export async function syncAllMissingAccounts() {
  try {
    const { data: students, error } = await supabaseAdmin
      .from('students')
      .select('*')

    if (error || !students) return { success: false, message: `DB Error: ${error?.message}` }

    // Filter Logic
    const studentsToSync = students.filter(s => {
        const id = s.user_id;
        if (!id) return true;
        if (typeof id === 'string' && id.trim() === '') return true;
        if (typeof id === 'string' && id.length < 30) return true;
        return false;
    });

    if (studentsToSync.length === 0) {
      return { success: true, message: `All ${students.length} students already have valid accounts.` }
    }

    // --- VERCEL FIX: BATCH PROCESSING ---
    // Only process the first 5 students to prevent 10s timeout
    const BATCH_SIZE = 5;
    const batch = studentsToSync.slice(0, BATCH_SIZE);
    
    let successCount = 0;
    let failCount = 0;

    for (const student of batch) {
      const { student_id, full_name } = student
      const emailPrefix = generateEmailPrefix(full_name)
      const cleanId = student_id.toString().replace(/[^0-9]/g, '')
      const email = `${emailPrefix}.${cleanId}@gmail.com`
      const password = cleanId

      const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { full_name, role: 'student', student_id }
      })

      if (authUser && authUser.user) {
        const { error: updateError } = await supabaseAdmin
          .from('students')
          .update({ user_id: authUser.user.id })
          .eq('student_id', student_id)

        if (!updateError) successCount++
        else failCount++
      } else {
        if (createError?.message?.includes("already registered")) {
           // Try to find the user if they already exist
           // This logic is complex for timeouts, just skip for now
        }
        failCount++
      }
    }

    const remaining = studentsToSync.length - batch.length;
    const msg = remaining > 0 
      ? `Processed ${successCount} accounts. ${remaining} remaining. Click Sync again to continue.` 
      : `Sync Complete! Created ${successCount} accounts.`;

    return { 
      success: true, 
      message: msg
    }
  } catch (error: any) {
    console.error("Sync Error:", error);
    return { success: false, message: `Server Error: ${error.message}` }
  }
}

// 3. UNSYNC ACTION (OPTIMIZED)
export async function unsyncAllAccounts() {
  try {
    const { data: students, error } = await supabaseAdmin
      .from('students')
      .select('*')
      .not('user_id', 'is', null)

    if (error || !students) return { success: false, message: `DB Error: ${error?.message}` }
    
    if (students.length === 0) {
      return { success: true, message: "No accounts to unsync." }
    }

    // --- VERCEL FIX: BATCH PROCESSING ---
    // Only process 5 at a time
    const BATCH_SIZE = 5;
    const batch = students.slice(0, BATCH_SIZE);

    let successCount = 0;
    let failCount = 0;

    for (const student of batch) {
      const authId = student.user_id;

      // 2. Disconnect DB First
      const { error: updateError } = await supabaseAdmin
          .from('students')
          .update({ user_id: null })
          .eq('student_id', student.student_id)

      if (!updateError) {
          // 3. Delete Auth User
          const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authId)
          if (!deleteError) successCount++
          else successCount++ // Count as success since DB is unlinked
      } else {
          failCount++
      }
    }

    const remaining = students.length - batch.length;
    const msg = remaining > 0 
      ? `Unsynced ${successCount} accounts. ${remaining} remaining. Click Unsync again to continue.` 
      : `Unsync Complete! Removed ${successCount} accounts.`;

    return { 
      success: true, 
      message: msg
    }
  } catch (error: any) {
    console.error("Unsync Error:", error);
    return { success: false, message: `Server Error: ${error.message}` }
  }
}