"use client"
import React, { useState } from 'react'
import Input from '@repo/ui/input';
import { Button } from '@repo/ui/button';
import axios from 'axios';
import { useNotification } from './notification';
import { BACKEND_URL } from './Config';
import { useRouter } from 'next/navigation';

function Login({isLoginTrue}:{isLoginTrue:(e:boolean)=>void}) {
    const { addNotification } = useNotification();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [processing,setProcessing] = useState(false);
    const rounter = useRouter()

    async function handleLogin() {
      if(email == "" || password == ""){
         addNotification("error","Fill all the required Fields")
        return;
      }
      
      try {
        setProcessing(true)
        
        const res =  await axios.post(`${BACKEND_URL}/api/signin`,{
          email,
          password,
        })
        addNotification("success",res.data.message)
        setProcessing(false)
        const jwtToken = res.data.token;
        localStorage.setItem("authorization",jwtToken);
        rounter.push('/Dashboard')
      } catch (error) {
        addNotification("error",error.response.data.message)
        setProcessing(false)
      }
    }


  return (
    <>
    <div className="flex flex-col gap-3 mb-5">
      <div className="text-4xl font-bold ">Welcome Back,</div>
    </div>
    <div className="flex flex-col gap-5 w-full">
      <Input onChangeHandle={(email) => setEmail(email)} place="Email" />
      <Input
        type="password"
        onChangeHandle={(password) => setPassword(password)}
        place="Password"
      />
      <div>
        <Button
          processing= {processing}
          onClickHandler={() => {
            handleLogin()
          }}
          className="primary"
        >
          {processing? "Logging in......":"Log In"}
        </Button>
      </div>
      <div className="flex gap-1  items-center justify-center">
        <div>Don&apos;t have an account?</div>
          <button
          className='text-blue-300'
          onClick={()=>{
            isLoginTrue(false)
          }}>Sign Up Now</button>
      </div>
    </div>
  </>
  )
}

export default Login
