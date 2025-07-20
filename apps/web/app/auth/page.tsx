"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import Silder from "@/Component/auth/slider";
import Signup from "@/Component/auth/signup";
import Login from "@/Component/auth/login";

function AuthPage() {
  const [isLoginView, setIsLoginView] = useState(false);
  const searchParams = useSearchParams();

  // On component mount, check for the 'login=true' parameter
  useEffect(() => {
    if (searchParams.get("login") === "true") {
      setIsLoginView(true);
    }
  }, [searchParams]);

  return (
    <div className="bg-[#111111] flex items-center justify-center h-screen">
      <div className="bg-gradient-to-tr from-[#0D2538] to-[#1A73E8] rounded-lg h-[85vh] w-[75vw] flex overflow-hidden relative">
        {/* Slider Component - animate its horizontal position */}
        <motion.div
          initial={{ x: 0 }}
          animate={{ x: isLoginView ? "100%" : "0%" }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="absolute top-0 left-0 w-1/2 h-full hidden sm:flex p-4"
        >
          <Silder />
        </motion.div>

        <motion.div className="sm:w-1/2 w-full h-full px-16 flex flex-col gap-10 py-10 sm:px-20 items-center justify-center relative">
          <AnimatePresence mode="wait">
            {isLoginView && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="w-full"
              >
                <Login isLoginTrue={setIsLoginView} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        {!isLoginView && (
          <motion.div className="sm:w-1/2 w-full h-full px-16 flex flex-col gap-10 py-10 sm:px-20 items-center justify-center relative">
            <AnimatePresence mode="wait">
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="w-full"
              >
                <Signup isLoginTrue={setIsLoginView} />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}

import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthPage />
    </Suspense>
  );
}
