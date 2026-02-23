package com.heartsonfire.app;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.net.Uri;
import android.util.Base64;
import android.content.Intent;
import android.content.ContentResolver;
import android.database.Cursor;
import android.provider.OpenableColumns;
import androidx.activity.result.ActivityResult;
import androidx.exifinterface.media.ExifInterface;

import com.getcapacitor.JSObject;
import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.InputStream;
import java.io.OutputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(name = "PhotoStorageBridge")
public class PhotoStorageBridgePlugin extends Plugin {
  private static final String PHOTOS_DIR = "photos";
  private static final String PICK_TMP_DIR = "pick_tmp";
  private byte[] pendingBackupBytes = null;
  private String pendingBackupMimeType = "application/zip";
  private Uri pendingBackupUri = null;

  @PluginMethod
  public void pickImages(PluginCall call) {
    int limit = Math.max(1, call.getInt("limit", 20));
    Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
    intent.setType("image/*");
    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, limit > 1);
    intent.addCategory(Intent.CATEGORY_OPENABLE);
    startActivityForResult(call, intent, "pickImagesResult");
  }

  @PluginMethod
  public void saveImage(PluginCall call) {
    try {
      String tempUri = call.getString("tempUri");
      String dataUrl = call.getString("dataUrl");
      byte[] decoded = null;
      if (tempUri != null && !tempUri.isEmpty()) {
        decoded = readUriBytes(Uri.parse(tempUri));
      } else if (dataUrl != null && !dataUrl.isEmpty()) {
        decoded = decodeDataUrl(dataUrl);
      }
      if (decoded == null || decoded.length == 0) {
        call.reject("tempUri or dataUrl is required");
        return;
      }
      String profile = call.getString("profile", "grid");
      Bitmap source = BitmapFactory.decodeByteArray(decoded, 0, decoded.length);
      if (source == null) {
        call.reject("Failed to decode image");
        return;
      }
      source = applyExifOrientation(source, tempUri);

      Profile p = Profile.from(profile);
      Bitmap output = transformBitmap(source, p);
      source.recycle();

      File dir = new File(getContext().getFilesDir(), PHOTOS_DIR);
      if (!dir.exists() && !dir.mkdirs()) {
        call.reject("Cannot create photo directory");
        return;
      }

      String id = UUID.randomUUID().toString();
      File outFile = new File(dir, id + ".jpg");
      FileOutputStream fos = new FileOutputStream(outFile);
      output.compress(Bitmap.CompressFormat.JPEG, p.quality, fos);
      fos.flush();
      fos.close();
      output.recycle();

      JSObject res = new JSObject();
      res.put("id", id);
      res.put("path", Uri.fromFile(outFile).toString());
      res.put("mimeType", "image/jpeg");
      res.put("size", outFile.length());
      res.put("width", p.outW);
      res.put("height", p.outH);
      res.put("profile", p.name);
      res.put("createdAt", String.valueOf(System.currentTimeMillis()));
      res.put("storage", "native");
      cleanupTempUri(tempUri);
      call.resolve(res);
    } catch (Exception err) {
      call.reject("saveImage failed: " + err.getMessage());
    }
  }

  @ActivityCallback
  private void pickImagesResult(PluginCall call, ActivityResult result) {
    if (call == null) return;
    if (result == null || result.getResultCode() != android.app.Activity.RESULT_OK) {
      call.resolve(new JSObject().put("images", new JSArray()));
      return;
    }
    Intent data = result.getData();
    if (data == null) {
      call.resolve(new JSObject().put("images", new JSArray()));
      return;
    }
    int limit = Math.max(1, call.getInt("limit", 20));
    List<Uri> uris = new ArrayList<>();
    if (data.getClipData() != null) {
      int count = Math.min(data.getClipData().getItemCount(), limit);
      for (int i = 0; i < count; i += 1) {
        Uri uri = data.getClipData().getItemAt(i).getUri();
        if (uri != null) uris.add(uri);
      }
    } else if (data.getData() != null) {
      uris.add(data.getData());
    }
    JSArray images = new JSArray();
    for (Uri uri : uris) {
      JSObject row = copyPickedUriToTemp(uri);
      if (row != null) images.put(row);
    }
    JSObject payload = new JSObject();
    payload.put("images", images);
    call.resolve(payload);
  }

  @PluginMethod
  public void getImageSrc(PluginCall call) {
    String path = call.getString("path", "");
    JSObject res = new JSObject();
    res.put("path", path);
    res.put("webSrc", path);
    call.resolve(res);
  }

  @PluginMethod
  public void readImage(PluginCall call) {
    String path = call.getString("path", "");
    if (path.isEmpty()) {
      call.reject("path is required");
      return;
    }
    try {
      String normalized = path.startsWith("file://") ? path.substring("file://".length()) : path;
      File file = new File(normalized);
      if (!file.exists() || !file.isFile()) {
        call.reject("file not found");
        return;
      }
      InputStream in = new FileInputStream(file);
      ByteArrayOutputStream out = new ByteArrayOutputStream();
      byte[] buffer = new byte[16 * 1024];
      int n;
      while ((n = in.read(buffer)) > 0) out.write(buffer, 0, n);
      in.close();
      byte[] bytes = out.toByteArray();
      String b64 = Base64.encodeToString(bytes, Base64.NO_WRAP);
      String mimeType = "image/jpeg";
      if (normalized.endsWith(".png")) mimeType = "image/png";
      JSObject res = new JSObject();
      res.put("dataUrl", "data:" + mimeType + ";base64," + b64);
      res.put("mimeType", mimeType);
      res.put("size", bytes.length);
      call.resolve(res);
    } catch (Exception err) {
      call.reject("readImage failed: " + err.getMessage());
    }
  }

  @PluginMethod
  public void deleteImage(PluginCall call) {
    String path = call.getString("path", "");
    if (path.isEmpty()) {
      call.reject("path is required");
      return;
    }
    try {
      String normalized = path.startsWith("file://") ? path.substring("file://".length()) : path;
      File file = new File(normalized);
      boolean deleted = !file.exists() || file.delete();
      JSObject res = new JSObject();
      res.put("deleted", deleted);
      call.resolve(res);
    } catch (Exception err) {
      call.reject("deleteImage failed: " + err.getMessage());
    }
  }

  @PluginMethod
  public void getStorageStats(PluginCall call) {
    File dir = new File(getContext().getFilesDir(), PHOTOS_DIR);
    File[] files = dir.exists() ? dir.listFiles() : new File[0];
    long bytes = 0;
    int count = 0;
    if (files != null) {
      for (File f : files) {
        if (f != null && f.isFile()) {
          bytes += f.length();
          count += 1;
        }
      }
    }
    JSObject res = new JSObject();
    res.put("count", count);
    res.put("bytes", bytes);
    res.put("path", dir.getAbsolutePath());
    call.resolve(res);
  }

  @PluginMethod
  public void cleanupOrphans(PluginCall call) {
    try {
      JSArray arr = call.getArray("referencedPaths", new JSArray());
      Set<String> keep = new HashSet<>();
      for (int i = 0; i < arr.length(); i += 1) {
        String value = String.valueOf(arr.get(i));
        if (value == null || value.isEmpty()) continue;
        keep.add(value);
        if (value.startsWith("file://")) keep.add(value.substring("file://".length()));
      }
      File dir = new File(getContext().getFilesDir(), PHOTOS_DIR);
      File[] files = dir.exists() ? dir.listFiles() : new File[0];
      int deleted = 0;
      if (files != null) {
        for (File file : files) {
          if (file == null || !file.isFile()) continue;
          String abs = file.getAbsolutePath();
          String uri = Uri.fromFile(file).toString();
          if (keep.contains(abs) || keep.contains(uri)) continue;
          if (file.delete()) deleted += 1;
        }
      }
      JSObject res = new JSObject();
      res.put("deleted", deleted);
      call.resolve(res);
    } catch (Exception err) {
      call.reject("cleanupOrphans failed: " + err.getMessage());
    }
  }

  @PluginMethod
  public void saveBackupZip(PluginCall call) {
    try {
      String base64 = call.getString("base64", "");
      if (base64 == null || base64.isEmpty()) {
        call.reject("base64 is required");
        return;
      }
      String fileName = call.getString("fileName", "spark-wear-backup.zip");
      String mimeType = call.getString("mimeType", "application/zip");
      pendingBackupBytes = Base64.decode(base64, Base64.DEFAULT);
      pendingBackupMimeType = mimeType;
      pendingBackupUri = null;
      Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
      intent.addCategory(Intent.CATEGORY_OPENABLE);
      intent.setType(mimeType);
      intent.putExtra(Intent.EXTRA_TITLE, fileName);
      startActivityForResult(call, intent, "saveBackupZipResult");
    } catch (Exception err) {
      pendingBackupBytes = null;
      call.reject("saveBackupZip failed: " + err.getMessage());
    }
  }

  @ActivityCallback
  private void saveBackupZipResult(PluginCall call, ActivityResult result) {
    if (call == null) return;
    try {
      if (result == null || result.getResultCode() != android.app.Activity.RESULT_OK) {
        pendingBackupBytes = null;
        pendingBackupUri = null;
        call.reject("save-cancelled");
        return;
      }
      Intent data = result.getData();
      Uri uri = data != null ? data.getData() : null;
      if (uri == null || pendingBackupBytes == null) {
        pendingBackupBytes = null;
        pendingBackupUri = null;
        call.reject("save-backup-uri-missing");
        return;
      }
      pendingBackupUri = uri;
      JSObject res = new JSObject();
      res.put("saved", false);
      res.put("pending", true);
      res.put("uri", uri.toString());
      res.put("mimeType", pendingBackupMimeType);
      call.resolve(res);
    } catch (Exception err) {
      pendingBackupBytes = null;
      pendingBackupUri = null;
      call.reject("saveBackupZipResult failed: " + err.getMessage());
    }
  }

  @PluginMethod
  public void confirmSaveBackupZip(PluginCall call) {
    try {
      if (pendingBackupBytes == null || pendingBackupUri == null) {
        call.reject("no-pending-backup");
        return;
      }
      String requestedUri = call.getString("uri", pendingBackupUri.toString());
      if (requestedUri == null || requestedUri.isEmpty()) {
        call.reject("uri is required");
        return;
      }
      Uri uri = Uri.parse(requestedUri);
      ContentResolver resolver = getContext().getContentResolver();
      OutputStream out = resolver.openOutputStream(uri, "w");
      if (out == null) {
        call.reject("cannot-open-output-stream");
        return;
      }
      out.write(pendingBackupBytes);
      out.flush();
      out.close();
      pendingBackupBytes = null;
      pendingBackupUri = null;
      JSObject res = new JSObject();
      res.put("saved", true);
      res.put("uri", uri.toString());
      res.put("mimeType", pendingBackupMimeType);
      call.resolve(res);
    } catch (Exception err) {
      call.reject("confirmSaveBackupZip failed: " + err.getMessage());
    }
  }

  @PluginMethod
  public void cancelSaveBackupZip(PluginCall call) {
    pendingBackupBytes = null;
    pendingBackupUri = null;
    JSObject res = new JSObject();
    res.put("cancelled", true);
    call.resolve(res);
  }

  private static byte[] decodeDataUrl(String dataUrl) {
    String payload = dataUrl;
    int comma = payload.indexOf(',');
    if (comma >= 0) payload = payload.substring(comma + 1);
    return Base64.decode(payload.getBytes(StandardCharsets.UTF_8), Base64.DEFAULT);
  }

  private byte[] readUriBytes(Uri uri) throws Exception {
    String scheme = uri.getScheme() == null ? "" : uri.getScheme();
    InputStream in;
    if ("file".equalsIgnoreCase(scheme)) {
      in = new FileInputStream(new File(uri.getPath()));
    } else {
      in = getContext().getContentResolver().openInputStream(uri);
    }
    if (in == null) return null;
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    byte[] buffer = new byte[16 * 1024];
    int n;
    while ((n = in.read(buffer)) > 0) out.write(buffer, 0, n);
    in.close();
    return out.toByteArray();
  }

  private JSObject copyPickedUriToTemp(Uri uri) {
    try {
      ContentResolver resolver = getContext().getContentResolver();
      String mime = resolver.getType(uri);
      String ext = ".jpg";
      if (mime != null && mime.contains("png")) ext = ".png";
      File dir = new File(getContext().getCacheDir(), PICK_TMP_DIR);
      if (!dir.exists() && !dir.mkdirs()) return null;
      String id = UUID.randomUUID().toString();
      File outFile = new File(dir, id + ext);
      InputStream in = resolver.openInputStream(uri);
      if (in == null) return null;
      FileOutputStream fos = new FileOutputStream(outFile);
      byte[] buffer = new byte[16 * 1024];
      int n;
      while ((n = in.read(buffer)) > 0) fos.write(buffer, 0, n);
      fos.flush();
      fos.close();
      in.close();

      String name = queryDisplayName(uri);
      JSObject row = new JSObject();
      row.put("id", id);
      row.put("tempUri", Uri.fromFile(outFile).toString());
      row.put("mimeType", mime != null ? mime : "image/jpeg");
      row.put("name", name);
      row.put("size", outFile.length());
      return row;
    } catch (Exception err) {
      return null;
    }
  }

  private String queryDisplayName(Uri uri) {
    Cursor c = null;
    try {
      c = getContext().getContentResolver().query(uri, null, null, null, null);
      if (c != null && c.moveToFirst()) {
        int idx = c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
        if (idx >= 0) return c.getString(idx);
      }
    } catch (Exception ignore) {
      // noop
    } finally {
      if (c != null) c.close();
    }
    return "image";
  }

  private void cleanupTempUri(String tempUri) {
    if (tempUri == null || tempUri.isEmpty()) return;
    try {
      Uri uri = Uri.parse(tempUri);
      if (!"file".equalsIgnoreCase(uri.getScheme())) return;
      File file = new File(uri.getPath());
      File parent = file.getParentFile();
      if (parent == null || !parent.getName().equals(PICK_TMP_DIR)) return;
      if (file.exists()) file.delete();
    } catch (Exception ignore) {
      // noop
    }
  }

  private static Bitmap transformBitmap(Bitmap src, Profile p) {
    if ("backup-lite".equals(p.name)) {
      int srcW = src.getWidth();
      int srcH = src.getHeight();
      int longEdge = Math.max(srcW, srcH);
      if (longEdge <= p.maxLongEdge) {
        p.outW = srcW;
        p.outH = srcH;
        return src.copy(src.getConfig() != null ? src.getConfig() : Bitmap.Config.ARGB_8888, false);
      }
      float ratio = (float) p.maxLongEdge / (float) longEdge;
      int outW = Math.max(1, Math.round(srcW * ratio));
      int outH = Math.max(1, Math.round(srcH * ratio));
      p.outW = outW;
      p.outH = outH;
      return Bitmap.createScaledBitmap(src, outW, outH, true);
    }

    int srcW = src.getWidth();
    int srcH = src.getHeight();
    float targetRatio = (float) p.width / (float) p.height;
    float srcRatio = (float) srcW / (float) srcH;
    int cropW = srcW;
    int cropH = srcH;
    int sx = 0;
    int sy = 0;
    if (srcRatio > targetRatio) {
      cropW = Math.round(srcH * targetRatio);
      sx = Math.max(0, (srcW - cropW) / 2);
    } else {
      cropH = Math.round(srcW / targetRatio);
      sy = Math.max(0, (srcH - cropH) / 2);
    }
    Bitmap cropped = Bitmap.createBitmap(src, sx, sy, cropW, cropH);
    Bitmap scaled = Bitmap.createScaledBitmap(cropped, p.width, p.height, true);
    if (cropped != scaled) cropped.recycle();
    p.outW = p.width;
    p.outH = p.height;
    return scaled;
  }

  private Bitmap applyExifOrientation(Bitmap src, String tempUri) {
    if (tempUri == null || tempUri.isEmpty()) return src;
    try {
      Uri uri = Uri.parse(tempUri);
      InputStream in;
      if ("file".equalsIgnoreCase(uri.getScheme())) {
        in = new FileInputStream(new File(uri.getPath()));
      } else {
        in = getContext().getContentResolver().openInputStream(uri);
      }
      if (in == null) return src;
      ExifInterface exif = new ExifInterface(in);
      in.close();
      int orientation = exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL);
      Matrix matrix = new Matrix();
      if (orientation == ExifInterface.ORIENTATION_ROTATE_90) {
        matrix.postRotate(90);
      } else if (orientation == ExifInterface.ORIENTATION_ROTATE_180) {
        matrix.postRotate(180);
      } else if (orientation == ExifInterface.ORIENTATION_ROTATE_270) {
        matrix.postRotate(270);
      } else if (orientation == ExifInterface.ORIENTATION_FLIP_HORIZONTAL) {
        matrix.preScale(-1f, 1f);
      } else if (orientation == ExifInterface.ORIENTATION_FLIP_VERTICAL) {
        matrix.preScale(1f, -1f);
      } else {
        return src;
      }
      Bitmap rotated = Bitmap.createBitmap(src, 0, 0, src.getWidth(), src.getHeight(), matrix, true);
      if (rotated != src) src.recycle();
      return rotated;
    } catch (Exception ignore) {
      return src;
    }
  }

  private static final class Profile {
    String name;
    int width;
    int height;
    int quality;
    int maxLongEdge;
    int outW;
    int outH;

    static Profile from(String profile) {
      Profile p = new Profile();
      if ("thumb".equals(profile)) {
        p.name = "thumb";
        p.width = 320;
        p.height = 427;
        p.quality = 66;
      } else if ("detail".equals(profile)) {
        p.name = "detail";
        p.width = 1080;
        p.height = 1440;
        p.quality = 82;
      } else if ("backup-lite".equals(profile)) {
        p.name = "backup-lite";
        p.maxLongEdge = 1600;
        p.quality = 86;
      } else {
        p.name = "grid";
        p.width = 720;
        p.height = 960;
        p.quality = 76;
      }
      return p;
    }
  }
}
