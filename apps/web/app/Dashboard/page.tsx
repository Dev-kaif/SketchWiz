/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import axios from "@/Component/axios/index";
import { useEffect, useRef, useState, RefObject } from "react";
import { BACKEND_URL } from "@/Component/Config";
import { useRouter } from "next/navigation";
import { useNotification } from "@/Component/notification/notification";
import { motion, AnimatePresence } from "motion/react";

// ShadCN UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

// Icons
import {
  LogOut,
  PlusCircle,
  Loader2,
  Trash2,
  DoorOpen,
} from "lucide-react";

interface RoomInterface {
  id: number;
  slug: string;
  createdAt: string;
  adminId: number;
}

export default function DashboardPage() {
  const roomRef = useRef<HTMLInputElement>(null);
  const joinRoomRef = useRef<HTMLInputElement>(null);
  const [rooms, setRooms] = useState<RoomInterface[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [callBackend, setCallBackend] = useState(false);
  const router = useRouter();
  const { addNotification } = useNotification();
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  // --- API FUNCTIONS ---
  async function createRoom() {
    if (!roomRef.current?.value) {
      addNotification("error", "Room name cannot be empty");
      return;
    }
    setCreating(true);
    try {
      await axios.post(`${BACKEND_URL}/api/room`, {
        roomName: roomRef.current.value,
      });
      addNotification("success", "Room Created Successfully");
      setCallBackend((prev) => !prev);
      if (roomRef.current) roomRef.current.value = "";
    } catch (error: any) {
      addNotification(
        "error",
        error.response?.data?.message || "Error creating room"
      );
    } finally {
      setCreating(false);
    }
  }

  async function getRoomId() {
    if (!joinRoomRef.current?.value) {
      addNotification("error", "Room name cannot be empty");
      return;
    }
    setJoining(true);
    try {
      const res = await axios.get(
        `${BACKEND_URL}/api/room/slug/${joinRoomRef.current.value}`
      );
      if (!res.data.room) {
        addNotification("error", "Room doesn't exist");
        setJoining(false);
        return;
      }
      joinRoom(res.data.room.slug);
      if (joinRoomRef.current) joinRoomRef.current.value = "";
    } catch (error: any) {
      addNotification(
        "error",
        error.response?.data?.message || "Error fetching room"
      );
    } finally {
      setJoining(false);
    }
  }

  async function deleteRoom(id: number, slug: string) {
    if (
      !window.confirm(`Are you sure you want to delete the room "${slug}"?`)
    ) {
      return;
    }
    try {
      const res = await axios.delete(`${BACKEND_URL}/api/room/delete/${id}`);
      addNotification("success", res.data.message);
      setCallBackend((prev) => !prev);
    } catch (error: any) {
      addNotification(
        "error",
        error.response?.data?.message || "Error deleting room"
      );
    }
  }

  function joinRoom(slug: string) {
    addNotification("success", `Joining room: ${slug}`);
    router.push(`/canvas/${slug}`);
  }

  const handleLogout = () => {
    localStorage.removeItem("authorization");
    router.push("/");
    addNotification("success", "You have been logged out.");
  };

  useEffect(() => {
    async function fetchRooms() {
      setLoading(true);
      try {
        const res = await axios.get(`${BACKEND_URL}/api/rooms`);
        setRooms(res.data.rooms);
      } catch (error: any) {
        addNotification(
          "error",
          error.response?.data?.message || "Failed to fetch rooms"
        );
      } finally {
        setLoading(false);
      }
    }
    fetchRooms();
  }, [addNotification, callBackend]);

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-[#111111] text-[#E8E8E8] font-sans">
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-[#111111]/80 border-b border-[#333333]">
        <div className="flex justify-between items-center max-w-7xl mx-auto px-6 h-16">
          <Link href={"/"}>
            <h1 className="text-xl font-bold text-white">
              SketchWiz Dashboard
            </h1>
          </Link>
          <UserMenu handleLogout={handleLogout} />
        </div>
      </header>

      <main className="pt-24 max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="flex flex-col md:flex-row items-start gap-8">
            <aside className="w-full md:w-1/3 md:sticky md:top-24 space-y-8">
              <ActionCard
                title="Create a New Room"
                description="Start a new collaborative canvas."
                inputRef={roomRef}
                placeholder="Enter new room name"
                buttonText="Create Room"
                loadingText="Creating..."
                isLoading={creating}
                onClick={createRoom}
                Icon={PlusCircle}
              />
              <ActionCard
                title="Join a Room"
                description="Enter an existing room name to join."
                inputRef={joinRoomRef}
                placeholder="Enter room name to join"
                buttonText="Join Room"
                loadingText="Joining..."
                isLoading={joining}
                onClick={getRoomId}
                Icon={DoorOpen}
              />
            </aside>

            <div className="w-full md:w-2/3">
              <Card className="bg-[#1C1C1C] border-[#333333]">
                <CardHeader>
                  <CardTitle className="text-white">Your Rooms</CardTitle>
                  <CardDescription>
                    Here are all the rooms you have created or have access to.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RoomsTable
                    rooms={rooms}
                    isLoading={loading}
                    onJoin={joinRoom}
                    onDelete={deleteRoom}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---

const UserMenu = ({ handleLogout }: { handleLogout: () => void }) => {
  // A simple logout button is cleaner than a modal inside a dropdown
  const confirmLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      handleLogout();
    }
  };
  return (
    <Button
      onClick={confirmLogout}
      variant="ghost"
      className="hover:bg-[#1C1C1C] hover:text-white flex gap-2"
    >
      <LogOut className="mr-2 h-4 w-4" />
      Logout
    </Button>
  );
};

interface ActionCardProps {
  title: string;
  description: string;
  inputRef: RefObject<HTMLInputElement | null>;
  placeholder: string;
  buttonText: string;
  loadingText: string;
  isLoading: boolean;
  onClick: () => void;
  Icon: React.ElementType;
}

const ActionCard = ({
  title,
  description,
  inputRef,
  placeholder,
  buttonText,
  loadingText,
  isLoading,
  onClick,
  Icon,
}: ActionCardProps) => (
  <Card className="bg-[#1C1C1C] border-[#333333]">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-white">
        <Icon className="w-5 h-5" />
        {title}
      </CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        className="bg-[#111111] border-[#333333] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-[#00A3FF]"
      />
    </CardContent>
    <CardFooter>
      <Button
        onClick={onClick}
        disabled={isLoading}
        className="w-full bg-[#00A3FF] hover:bg-[#00A3FF]/90 flex justify-center items-center gap-3"
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isLoading ? loadingText : buttonText}
      </Button>
    </CardFooter>
  </Card>
);

interface RoomsTableProps {
  rooms: RoomInterface[];
  isLoading: boolean;
  onJoin: (slug: string) => void;
  onDelete: (id: number, slug: string) => void;
}

const RoomsTable = ({
  rooms,
  isLoading,
  onJoin,
  onDelete,
}: RoomsTableProps) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full bg-[#333333]" />
        ))}
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center py-12 text-[#b4b4b4]">
        <p className="font-semibold">No rooms found.</p>
        <p className="text-sm mt-1">Create a new room to get started.</p>
      </div>
    );
  }

  return (
    <div className="border border-[#333333] rounded-lg">
      <Table>
        <TableHeader>
          <TableRow className="border-b-[#333333] hover:bg-transparent">
            <TableHead className="text-white">Room Name</TableHead>
            <TableHead className="text-white">Created At</TableHead>
            <TableHead className="text-right text-white flex justify-end mr-12 items-center ">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence>
            {rooms.map((room) => (
              <motion.tr
                key={room.id}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="border-b-0"
              >
                <TableCell className="font-medium">{room.slug}</TableCell>
                <TableCell className="text-[#b4b4b4]">
                  {new Date(room.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right flex justify-end gap-5">
                  <Button
                    onClick={() => onJoin(room.slug)}
                    variant="ghost"
                    size="sm"
                    className="mr-2 bg-blue-500 hover:bg-[#00A3FF]/20 hover:text-white"
                  >
                    Join
                  </Button>
                  <Button
                    onClick={() => onDelete(room.id, room.slug)}
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:bg-red-500/10 hover:text-red-400 flex justify-center items-center"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </motion.tr>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>
    </div>
  );
};
