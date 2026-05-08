"use client";

import { AuthProvider } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <SocketProvider>
          <Toaster 
            position="top-right"
            toastOptions={{
              className: 'border-4 border-black text-xs font-black uppercase tracking-widest rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
              duration: 4000,
            }}
          />
          {children}
        </SocketProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
