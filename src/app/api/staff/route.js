import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client using the Service Role Key
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase URL or Service Role Key is missing from environment variables');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// POST: Create a new staff account
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, firstName, lastName, phone, title, specialty, role, accessPermissions, backgroundCheck, certification, sortOrder } = body;

    let finalFirstName = firstName || '';
    let finalLastName = lastName || '';

    // Automatically split single 'name' if separate fields are not provided
    if (name && (!finalFirstName || !finalLastName)) {
      const parts = name.trim().split(/\s+/);
      finalFirstName = parts[0] || '';
      finalLastName = parts.slice(1).join(' ') || '';
    }

    if (!finalFirstName || !finalLastName || !title) {
      return NextResponse.json({ error: 'First name, last name, and title are required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Generate standard email: lastname + firstinitial + @delrayrocks.app
    const cleanFirst = finalFirstName.trim().toLowerCase().replace(/[^a-z]/g, '');
    const cleanLast = finalLastName.trim().toLowerCase().replace(/[^a-z]/g, '');
    const initial = cleanFirst.charAt(0);
    const username = `${cleanLast}${initial}`;
    const email = `${username}@delrayrocks.app`;
    const password = 'Rocks2026!'; // Standard default temporary password

    console.log(`[Staff API] Creating auth user for ${finalFirstName} ${finalLastName} (${email})...`);

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: finalFirstName,
        last_name: finalLastName,
      },
    });

    if (authError) {
      console.error('[Staff API] Auth creation failed:', authError.message);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    const userId = authData.user.id;
    console.log(`[Staff API] Auth user created successfully. ID: ${userId}`);

    // 2. Insert record into profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        org_id: 'a1b2c3d4-0000-0000-0000-000000000001', // Default Org ID
        role: role || 'coach',
        first_name: finalFirstName,
        last_name: finalLastName,
        phone: phone || null,
        title: title,
        access_permissions: accessPermissions || [],
        is_active: true,
      });

    if (profileError) {
      console.error('[Staff API] Profile creation failed. Rolling back auth user:', profileError.message);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // 3. Insert record into coaching_staff table (sync for public/coach rosters)
    const { error: staffError } = await supabaseAdmin
      .from('coaching_staff')
      .insert({
        id: userId,
        name: `${finalFirstName} ${finalLastName}`,
        title: title,
        specialty: specialty || null,
        phone: phone || null,
        email: email,
        background_check: backgroundCheck === true || body.background_check === true,
        certification: certification === true || body.certification === true,
        sort_order: sortOrder || body.sort_order || 10,
      });

    if (staffError) {
      console.warn('[Staff API] Roster sync failed (but profile was created):', staffError.message);
    }

    return NextResponse.json({ success: true, user: authData.user, email });
  } catch (err) {
    console.error('[Staff API] POST Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Update an existing staff account
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, name, firstName, lastName, phone, title, specialty, role, accessPermissions, backgroundCheck, certification, sortOrder } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    let finalFirstName = firstName || '';
    let finalLastName = lastName || '';

    // Automatically split single 'name' if separate fields are not provided
    if (name && (!finalFirstName || !finalLastName)) {
      const parts = name.trim().split(/\s+/);
      finalFirstName = parts[0] || '';
      finalLastName = parts.slice(1).join(' ') || '';
    }

    const supabaseAdmin = getSupabaseAdmin();
    console.log(`[Staff API] Updating staff user ID: ${id}`);

    // 1. Update user metadata in Supabase Auth if names are updated
    if (finalFirstName || finalLastName) {
      const updateData = {};
      if (finalFirstName) updateData.first_name = finalFirstName;
      if (finalLastName) updateData.last_name = finalLastName;

      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
        user_metadata: updateData,
      });

      if (authError) {
        console.warn('[Staff API] Auth metadata update warning:', authError.message);
      }
    }

    // 2. Update profiles table
    const profileUpdate = {};
    if (finalFirstName) profileUpdate.first_name = finalFirstName;
    if (finalLastName) profileUpdate.last_name = finalLastName;
    if (phone !== undefined) profileUpdate.phone = phone || null;
    if (title) profileUpdate.title = title;
    if (role) profileUpdate.role = role;
    if (accessPermissions !== undefined) profileUpdate.access_permissions = accessPermissions;

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(profileUpdate)
      .eq('id', id);

    if (profileError) {
      console.error('[Staff API] Profile update failed:', profileError.message);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // 3. Update coaching_staff table
    const staffUpdate = {};
    if (finalFirstName || finalLastName) {
      let fullName = '';
      if (finalFirstName && finalLastName) {
        fullName = `${finalFirstName} ${finalLastName}`;
      } else {
        const { data: p } = await supabaseAdmin
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', id)
          .single();
        if (p) {
          fullName = `${finalFirstName || p.first_name} ${finalLastName || p.last_name}`;
        }
      }
      if (fullName) staffUpdate.name = fullName;
    }
    if (title) staffUpdate.title = title;
    if (specialty !== undefined) staffUpdate.specialty = specialty || null;
    if (phone !== undefined) staffUpdate.phone = phone || null;
    if (backgroundCheck !== undefined) staffUpdate.background_check = backgroundCheck;
    if (body.background_check !== undefined) staffUpdate.background_check = body.background_check;
    if (certification !== undefined) staffUpdate.certification = certification;
    if (body.certification !== undefined) staffUpdate.certification = body.certification;
    if (sortOrder !== undefined) staffUpdate.sort_order = sortOrder;
    if (body.sort_order !== undefined) staffUpdate.sort_order = body.sort_order;

    const { error: staffError } = await supabaseAdmin
      .from('coaching_staff')
      .update(staffUpdate)
      .eq('id', id);

    if (staffError) {
      console.warn('[Staff API] Roster update warning:', staffError.message);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Staff API] PUT Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Delete a staff account completely
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    console.log(`[Staff API] Deleting staff user ID: ${id}`);

    // 1. Delete from coaching_staff (roster table) first
    const { error: staffError } = await supabaseAdmin
      .from('coaching_staff')
      .delete()
      .eq('id', id);

    if (staffError) {
      console.warn('[Staff API] Roster delete warning:', staffError.message);
    }

    // 2. Delete from profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', id);

    if (profileError) {
      console.error('[Staff API] Profile delete failed:', profileError.message);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // 3. Delete from Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (authError) {
      console.error('[Staff API] Auth delete failed:', authError.message);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Staff API] DELETE Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
