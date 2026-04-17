export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  email: string;
  tokenType: string;
}

export interface DecodedToken {
  sub: string;       // email
  iat: number;
  exp: number;
}
