"use client";

import { AuthProvider } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";
import { GoogleOAuthProvider } from "@react-oauth/google";

export function Providers({ children }: { children: React.ReactNode }) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <SocketProvider>
          {children}
        </SocketProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
