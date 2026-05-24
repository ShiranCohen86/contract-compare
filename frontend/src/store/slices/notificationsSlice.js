import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';

export const fetchNotifications = createAsyncThunk('notifications/fetch', async () => {
  const { data } = await api.get('/notifications?limit=30');
  return data;
});

export const markAllRead = createAsyncThunk('notifications/markAllRead', async () => {
  await api.patch('/notifications/read-all');
});

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
    total: 0,
    unread: 0,
    status: 'idle',
  },
  reducers: {
    addNotification: (state, action) => {
      state.items.unshift(action.payload);
      state.total += 1;
      if (!action.payload.isRead) state.unread += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.items  = action.payload.items;
        state.total  = action.payload.total;
        state.unread = action.payload.items.filter((n) => !n.isRead).length;
        state.status = 'succeeded';
      })
      .addCase(markAllRead.fulfilled, (state) => {
        state.items  = state.items.map((n) => ({ ...n, isRead: true }));
        state.unread = 0;
      });
  },
});

export const { addNotification } = notificationsSlice.actions;
export default notificationsSlice.reducer;
