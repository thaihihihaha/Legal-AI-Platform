import { describe, test, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import draftReducer, {
  setCurrentDraft,
  setDrafts,
  addDraft,
  updateDraft,
  deleteDraft,
  setLoading,
  setError,
  setFilters,
  setPagination,
  clearDrafts,
} from '../slices/draftSlice';

describe('draftSlice', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: { draft: draftReducer },
    });
  });

  describe('setCurrentDraft', () => {
    test('thiết lập draft hiện tại', () => {
      const testDraft = {
        id: 'draft-123',
        title: 'Hợp đồng bán',
        status: 'draft',
        created_at: new Date(),
      };
      store.dispatch(setCurrentDraft(testDraft));

      expect(store.getState().draft.currentDraft).toEqual(testDraft);
    });
  });

  describe('setDrafts', () => {
    test('cập nhật danh sách drafts', () => {
      const drafts = [
        { id: 1, title: 'Draft 1' },
        { id: 2, title: 'Draft 2' },
      ];
      store.dispatch(setDrafts({ items: drafts, total: 2 }));

      const state = store.getState().draft;
      expect(state.drafts).toEqual(drafts);
      expect(state.pagination.total).toBe(2);
    });
  });

  describe('addDraft', () => {
    test('thêm draft mới vào đầu list', () => {
      store.dispatch(setDrafts({ items: [{ id: 2 }], total: 1 }));
      
      const newDraft = { id: 1, title: 'New Draft' };
      store.dispatch(addDraft(newDraft));

      const state = store.getState().draft;
      expect(state.drafts[0]).toEqual(newDraft);
      expect(state.pagination.total).toBe(2);
    });
  });

  describe('updateDraft', () => {
    test('cập nhật draft trong list', () => {
      const drafts = [
        { id: 1, title: 'Draft 1', status: 'draft' },
        { id: 2, title: 'Draft 2', status: 'draft' },
      ];
      store.dispatch(setDrafts({ items: drafts, total: 2 }));
      store.dispatch(setCurrentDraft(drafts[0]));

      const updated = { id: 1, status: 'approved' };
      store.dispatch(updateDraft(updated));

      const state = store.getState().draft;
      expect(state.drafts[0].status).toBe('approved');
      expect(state.currentDraft.status).toBe('approved');
    });
  });

  describe('deleteDraft', () => {
    test('xóa draft từ list', () => {
      const drafts = [
        { id: 1, title: 'Draft 1' },
        { id: 2, title: 'Draft 2' },
      ];
      store.dispatch(setDrafts({ items: drafts, total: 2 }));

      store.dispatch(deleteDraft(1));

      const state = store.getState().draft;
      expect(state.drafts).toHaveLength(1);
      expect(state.drafts[0].id).toBe(2);
      expect(state.pagination.total).toBe(1);
    });

    test('xóa currentDraft nếu là draft bị xóa', () => {
      const draft = { id: 1, title: 'Draft 1' };
      store.dispatch(setCurrentDraft(draft));
      store.dispatch(deleteDraft(1));

      expect(store.getState().draft.currentDraft).toBeNull();
    });
  });

  describe('setFilters', () => {
    test('cập nhật filters và reset page', () => {
      store.dispatch(setPagination({ page: 3 }));
      store.dispatch(setFilters({ status: 'approved', search: 'sale' }));

      const state = store.getState().draft;
      expect(state.filters.status).toBe('approved');
      expect(state.filters.search).toBe('sale');
      expect(state.pagination.page).toBe(1); // Reset to first page
    });
  });

  describe('clearDrafts', () => {
    test('xóa tất cả drafts', () => {
      const drafts = [
        { id: 1, title: 'Draft 1' },
        { id: 2, title: 'Draft 2' },
      ];
      store.dispatch(setDrafts({ items: drafts, total: 2 }));
      store.dispatch(setCurrentDraft(drafts[0]));

      store.dispatch(clearDrafts());

      const state = store.getState().draft;
      expect(state.drafts).toHaveLength(0);
      expect(state.currentDraft).toBeNull();
      expect(state.pagination.total).toBe(0);
    });
  });
});
