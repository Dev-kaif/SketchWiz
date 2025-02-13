"use client"
import Image from 'next/image';
import React, { useState } from 'react'
import Input from '@repo/ui/input';
import { Button } from '@repo/ui/button';
import axios from 'axios';
import { useNotification } from '../notification/notification';
import { BACKEND_URL } from '../Config';

function Signup({isLoginTrue}:{isLoginTrue:(e:boolean)=>void}) {
    const { addNotification } = useNotification(); 

    const defaultImage = "https://img.freepik.com/premium-vector/vector-flat-illustration-grayscale-avatar-user-profile-person-icon-profile-picture-suitable-social-media-profiles-icons-screensavers-as-templatex9xa_719432-1040.jpg?semt=ais_hybrid"
      
    const [source, setSource] = useState<string>(defaultImage);

    if (source == "") {
      setSource(defaultImage);
    }

    const [name, setName] = useState("");
    const [userName, setUserName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

     const [processing,setProcessing] = useState(false)

    async function handleSignUp() {

      if(name=="" || userName=="" || email == "" || password == "" ){
        addNotification("error","Fill all the required Fields")
        return;
      }

      try {
        setProcessing(true)
        const res =  await axios.post(`${BACKEND_URL}/api/signup`,{
          email,
          username:userName,
          password,
          name,
          photo:source
        })
        addNotification("success",res.data.message)
        setProcessing(false)
        isLoginTrue(true)
      } catch (error:any) {
        addNotification("error",error.response?.data?.message)
        setProcessing(false)
      }
    }

  return (
    <>
    <div className="flex flex-col gap-3 mb-5">
      <div className="text-4xl font-bold ">Create an account</div>
    </div>
    <div className="flex flex-col gap-5 w-full">

      <div className="flex flex-col items-center gap-3">
        <div className=" h-20 w-20 bg-red-50 rounded-full overflow-hidden">
          <Image
            src={source}
            alt=""
            width={100}
            height={100}
            className="object-cover object-center"
            unoptimized
            onError={() => setSource(defaultImage)}
          />
        </div>
        <div className="w-full">
          <Input size='w-full'
            onChangeHandle={(src) => setSource(src.trim())} 
            place="photo link (optional)"
          />
        </div>
      </div>
      <div className="flex gap-5">
        <Input size='w-full' onChangeHandle={(name) => setName(name)} place="Name" />
        <Input size='w-full'
          onChangeHandle={(username) => setUserName(username)}
          place="Username"
        />
      </div>
      <Input size='w-full' onChangeHandle={(email) => setEmail(email)} place="Email" />
      <Input size='w-full'
        type="password"
        onChangeHandle={(password) => setPassword(password)}
        place="Password"
      />
      <div>
        <Button
          size='w-full'
          processing= {processing}
          onClickHandler={() => {
           handleSignUp()
          }}
          className="primary"
        >
          {processing? "Creating...":"Create account"}
        </Button>
      </div>

      <div className="flex gap-1 items-center justify-center">
        <div>Already have an account?</div>
          <button className='text-[#89e5f5] font-bold' onClick={()=>{
            isLoginTrue(true)
          }}>Login</button>
      </div>
    </div>
  </>
  )
}

export default Signup
