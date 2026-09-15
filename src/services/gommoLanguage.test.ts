import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  gommoFormLanguage,
  gommoUsageLogsLanguage,
  normalizeCatalogLang,
  normalizeSiteLocale,
} from './gommoLanguage.js';

describe('gommoLanguage', () => {
  it('normalizes site locales', () => {
    assert.equal(normalizeSiteLocale('th-TH'), 'th');
    assert.equal(normalizeSiteLocale('vi-VN'), 'vi');
    assert.equal(normalizeSiteLocale('en'), 'en');
  });

  it('normalizes catalog lang', () => {
    assert.equal(normalizeCatalogLang('th'), 'th');
    assert.equal(normalizeCatalogLang('en'), 'en');
    assert.equal(normalizeCatalogLang('vi'), undefined);
    assert.equal(normalizeCatalogLang(''), undefined);
  });

  it('falls back Gommo form language to en for Thai site', () => {
    assert.equal(gommoFormLanguage('th'), 'en');
    assert.equal(gommoFormLanguage('vi'), 'en');
  });

  it('maps usage logs language', () => {
    assert.equal(gommoUsageLogsLanguage('vi'), 'VI');
    assert.equal(gommoUsageLogsLanguage('th'), 'EN');
  });
});
