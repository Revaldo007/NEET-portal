import { createContext, useContext, useState, useCallback } from "react";
import client from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => ({
    token: localStorage.getItem("neet_token"),
    role: localStorage.getItem("neet_role"),
    name: localStorage.getItem("neet_name"),
  }));

  const login = useCallback(async (email, password) => {
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    const { data } = await client.post("/api/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    localStorage.setItem("neet_token", data.access_token);
    localStorage.setItem("neet_role", data.role);
    localStorage.setItem("neet_name", data.name);
    setAuth({ token: data.access_token, role: data.role, name: data.name });
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await client.post("/api/auth/register", payload);
    localStorage.setItem("neet_token", data.access_token);
    localStorage.setItem("neet_role", data.role);
    localStorage.setItem("neet_name", data.name);
    setAuth({ token: data.access_token, role: data.role, name: data.name });
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("neet_token");
    localStorage.removeItem("neet_role");
    localStorage.removeItem("neet_name");
    setAuth({ token: null, role: null, name: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...auth, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
