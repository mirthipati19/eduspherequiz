import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-safeexambrowser-configkeyhash',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { quizId, requestUrl, accessToken } = await req.json();
    
    // Fetch quiz SEB configuration first
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('seb_config_key, seb_browser_exam_key, require_seb')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      console.error('Quiz fetch error:', quizError);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Quiz not found' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if SEB is required for this quiz
    if (!quiz.require_seb) {
      return new Response(
        JSON.stringify({ 
          valid: true, 
          message: 'SEB not required for this quiz' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // If access token is provided, validate it instead of SEB headers
    if (accessToken) {
      const { data: attempt, error: attemptError } = await supabase
        .from('quiz_attempts')
        .select('id, quiz_id')
        .eq('quiz_id', quizId)
        .eq('access_token', accessToken)
        .maybeSingle();

      if (!attemptError && attempt) {
        console.log('SEB validation passed via access token:', { quizId, accessToken });
        return new Response(
          JSON.stringify({ 
            valid: true, 
            message: 'SEB validation successful via access token',
            validated_with: 'access_token'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }
    
    // Get SEB header for traditional SEB validation
    const sebHeader = req.headers.get('X-SafeExamBrowser-ConfigKeyHash') || '';
    
    if (!sebHeader) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'SEB header missing', 
          message: 'Safe Exam Browser is required for this quiz. Please ensure you opened the quiz via the .seb file.' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!quiz.seb_config_key) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Quiz SEB configuration missing' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Extract hash from SEB header (format: "hash;")
    const receivedHash = sebHeader.split(';')[0].trim();
    
    // Validate Config Key hash
    const fullUrl = requestUrl || `${new URL(req.url).origin}/quiz/${quizId}`;
    const expectedConfigHash = await crypto.subtle.digest(
      'SHA-256', 
      new TextEncoder().encode(fullUrl + quiz.seb_config_key)
    );
    const expectedConfigHashHex = Array.from(new Uint8Array(expectedConfigHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    let isValidConfig = receivedHash === expectedConfigHashHex;
    
    // Also try Browser Exam Key if Config Key doesn't match
    let isValidBrowser = false;
    if (!isValidConfig && quiz.seb_browser_exam_key) {
      const expectedBrowserHash = await crypto.subtle.digest(
        'SHA-256', 
        new TextEncoder().encode(fullUrl + quiz.seb_browser_exam_key)
      );
      const expectedBrowserHashHex = Array.from(new Uint8Array(expectedBrowserHash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      isValidBrowser = receivedHash === expectedBrowserHashHex;
    }

    const isValid = isValidConfig || isValidBrowser;
    
    console.log('SEB Validation:', {
      quizId,
      receivedHash,
      expectedConfigHashHex,
      isValidConfig,
      isValidBrowser,
      isValid
    });

    if (isValid) {
      return new Response(
        JSON.stringify({ 
          valid: true, 
          message: 'SEB validation successful',
          validated_with: isValidConfig ? 'config_key' : 'browser_exam_key'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'SEB validation failed',
          message: 'Invalid Safe Exam Browser configuration. Please ensure you are using the correct .seb file.'
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('SEB validation error:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: 'Internal server error',
        message: 'Failed to validate SEB session'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});