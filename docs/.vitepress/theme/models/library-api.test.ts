import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { jobFieldsSnippet, uploadFileItem } from './library-api';

describe('jobFieldsSnippet', () => {
  it('builds images array for image uploads', () => {
    const item = uploadFileItem('https://cdn.example/a.png', new File([], 'a.png'), 'image');
    const snippet = jobFieldsSnippet(item);
    assert.equal(snippet, JSON.stringify({ images: [{ url: 'https://cdn.example/a.png' }] }, null, 2));
  });

  it('builds video_url for video uploads', () => {
    const item = uploadFileItem('https://cdn.example/v.mp4', new File([], 'v.mp4'), 'video');
    const snippet = jobFieldsSnippet(item);
    assert.equal(snippet, JSON.stringify({ video_url: 'https://cdn.example/v.mp4' }, null, 2));
  });
});
