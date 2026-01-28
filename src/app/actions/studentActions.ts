'use server'

import { createClient } from '@supabase/supabase-js'

// Setup Admin Client
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
      // 1. Limpyohan ang Last Name (e.g., "Ramber" -> "ramber")
      const lastName = parts[0].trim().toLowerCase().replace(/[^a-z0-9]/g, '')
      
      // 2. Kuhaon ang First Name part (e.g., " Abdul Malik C.")
      const firstNameRaw = parts[1].trim().toLowerCase()
      
      // 3. I-split by space para makuha ang mga pangalan
      // Filter logic: Tangtangon ang mga parts nga 1 letter lang (Middle Initial) o naay dot
      const firstNameParts = firstNameRaw.split(' ').filter(name => {
         const cleanName = name.replace('.', '');
         return cleanName.length > 1; // Kuhaon lang kung mas taas sa 1 letter (remove "C." or "J")
      });

      // I-join balik ang first name nga walay space (e.g., "abdulmalik")
      const cleanFirstName = firstNameParts.join('').replace(/[^a-z0-9]/g, '')

      // Format: firstnamelastname (e.g., abdulmalikramber)
      return `${cleanFirstName}${lastName}`
    } else {
      // Fallback kung walay comma
      return fullName.toLowerCase().replace(/[^a-z0-9]/g, '')
    }
  } catch (e) {
    return 'student'
  }
}

// 1. ADD STUDENT ACTION
export async function createStudentWithAccount(formData: any) {
  const { student_id, full_name, gender, course, year_level } = formData
  
  // A. Generate Email Prefix (firstnamelastname)
  const emailPrefix = generateEmailPrefix(full_name)
  
  // B. Limpyohan ang ID Number (Tangtangon ang dash '-')
  // Example: "10-10000" mahimong "1010000"
  const cleanId = student_id.toString().replace(/[^0-9]/g, '')

  // C. Set Email & Password
  const email = `${emailPrefix}.${cleanId}@gmail.com`
  const password = cleanId // Password is ID number without dash

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
}

// 2. SYNC ACTION
export async function syncAllMissingAccounts() {
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

  let successCount = 0
  let failCount = 0

  for (const student of studentsToSync) {
    const { student_id, full_name } = student
    
    // A. Generate Email Prefix
    const emailPrefix = generateEmailPrefix(full_name)
    
    // B. Limpyohan ang ID (Remove Dash)
    const cleanId = student_id.toString().replace(/[^0-9]/g, '')

    // C. Set Email & Password
    const email = `${emailPrefix}.${cleanId}@gmail.com`
    const password = cleanId

    // Create Account
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
      else {
        console.error(`Update failed for ${full_name}:`, updateError.message)
        failCount++
      }
    } else {
      if (createError?.message?.includes("already registered")) {
         console.log(`Skipping ${full_name}: Email already registered.`)
      }
      failCount++
    }
  }

  return { 
    success: true, 
    message: `Sync Done. Target: ${studentsToSync.length}. Success: ${successCount}, Failed/Skipped: ${failCount}` 
  }
}

// 3. UNSYNC ACTION (DELETE ALL STUDENT ACCOUNTS)
export async function unsyncAllAccounts() {
  // 1. Kuhaon tanan students nga NAA nay user_id (registered na)
  const { data: students, error } = await supabaseAdmin
    .from('students')
    .select('*')
    .not('user_id', 'is', null) // Filter: Not Null

  if (error || !students) return { success: false, message: `DB Error: ${error?.message}` }
  
  if (students.length === 0) {
    return { success: true, message: "No accounts to unsync." }
  }

  let successCount = 0
  let failCount = 0

  for (const student of students) {
    const authId = student.user_id;

    // 2. Una, i-NULL sa ang user_id sa database (Disconnect)
    // Importante ni buhaton una para dili mag error ang database constraint
    const { error: updateError } = await supabaseAdmin
        .from('students')
        .update({ user_id: null })
        .eq('student_id', student.student_id)

    if (!updateError) {
        // 3. Kung success ang disconnect, I-DELETE dayon ang Auth User
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authId)
        
        if (!deleteError) {
            successCount++
        } else {
            console.error(`Failed to delete auth user for ${student.full_name}:`, deleteError.message)
            // Still count as success kay na-disconnect naman sa table, limpyo na tan-awon
            successCount++ 
        }
    } else {
        console.error(`Failed to unlink DB for ${student.full_name}:`, updateError.message)
        failCount++
    }
  }

  return { 
    success: true, 
    message: `Unsync Complete. Deleted/Unlinked: ${successCount}, Failed: ${failCount}` 
  }
}
