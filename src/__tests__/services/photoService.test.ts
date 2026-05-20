import {
  getPhotoUri,
  deletePhoto,
  savePhoto,
  pickImages,
  getStorageStats,
} from '../../services/photoService';
import type { Photo } from '../../types';

// Mocks are configured via moduleNameMapper in package.json
const mockImagePicker = require('expo-image-picker');
const mockManipulator = require('expo-image-manipulator');
const mockFileSystem = require('expo-file-system');

const mockPhoto: Photo = {
  id: 'photo-1',
  path: '/mock/documents/photos/photo-1.jpg',
  mimeType: 'image/jpeg',
  width: 720,
  height: 960,
  profile: 'grid',
  createdAt: '2024-01-01T00:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true, isDirectory: false });
  mockFileSystem.makeDirectoryAsync.mockResolvedValue(undefined);
  mockFileSystem.copyAsync.mockResolvedValue(undefined);
  mockFileSystem.deleteAsync.mockResolvedValue(undefined);
  mockManipulator.manipulateAsync.mockResolvedValue({
    uri: '/tmp/manipulated.jpg',
    width: 720,
    height: 960,
  });
});

describe('photoService', () => {
  describe('getPhotoUri', () => {
    it('adds file:// prefix if missing', () => {
      const photo: Photo = { ...mockPhoto, path: '/some/path/photo.jpg' };
      const uri = getPhotoUri(photo);
      expect(uri).toBe('file:///some/path/photo.jpg');
    });

    it('keeps existing file:// prefix', () => {
      const photo: Photo = { ...mockPhoto, path: 'file:///some/path/photo.jpg' };
      expect(getPhotoUri(photo)).toBe('file:///some/path/photo.jpg');
    });
  });

  describe('deletePhoto', () => {
    it('deletes the file when it exists', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true });
      await deletePhoto(mockPhoto);
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(
        mockPhoto.path,
        { idempotent: true }
      );
    });

    it('does not throw when file does not exist', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: false });
      await expect(deletePhoto(mockPhoto)).resolves.not.toThrow();
      expect(mockFileSystem.deleteAsync).not.toHaveBeenCalled();
    });

    it('does not throw on unexpected errors', async () => {
      mockFileSystem.getInfoAsync.mockRejectedValue(new Error('permission denied'));
      await expect(deletePhoto(mockPhoto)).resolves.not.toThrow();
    });
  });

  describe('savePhoto', () => {
    it('calls manipulateAsync with correct compression quality for grid', async () => {
      await savePhoto('/tmp/source.jpg', 'grid');
      expect(mockManipulator.manipulateAsync).toHaveBeenCalledWith(
        '/tmp/source.jpg',
        expect.arrayContaining([{ resize: { width: 720 } }]),
        expect.objectContaining({ compress: 0.76 })
      );
    });

    it('calls manipulateAsync with correct quality for thumb', async () => {
      await savePhoto('/tmp/source.jpg', 'thumb');
      expect(mockManipulator.manipulateAsync).toHaveBeenCalledWith(
        '/tmp/source.jpg',
        expect.arrayContaining([{ resize: { width: 320 } }]),
        expect.objectContaining({ compress: 0.66 })
      );
    });

    it('calls manipulateAsync with correct quality for detail', async () => {
      await savePhoto('/tmp/source.jpg', 'detail');
      expect(mockManipulator.manipulateAsync).toHaveBeenCalledWith(
        '/tmp/source.jpg',
        expect.any(Array),
        expect.objectContaining({ compress: 0.82 })
      );
    });

    it('calls manipulateAsync with correct quality for backup-lite', async () => {
      await savePhoto('/tmp/source.jpg', 'backup-lite');
      expect(mockManipulator.manipulateAsync).toHaveBeenCalledWith(
        '/tmp/source.jpg',
        expect.any(Array),
        expect.objectContaining({ compress: 0.86 })
      );
    });

    it('copies manipulated file to photos directory', async () => {
      await savePhoto('/tmp/source.jpg', 'grid');
      expect(mockFileSystem.copyAsync).toHaveBeenCalledWith(
        expect.objectContaining({ from: '/tmp/manipulated.jpg' })
      );
    });

    it('returns Photo with correct fields', async () => {
      const photo = await savePhoto('/tmp/source.jpg', 'grid');
      expect(photo.mimeType).toBe('image/jpeg');
      expect(photo.profile).toBe('grid');
      expect(photo.width).toBe(720);
      expect(photo.height).toBe(960);
      expect(photo.createdAt).toBeTruthy();
      expect(photo.id).toBeTruthy();
    });
  });

  describe('pickImages', () => {
    it('returns empty array if permission denied', async () => {
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: false });
      const result = await pickImages(5);
      expect(result).toEqual([]);
    });

    it('returns empty array if user cancels', async () => {
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
      mockImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: [] });
      const result = await pickImages(5);
      expect(result).toEqual([]);
    });

    it('returns picked images', async () => {
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
      mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [
          { uri: '/tmp/img1.jpg', width: 100, height: 200, mimeType: 'image/jpeg', fileName: 'img1.jpg' },
          { uri: '/tmp/img2.jpg', width: 300, height: 400, mimeType: 'image/png', fileName: 'img2.png' },
        ],
      });
      const result = await pickImages(5);
      expect(result).toHaveLength(2);
      expect(result[0].uri).toBe('/tmp/img1.jpg');
      expect(result[1].mimeType).toBe('image/png');
    });

    it('passes limit to launchImageLibraryAsync', async () => {
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
      mockImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: [] });
      await pickImages(3);
      expect(mockImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
        expect.objectContaining({ selectionLimit: 3 })
      );
    });
  });

  describe('getStorageStats', () => {
    it('returns zero stats when photos dir does not exist', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: false });
      const stats = await getStorageStats();
      expect(stats.count).toBe(0);
      expect(stats.totalBytes).toBe(0);
    });

    it('counts files and sums sizes', async () => {
      mockFileSystem.getInfoAsync
        .mockResolvedValueOnce({ exists: true })   // dir check
        .mockResolvedValueOnce({ exists: true, size: 50000 })  // file 1
        .mockResolvedValueOnce({ exists: true, size: 30000 }); // file 2
      mockFileSystem.readDirectoryAsync.mockResolvedValue(['a.jpg', 'b.jpg']);
      const stats = await getStorageStats();
      expect(stats.count).toBe(2);
      expect(stats.totalBytes).toBe(80000);
    });
  });
});
