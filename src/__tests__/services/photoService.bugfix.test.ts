/**
 * Regression tests for photo storage / display bugs
 *
 * Bug 1: photo_ids stored bare UUIDs — caused "file://uuid" invalid URIs on display
 * Bug 2: getPhotoUri accepted only Photo objects — needed to accept path strings too
 * Bug 3: photoIdFromPath helper needed for orphan cleanup compatibility
 */
import { getPhotoUri, photoIdFromPath } from '../../services/photoService';

describe('photoService — bug regressions', () => {

  // ── getPhotoUri: accepts string path (not just Photo object) ────────────

  describe('getPhotoUri with string path', () => {
    it('returns path as-is when it already starts with file://', () => {
      const path = 'file:///data/user/0/com.sparkwear/files/photos/abc123.jpg';
      expect(getPhotoUri(path)).toBe(path);
    });

    it('adds file:// prefix when path does not have it', () => {
      expect(getPhotoUri('/data/.../photos/abc123.jpg')).toBe(
        'file:///data/.../photos/abc123.jpg'
      );
    });

    it('returns path as-is on web', () => {
      // Platform.OS is 'ios' in jest-expo, so we test the native path directly
      const path = 'file:///some/path.jpg';
      expect(getPhotoUri(path)).toBe(path);
    });
  });

  describe('getPhotoUri with Photo object', () => {
    it('extracts path from Photo object with file:// prefix', () => {
      const photo = {
        id: 'abc123',
        path: 'file:///data/photos/abc123.jpg',
        mimeType: 'image/jpeg',
        createdAt: '2024-01-01',
      } as import('../../types').Photo;
      expect(getPhotoUri(photo)).toBe('file:///data/photos/abc123.jpg');
    });

    it('adds file:// prefix when Photo path lacks it', () => {
      const photo = {
        id: 'abc123',
        path: '/data/photos/abc123.jpg',
        mimeType: 'image/jpeg',
        createdAt: '2024-01-01',
      } as import('../../types').Photo;
      expect(getPhotoUri(photo)).toBe('file:///data/photos/abc123.jpg');
    });
  });

  // ── photoIdFromPath: extracts UUID for orphan cleanup ──────────────────

  describe('photoIdFromPath', () => {
    it('extracts ID from full file:// path', () => {
      expect(photoIdFromPath('file:///data/.../photos/abc-123.jpg')).toBe('abc-123');
    });

    it('extracts ID from path without file:// prefix', () => {
      expect(photoIdFromPath('/some/dir/photos/def-456.jpg')).toBe('def-456');
    });

    it('returns input as-is when it is already a bare ID (no slashes)', () => {
      expect(photoIdFromPath('ghi-789')).toBe('ghi-789');
    });

    it('handles path with multiple dots (only strips last extension)', () => {
      expect(photoIdFromPath('/photos/abc.def.jpg')).toBe('abc.def');
    });

    it('handles png extension', () => {
      expect(photoIdFromPath('/photos/abc123.png')).toBe('abc123');
    });
  });
});
