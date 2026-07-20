import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTelegramMessage } from '@/lib/telegram';

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

function extractPlayerName(body) {
  if (!body) return null;
  if (body.player_name) return body.player_name;
  
  if (Array.isArray(body.customFields)) {
    for (const field of body.customFields) {
      if (field.fieldKey === 'contact.player_name' || /player_name/i.test(field.fieldKey || '')) {
        return field.value;
      }
    }
  }
  
  if (body.customFields && typeof body.customFields === 'object') {
    for (const key of Object.keys(body.customFields)) {
      if (key === 'contact.player_name' || /player_name/i.test(key)) {
        return body.customFields[key];
      }
    }
  }
  return null;
}

function extractParentNames(body) {
  const first = body.parent_first_name || body.firstName || body.first_name || '';
  const last = body.parent_last_name || body.lastName || body.last_name || '';
  return { first, last };
}

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('[Coastal Signup] Received payload:', JSON.stringify(body));

    const { first, last } = extractParentNames(body);
    const parent_first_name = first;
    const parent_last_name = last;
    const email = body.email || '';
    const phone = body.phone || '';
    const player_name = extractPlayerName(body) || '';
    const text_opt_in = body.text_opt_in !== undefined ? body.text_opt_in : true;
    const planned_visit = body.planned_visit || '11:30 AM Service & Block Party';

    // Validate inputs
    if (!parent_first_name || !parent_last_name || !email || !phone || !player_name) {
      return NextResponse.json(
        { error: 'Parent/Guardian first name, last name, email, phone, and player name are required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Insert record into Supabase
    let signupData = null;
    let dbSuccess = false;

    try {
      const { data, error } = await supabaseAdmin
        .from('coastal_signups')
        .insert({
          parent_first_name: parent_first_name.trim(),
          parent_last_name: parent_last_name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          text_opt_in: !!text_opt_in,
          player_name: player_name.trim(),
          planned_visit: planned_visit || 'Unspecified',
          attended: false,
        })
        .select()
        .single();

      if (error) {
        console.warn('[Coastal Signup] Supabase error, falling back to local file:', error.message);
      } else {
        signupData = data;
        dbSuccess = true;
      }
    } catch (err) {
      console.warn('[Coastal Signup] Database connection exception, falling back to local file:', err.message);
    }

    // Local file fallback if database write failed
    if (!dbSuccess) {
      const fs = require('fs');
      const path = require('path');
      const crypto = require('crypto');
      const fallbackPath = path.join(process.cwd(), 'src', 'lib', 'coastal_signups_fallback.json');
      
      let localData = [];
      if (fs.existsSync(fallbackPath)) {
        try {
          localData = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
        } catch (e) {
          localData = [];
        }
      }
      
      signupData = {
        id: crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        parent_first_name: parent_first_name.trim(),
        parent_last_name: parent_last_name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        text_opt_in: !!text_opt_in,
        player_name: player_name.trim(),
        planned_visit: planned_visit || 'Unspecified',
        attended: false,
        created_at: new Date().toISOString()
      };
      
      localData.push(signupData);
      fs.writeFileSync(fallbackPath, JSON.stringify(localData, null, 2), 'utf8');
    }

    // Build and send Telegram message to coaching staff
    const emoji = '⛪';
    const message = `${emoji} *New Coastal Community Church Signup!*\n\n` +
      `*Parent/Guardian:* ${parent_first_name.trim()} ${parent_last_name.trim()}\n` +
      `*Email:* ${email.trim()}\n` +
      `*Phone:* ${phone.trim()}\n` +
      `*8U Player:* ${player_name.trim()}\n` +
      `*Planned Visit:* ${planned_visit || 'Unspecified'}\n` +
      `*SMS Opt-in:* ${text_opt_in ? '✅ Yes' : '❌ No'}\n\n` +
      `This signup helps support the Delray Rocks 8U team's $500 sponsorship for uniforms & bags! 🏈`;

    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Fire-and-forget Telegram notification
    sendTelegramMessage(message).catch((err) =>
      console.error('[Coastal Signup] Telegram notification failed:', err.message)
    );

    return NextResponse.json({ success: true, signup: signupData }, { headers });
  } catch (err) {
    console.error('[Coastal Signup] API error:', err);
    return NextResponse.json(
      { error: err.message },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
