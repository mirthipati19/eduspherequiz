import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quizId, accessToken, quizTitle, frontendUrl } = await req.json();

    if (!quizId || !accessToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Use the provided frontend URL or fall back to the request origin
    const baseUrl = frontendUrl || new URL(req.headers.get('origin') || req.headers.get('referer') || req.url).origin;
    const quizUrl = `${baseUrl}/quiz/${quizId}/take?token=${accessToken}`;

    // Generate SEB config XML with the dynamic quiz URL
    const sebConfig = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "https://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>originatorVersion</key>
    <string>SEB_Win_2.1.1</string>
    <key>startURL</key>
    <string>${quizUrl}</string>
    <key>startResource</key>
    <string />
    <key>sebServerURL</key>
    <string />
    <key>hashedAdminPassword</key>
    <string>99F2BDF9942653AB32D9DFA0B43C72C3FBBB9679450FD965C590C224897B848A</string>
    <key>allowQuit</key>
    <true />
    <key>ignoreExitKeys</key>
    <true />
    <key>hashedQuitPassword</key>
    <string />
    <key>exitKey1</key>
    <integer>2</integer>
    <key>exitKey2</key>
    <integer>10</integer>
    <key>exitKey3</key>
    <integer>5</integer>
    <key>sebMode</key>
    <integer>0</integer>
    <key>browserMessagingSocket</key>
    <string>ws://localhost:8706</string>
    <key>browserMessagingPingTime</key>
    <integer>120000</integer>
    <key>sebConfigPurpose</key>
    <integer>0</integer>
    <key>allowPreferencesWindow</key>
    <true />
    <key>useAsymmetricOnlyEncryption</key>
    <false />
    <key>browserViewMode</key>
    <integer>1</integer>
    <key>browserWindowAllowAddressBar</key>
    <false />
    <key>newBrowserWindowAllowAddressBar</key>
    <false />
    <key>mainBrowserWindowWidth</key>
    <string>100%</string>
    <key>mainBrowserWindowHeight</key>
    <string>100%</string>
    <key>mainBrowserWindowPositioning</key>
    <integer>1</integer>
    <key>enableTouchExit</key>
    <false />
    <key>showMenuBar</key>
    <false />
    <key>showTaskBar</key>
    <true />
    <key>taskBarHeight</key>
    <integer>40</integer>
    <key>showReloadButton</key>
    <true />
    <key>showReloadWarning</key>
    <true />
    <key>showTime</key>
    <true />
    <key>showInputLanguage</key>
    <true />
    <key>allowBrowsingBackForward</key>
    <false />
    <key>enableBrowserWindowToolbar</key>
    <false />
    <key>hideBrowserWindowToolbar</key>
    <false />
    <key>enableZoomPage</key>
    <true />
    <key>enableZoomText</key>
    <true />
    <key>zoomMode</key>
    <integer>0</integer>
    <key>allowDictionaryLookup</key>
    <false />
    <key>allowSpellCheck</key>
    <false />
    <key>allowSpellCheckDictionary</key>
    <array />
    <key>enablePlugIns</key>
    <true />
    <key>enableJava</key>
    <false />
    <key>enableJavaScript</key>
    <true />
    <key>blockPopUpWindows</key>
    <false />
    <key>allowVideoCapture</key>
    <true />
    <key>allowAudioCapture</key>
    <true />
    <key>allowDownUploads</key>
    <true />
    <key>downloadDirectoryOSX</key>
    <string>~/Downloads</string>
    <key>downloadDirectoryWin</key>
    <string />
    <key>openDownloads</key>
    <true />
    <key>chooseFileToUploadPolicy</key>
    <integer>0</integer>
    <key>allowCustomDownUploadLocation</key>
    <false />
    <key>enablePrintScreen</key>
    <false />
    <key>allowPDFPlugIn</key>
    <false />
    <key>allowPDFReaderToolbar</key>
    <false />
    <key>removePDFReaderToolbarLockDownData</key>
    <false />
    <key>allowFlashFullscreen</key>
    <false />
    <key>downloadPDFFiles</key>
    <true />
    <key>allowWLAN</key>
    <false />
    <key>restartExamPasswordProtected</key>
    <true />
    <key>restartExamURL</key>
    <string />
    <key>restartExamText</key>
    <string />
    <key>restartExamUseStartURL</key>
    <false />
    <key>quitURL</key>
    <string />
    <key>quitURLConfirm</key>
    <true />
    <key>sendBrowserExamKey</key>
    <true />
    <key>examKeySalt</key>
    <data />
    <key>urlFilterEnable</key>
    <false />
    <key>urlFilterEnableContentFilter</key>
    <false />
    <key>urlFilterRules</key>
    <array />
    <key>blacklistURLFilter</key>
    <array />
    <key>whitelistURLFilter</key>
    <array />
    <key>urlFilterRegex</key>
    <true />
    <key>urlFilterTrustedContent</key>
    <false />
    <key>showSideMenu</key>
    <false />
    <key>showNavigationButtons</key>
    <false />
    <key>blockScreenSharing</key>
    <true />
    <key>lockOnMessageSocketClose</key>
    <false />
    <key>allowUserSwitching</key>
    <false />
    <key>allowUserAppFolderInstall</key>
    <false />
    <key>forceAppFolderInstall</key>
    <false />
    <key>allowApplicationLog</key>
    <false />
    <key>enableLogging</key>
    <true />
    <key>logLevel</key>
    <integer>1</integer>
    <key>allowVirtualMachine</key>
    <true />
    <key>detectVirtualMachine</key>
    <true />
    <key>oskBehavior</key>
    <integer>0</integer>
    <key>audioControlEnabled</key>
    <true />
    <key>audioMute</key>
    <false />
    <key>audioSetVolumeLevel</key>
    <false />
    <key>audioVolumeLevel</key>
    <integer>25</integer>
    <key>allowedDisplayBuiltin</key>
    <true />
    <key>allowedDisplaysMaxNumber</key>
    <integer>1</integer>
    <key>allowDisplayMirroring</key>
    <false />
    <key>allowSiri</key>
    <false />
    <key>minMacOSVersion</key>
    <integer>4</integer>
    <key>enableURLContentFilter</key>
    <false />
    <key>enableURLFilter</key>
    <false />
    <key>urlFilterIgnoreList</key>
    <array />
    <key>permittedProcesses</key>
    <array />
    <key>prohibitedProcesses</key>
    <array />
    <key>browserUserAgent</key>
    <string />
    <key>browserUserAgentWinDesktopMode</key>
    <integer>0</integer>
    <key>browserUserAgentWinDesktopModeCustom</key>
    <string />
    <key>browserUserAgentWinTouchMode</key>
    <integer>0</integer>
    <key>browserUserAgentWinTouchModeCustom</key>
    <string />
    <key>browserUserAgentMac</key>
    <integer>0</integer>
    <key>browserUserAgentMacCustom</key>
    <string />
    <key>browserUserAgentiOS</key>
    <integer>0</integer>
    <key>browserUserAgentiOSCustom</key>
    <string />
    <key>newBrowserWindowByLinkPolicy</key>
    <integer>2</integer>
    <key>newBrowserWindowByScriptPolicy</key>
    <integer>2</integer>
    <key>newBrowserWindowByLinkBlockForeign</key>
    <false />
    <key>newBrowserWindowByScriptBlockForeign</key>
    <false />
    <key>newBrowserWindowNavigation</key>
    <true />
    <key>newBrowserWindowShowReloadWarning</key>
    <false />
    <key>newBrowserWindowAllowReload</key>
    <true />
    <key>newBrowserWindowShowURL</key>
    <integer>1</integer>
    <key>zoomLevel</key>
    <string>100%</string>
    <key>allowFind</key>
    <true />
    <key>touchOptimized</key>
    <false />
    <key>browserWindowWebView</key>
    <integer>3</integer>
    <key>createNewDesktop</key>
    <true />
    <key>killExplorerShell</key>
    <false />
    <key>allScreens</key>
    <false />
    <key>elevateWindowDecorations</key>
    <false />
    <key>browserScreenKeyboard</key>
    <false />
    <key>sebServicePolicy</key>
    <integer>1</integer>
    <key>allowSwitchToApplications</key>
    <false />
    <key>AllowedApplicationsList</key>
    <array />
    <key>displayIgnoresMouseEvents</key>
    <false />
    <key>InsecureSSLAllowed</key>
    <false />
    <key>pinEmbeddedCertificates</key>
    <false />
    <key>embeddedCertificates</key>
    <array />
    <key>showScrollToBottom</key>
    <false />
    <key>showScrollToTop</key>
    <false />
  </dict>
</plist>`;

    console.log('Generated SEB config for quiz:', quizId, 'with URL:', quizUrl);

    return new Response(
      sebConfig,
      { 
        status: 200,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/x-apple-plist',
          'Content-Disposition': `attachment; filename="${(quizTitle || 'quiz').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_seb_config.seb"`
        } 
      }
    );

  } catch (error) {
    console.error('SEB config generation error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: 'Failed to generate SEB configuration'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
