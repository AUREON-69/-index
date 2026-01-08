import { jwtDecode } from 'jwt-decode';

// Update this to match your backend URL

// Update this to match your backend URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface User {
  id: number;
  email: string;
  role: string;
}

interface TokenPayload {
  sub: string;
  exp: number;
}

class Auth {
  private tokenKey = 'auth_token';
  private userKey = 'auth_user';
  
  setToken(token: string) {
    localStorage.setItem(this.tokenKey, token);
  }
  
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }
  
  removeToken() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }
  
  setUser(user: User | null) {
    if (user) {
      localStorage.setItem(this.userKey, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.userKey);
    }
  }
  
  getUser(): User | null {
    const userStr = localStorage.getItem(this.userKey);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }
  
  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Properly format error message, handling both simple strings and validation error objects
        let errorMessage = 'Login failed';
        
        if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (Array.isArray(data.detail)) {
          // Handle FastAPI validation errors [{loc, msg, type}]
          const validationErrors = data.detail as Array<{loc: string[], msg: string, type: string}>;
          errorMessage = validationErrors.map(error => 
            `${error.loc.join('.')}: ${error.msg}`
          ).join(', ');
        } else if (data.detail) {
          errorMessage = String(data.detail);
        }
        
        return { success: false, error: errorMessage };
      }
      
      this.setToken(data.access_token);
      // Get user details to store role
      const user = await this.getMe();
      if (user) {
        this.setUser(user);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }
  
  async register(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Properly format error message, handling both simple strings and validation error objects
        let errorMessage = 'Registration failed';
        
        if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (Array.isArray(data.detail)) {
          // Handle FastAPI validation errors [{loc, msg, type}]
          const validationErrors = data.detail as Array<{loc: string[], msg: string, type: string}>;
          errorMessage = validationErrors.map(error => 
            `${error.loc.join('.')}: ${error.msg}`
          ).join(', ');
        } else if (data.detail) {
          errorMessage = String(data.detail);
        }
        
        return { success: false, error: errorMessage };
      }
      
      this.setToken(data.access_token);
      // Get user details to store role
      const user = await this.getMe();
      if (user) {
        this.setUser(user);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }
  
  logout() {
    this.removeToken();
  }
  
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    
    try {
      const decoded = jwtDecode<TokenPayload>(token);
      // Check if token is expired
      const currentTime = Date.now() / 1000;
      return decoded.exp > currentTime;
    } catch (error) {
      return false;
    }
  }
  
  async getMe(): Promise<User | null> {
    const token = this.getToken();
    if (!token) {
      return null;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        this.logout(); // Token might be invalid, so log out
        return null;
      }
      
      const user = await response.json();
      this.setUser(user); // Store user details including role
      return user;
    } catch (error) {
      this.logout(); // Network error, so log out
      return null;
    }
  }
  
  isAdmin(): boolean {
    const user = this.getUser();
    return user?.role === 'admin';
  }
}

export const auth = new Auth();

// Define the shape of our auth context
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}