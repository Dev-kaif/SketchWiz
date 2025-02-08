"use client";

import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  className: "primary" | "secondary";
  onClickHandler: ()=>void;
  size?:string;
  processing?:boolean
}

export const Button = ({ children, className, onClickHandler,size,processing }: ButtonProps) => {

  const buttonStyle = {
    primary:`bg-[${processing?"#4f3e80":"#6D54B5"}] py-2 px-5 rounded-md w-full ${size}`,
    secondary:`bg-[#665BA1] rounded-full px-4 py-1 ${size}`
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
