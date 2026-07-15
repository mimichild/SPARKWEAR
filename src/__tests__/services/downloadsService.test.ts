import { describeTreeUri } from '../../services/downloadsService';

describe('downloadsService — describeTreeUri', () => {
  it('解析內部儲存空間的子資料夾', () => {
    expect(
      describeTreeUri('content://com.android.externalstorage.documents/tree/primary%3ADownload%2FBackup')
    ).toBe('內部儲存空間/Download/Backup');
  });

  it('解析內部儲存空間根目錄（無子路徑）', () => {
    expect(
      describeTreeUri('content://com.android.externalstorage.documents/tree/primary%3A')
    ).toBe('內部儲存空間');
  });

  it('解析外接儲存裝置（SD 卡等非 primary volume）', () => {
    expect(
      describeTreeUri('content://com.android.externalstorage.documents/tree/1234-5678%3ABackup')
    ).toBe('外接儲存裝置（1234-5678）/Backup');
  });

  it('無法解析的 URI 原樣回傳', () => {
    const uri = 'content://weird.provider/not-a-tree-uri';
    expect(describeTreeUri(uri)).toBe(uri);
  });

  it('沒有冒號分隔的 opaque id 直接回傳解碼後的字串', () => {
    expect(
      describeTreeUri('content://com.google.android.apps.docs.storage/tree/opaqueid123')
    ).toBe('opaqueid123');
  });
});
