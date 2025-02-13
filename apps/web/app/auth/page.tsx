"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Silder from "../../Component/auth/slider";
import Signup from "../../Component/auth/signup";
import Login from "../../Component/auth/login";

function Page() {
  const [login, setLogin] = useState<boolean>();

  return (
    <div className="bg-[#191414] flex items-center justify-center h-screen">
      <div className="bg-gradient-to-tr from-[#0D2538] to-[#1A73E8] rounded-lg h-[85vh] w-[75vw] flex overflow-hidden relative">
        {/* Slider Component - animate its horizontal position */}
        <motion.div
          initial={{ x: 0 }}
          animate={{ x: login ? "100%" : "0%" }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="absolute top-0 left-0 w-1/2 h-full hidden sm:flex p-4"
        >
          <Silder />
        </motion.div>

        <motion.div className="sm:w-1/2 w-full h-full px-16 flex flex-col gap-10 py-10 sm:px-20 items-center justify-center relative">
          <AnimatePresence mode="wait">
        {login&&  <motion.div
                key="login"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="w-full"
              >
                <Login isLoginTrue={setLogin} />
              </motion.div>}
          </AnimatePresence>
        </motion.div>
        { !login && 
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
                <Signup isLoginTrue={setLogin} />
            </motion.div>
          </AnimatePresence>
        </motion.div>}
      </div>
    </div>
  );
}

export default Page;