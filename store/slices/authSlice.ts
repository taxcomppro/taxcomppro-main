import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AuthUser {
  id: string;
  email: string;
  profileSlug?: string | null;
  professionalTitle?: string | null;
  name: string;
  phone?: string | null;
  role: "MEMBER" | "ADMIN";
  tier: "FREE" | "VIP" | "MARKETPLACE" | "MARKETPLACE_PLUS";
  image?: string | null;
  coverImage?: string | null;
  bio?: string | null;
  headline?: string | null;
  location?: string | null;
  yearsExperience?: number | null;
  mission?: string | null;
  website?: string | null;
  linkedIn?: string | null;
  twitter?: string | null;
  facebook?: string | null;
  specialties?: string[];
  certifications?: string[];
  languages?: string[];
  mediaPhotos?: string[];
  voiceMemoUrl?: string | null;
  hasDueDiligenceBadge?: boolean;
  isBrandAmbassador?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.isLoading = false;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    clearUser(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
    },
  },
});

export const { setUser, setLoading, clearUser } = authSlice.actions;
export default authSlice.reducer;
