'use client'
import axios from "../../Component/axios/index";
import { useEffect, useRef, useState} from "react"
import { BACKEND_URL } from "../../Component/Config";
import { useRouter } from "next/navigation";
import { useNotification } from "../../Component/notification";

interface roomInterface{
  id:number;
  slug:string;
  createdAt:string;
  adminId:number
}

function Page() {
  const roomRef = useRef<HTMLInputElement>(null);
  const joinRoomRef = useRef<HTMLInputElement>(null);
  const [rooms,setRooms] = useState<roomInterface[]>([]);
  const [createdRoom,setCreatedRoom] = useState(false);
  const router = useRouter()
  const { addNotification } = useNotification();

  async function getInput(){
    if(!roomRef.current)return;
    const slug = roomRef.current.value
    
    const res =  await axios.post(`${BACKEND_URL}/api/room`,{
      roomName:slug
    })
    const room = res.data
    console.log(room);
    setCreatedRoom((prev)=>!prev)
  }

  async function getRoomId() {
    if(!joinRoomRef.current)return;
    const slug = joinRoomRef.current.value
    
    const res =  await axios.get(`${BACKEND_URL}/api/room/slug/${slug}`)
    const room = res.data;
    
    if(room.room== null){
      addNotification("error","Room doesn't exist")
      return;
    }
    joinRoom(room.room.slug)
  }

  useEffect(()=>{
    async function getUsersRoom() {
      const rooms = await axios.get(`${BACKEND_URL}/api/rooms`)
      console.log(rooms.data.rooms);
      setRooms(rooms.data.rooms)
    }
    getUsersRoom();
  },[createdRoom])

  function joinRoom(slug:string) {
    router.push(`/canvas/${slug}`)
  }

  return (
    <div className="bg-gray-900 h-screen text-white flex flex-col gap-10">
      <div>
        <div>Create Room</div>
        <input className="text-black" ref={roomRef} type="text" />
        <button className="px-3 py-1 bg-blue-500 rounded"
          onClick={()=>getInput()}>Room</button>
      </div>
      <div>
        <div>Join Room</div>
        <input className="text-black" ref={joinRoomRef} type="text" />
        <button className="px-3 py-1 bg-blue-500 rounded"
          onClick={()=>getRoomId()}>Join</button>
      </div>
      <div>
        {rooms.map((room,i)=>(
          <div className="flex justify-between" key={i}>
            <div>{room.id} : {room.slug}</div>
            <div>CreatedAt : {(room.createdAt).split("T")[0]}</div>
            <button
            onClick={()=>{
              joinRoom(room.slug)
            }} 
            className="px-3 py-1 bg-blue-500 rounded"> Join</button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Page
