import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', credentials);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'שגיאה בהתחברות');
  }
});

export const signup = createAsyncThunk('auth/signup', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/signup', payload);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'שגיאה בהרשמה');
  }
});

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/auth/me');
    return data;
  } catch {
    return rejectWithValue(null);
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  try { await api.post('/auth/logout'); } catch {}
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user:    null,
    status:  'idle',
    error:   null,
  },
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending,    (state) => { state.status = 'loading'; state.error = null; })
      .addCase(login.fulfilled,  (state, action) => { state.status = 'succeeded'; state.user = action.payload; })
      .addCase(login.rejected,   (state, action) => { state.status = 'failed'; state.error = action.payload; })
      .addCase(signup.pending,   (state) => { state.status = 'loading'; state.error = null; })
      .addCase(signup.fulfilled, (state, action) => { state.status = 'succeeded'; state.user = action.payload; })
      .addCase(signup.rejected,  (state, action) => { state.status = 'failed'; state.error = action.payload; })
      .addCase(fetchMe.fulfilled, (state, action) => { state.user = action.payload; state.status = 'succeeded'; })
      .addCase(fetchMe.rejected,  (state) => { state.user = null; state.status = 'idle'; })
      .addCase(logout.fulfilled,  (state) => { state.user = null; state.status = 'idle'; });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
