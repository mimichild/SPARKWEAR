export const requestMediaLibraryPermissionsAsync = jest.fn().mockResolvedValue({ granted: true });
export const requestCameraPermissionsAsync = jest.fn().mockResolvedValue({ granted: true });
export const launchImageLibraryAsync = jest.fn().mockResolvedValue({ canceled: true, assets: [] });
export const launchCameraAsync = jest.fn().mockResolvedValue({ canceled: true, assets: [] });
export const MediaTypeOptions = { Images: 'Images', Videos: 'Videos', All: 'All' };
export const UIImagePickerPreferredAssetRepresentationMode = { Current: 'current' };
