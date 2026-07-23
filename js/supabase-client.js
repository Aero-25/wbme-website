/* WBME Supabase client — shared by the Projects blog (public reads)
   and the Admin portal (auth + writes). Requires the supabase-js UMD
   script to be loaded on the page before this file. */
(function () {
  'use strict';
  var SUPABASE_URL = 'https://kbmgpqwmgthswjkfmqfe.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtibWdwcXdtZ3Roc3dqa2ZtcWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyOTk2NTMsImV4cCI6MjA5Nzg3NTY1M30.rSiN4Q-UnK5_qK9zBZFHF7m1Uu1EAX51wsHq9UqdgAg';

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    window.WBME_SUPABASE = null;
    return;
  }
  window.WBME_SUPABASE = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();
