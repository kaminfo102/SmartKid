package ir.chootkeh.koodaknabegheh;

import android.app.Activity;
import android.content.pm.ActivityInfo;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AppOrientation")
public class OrientationPlugin extends Plugin {

  @PluginMethod
  public void lockLandscape(PluginCall call) {
    final Activity activity = getActivity();
    if (activity == null) {
      call.reject("Activity unavailable");
      return;
    }
    activity.runOnUiThread(() -> {
      activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
      call.resolve();
    });
  }

  @PluginMethod
  public void unlock(PluginCall call) {
    final Activity activity = getActivity();
    if (activity == null) {
      call.reject("Activity unavailable");
      return;
    }
    activity.runOnUiThread(() -> {
      activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
      call.resolve();
    });
  }
}
