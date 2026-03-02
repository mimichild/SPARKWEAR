package com.heartsonfire.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(PhotoStorageBridgePlugin.class);
    super.onCreate(savedInstanceState);
  }
}
