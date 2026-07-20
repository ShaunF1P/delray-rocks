import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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

const fallbackPath = path.join(process.cwd(), 'src', 'lib', 'coastal_signups_fallback.json');

function getLocalSignups() {
  if (fs.existsSync(fallbackPath)) {
    try {
      return JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
    } catch (e) {
      return [];
    }
  }
  return [];
}

function saveLocalSignups(data) {
  fs.writeFileSync(fallbackPath, JSON.stringify(data, null, 2), 'utf8');
}

export async function GET() {
  try {
    let dbSignups = [];
    let dbError = null;

    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { data, error } = await supabaseAdmin
        .from('coastal_signups')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        dbError = error.message;
      } else {
        dbSignups = data || [];
      }
    } catch (err) {
      dbError = err.message;
    }

    const localSignups = getLocalSignups();

    // Merge lists, resolving duplicates by parent_first_name + parent_last_name + player_name + phone
    const mergedMap = new Map();
    
    // Add local ones first (so they are preferred or merged)
    localSignups.forEach(s => {
      const key = `${s.parent_first_name}_${s.parent_last_name}_${s.player_name}_${s.phone}`.toLowerCase();
      mergedMap.set(key, s);
    });

    // Add db ones (overwrite or add new)
    dbSignups.forEach(s => {
      const key = `${s.parent_first_name}_${s.parent_last_name}_${s.player_name}_${s.phone}`.toLowerCase();
      mergedMap.set(key, s);
    });

    const result = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    return NextResponse.json({ success: true, signups: result, dbError });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Toggle attendance or update signup
export async function POST(request) {
  try {
    const { id, attended } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // 1. Try to update Supabase
    let dbUpdated = false;
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { error } = await supabaseAdmin
        .from('coastal_signups')
        .update({ attended: !!attended })
        .eq('id', id);
      
      if (!error) {
        dbUpdated = true;
      }
    } catch (err) {
      // Ignore DB error, fallback will handle it
    }

    // 2. Always update local fallback if the id is local or to sync
    const localSignups = getLocalSignups();
    let localUpdated = false;
    const updatedLocal = localSignups.map(s => {
      if (s.id === id) {
        localUpdated = true;
        return { ...s, attended: !!attended };
      }
      return s;
    });

    if (localUpdated) {
      saveLocalSignups(updatedLocal);
    } else if (!dbUpdated) {
      // If not updated in local file and DB update failed, it might be a DB record that we need to cache locally
      try {
        const supabaseAdmin = getSupabaseAdmin();
        const { data } = await supabaseAdmin.from('coastal_signups').select('*').eq('id', id).single();
        if (data) {
          localSignups.push({ ...data, attended: !!attended });
          saveLocalSignups(localSignups);
        }
      } catch (e) {
        // Ignore
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
