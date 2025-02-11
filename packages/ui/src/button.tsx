"use client";

import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  className: "primary" | "secondary" | "destructive";
  onClickHandler: ()=>void;
  size?:string;
  processing?:boolean
}

export const Button = ({ children, className, onClickHandler,size,processing }: ButtonProps) => {

  const buttonStyle = {
    primary:`${processing? "bg-gray-400":"bg-white hover:bg-gray-200"} border border-[#1A73E8] text-[#0D2538] font-bold py-3 px-6 rounded-full  ${size}`,
    destructive:`${processing? "bg-red-900":"bg-red-500 hover:bg-red-700"} py-2 px-5 rounded-md ${size}`,
    secondary:`bg-[#665BA1] hover:bg-[#4f477c] rounded-full px-4 py-1 ${size}`
  }

  const style = buttonStyle[className] || ""

  return (
    <button
      disabled={processing}
      className={style}
      onClick={onClickHandler}
    >
      {children}
    </button>
  );
};
