package com.heartsonfire.app;

import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(PhotoStorageBridgePlugin.class);
    super.onCreate(savedInstanceState);
    injectDebugFlag();
  }

  private void injectDebugFlag() {
    if (getBridge() == null || getBridge().getWebView() == null) return;
    final boolean isDebuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    getBridge().getWebView().post(() -> {
      getBridge().getWebView().evaluateJavascript("window.__CAP_DEBUG__=" + isDebuggable + ";", null);
    });
  }
}
