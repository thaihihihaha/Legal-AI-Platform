import { createSlice } from '@reduxjs/toolkit';

/**
 * Draft Slice
 * Quản lý draft management state: current draft, drafts list, loading, errors
 */
const initialState = {
  currentDraft: null,
  drafts: [],
  isLoading: false,
  error: null,
  filters: {
    status: 'all',
    search: '',
    sortBy: 'updated_at',
  },
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0,
  },
};

const draftSlice = createSlice({
  name: 'draft',
  initialState,
  reducers: {
    /**
     * Thiết lập draft hiện tại
     */
    setCurrentDraft(state, action) {
      state.currentDraft = action.payload;
    },

    /**
     * Thiết lập danh sách drafts
     */
    setDrafts(state, action) {
      state.drafts = action.payload.items || [];
      state.pagination.total = action.payload.total || 0;
    },

    /**
     * Thêm draft mới
     */
    addDraft(state, action) {
      state.drafts.unshift(action.payload);
      state.pagination.total += 1;
    },

    /**
     * Cập nhật draft
     */
    updateDraft(state, action) {
      const index = state.drafts.findIndex(d => d.id === action.payload.id);
      if (index !== -1) {
        state.drafts[index] = { ...state.drafts[index], ...action.payload };
      }
      if (state.currentDraft?.id === action.payload.id) {
        state.currentDraft = { ...state.currentDraft, ...action.payload };
      }
    },

    /**
     * Xóa draft
     */
    deleteDraft(state, action) {
      state.drafts = state.drafts.filter(d => d.id !== action.payload);
      state.pagination.total -= 1;
      if (state.currentDraft?.id === action.payload) {
        state.currentDraft = null;
      }
    },

    /**
     * Cập nhật loading state
     */
    setLoading(state, action) {
      state.isLoading = action.payload;
    },

    /**
     * Cập nhật error message
     */
    setError(state, action) {
      state.error = action.payload;
    },

    /**
     * Cập nhật filters
     */
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1; // Reset to first page
    },

    /**
     * Cập nhật pagination
     */
    setPagination(state, action) {
      state.pagination = { ...state.pagination, ...action.payload };
    },

    /**
     * Clear all drafts
     */
    clearDrafts(state) {
      state.drafts = [];
      state.currentDraft = null;
      state.pagination = { page: 1, pageSize: 20, total: 0 };
    },
  },
});

export const {
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
} = draftSlice.actions;

export default draftSlice.reducer;
