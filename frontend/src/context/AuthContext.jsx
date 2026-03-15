import { createContext, useContext, useEffect, useMemo, useState } from "react";
import client from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (email, password, role) => {
    const payload = { email: String(email || "").trim(), password };
    if (role) payload.role = role;

    const { data } = await client.post("/auth/login", payload);
    localStorage.setItem("iqac_token", data.token);
    setUser(data.data);
    return data.data;
  };

  const signup = async (payload) => {
    const { data } = await client.post("/auth/public-signup", payload);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("iqac_token");
    setUser(null);
  };

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem("iqac_token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await client.get("/auth/me");
        setUser(data.data);
      } catch {
        localStorage.removeItem("iqac_token");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const value = useMemo(() => ({ user, loading, login, signup, logout }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
