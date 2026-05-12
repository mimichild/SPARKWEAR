export const manipulateAsync = jest.fn().mockResolvedValue({ uri: '/mock/photo.jpg', width: 720, height: 960 });
export const FlipType = { Horizontal: 'horizontal', Vertical: 'vertical' };
export const SaveFormat = { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' };
export const ImageManipulator = { manipulate: jest.fn() };
