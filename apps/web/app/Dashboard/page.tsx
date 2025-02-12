"use client";

import axios from "../../Component/axios/index";
import { useEffect, useRef, useState } from "react";
import { BACKEND_URL } from "../../Component/Config";
import { useRouter } from "next/navigation";
import { useNotification } from "../../Component/notification";
import { Button } from "@repo/ui/button";
import Input from "@repo/ui/input";
import { LogOutIcon } from "lucide-react";

interface RoomInterface {
  id: number;
  slug: string;
  createdAt: string;
  adminId: number;
}

function Page() {
  const roomRef = useRef<HTMLInputElement>(null);
  const joinRoomRef = useRef<HTMLInputElement>(null);
  const [rooms, setRooms] = useState<RoomInterface[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [callBackend, setCallBackend] = useState(false);
  const router = useRouter();
  const { addNotification } = useNotification();
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  async function createRoom() {
    if (!roomRef.current) return;
    const slug = roomRef.current.value.trim();
    if (!slug) {
      addNotification("error", "Room name cannot be empty");
      return;
    }
    setCreating(true);
    try {
      await axios.post(`${BACKEND_URL}/api/room`, { roomName: slug });
      addNotification("success", "Room Created Successfully");
      setCallBackend((prev) => !prev);
      roomRef.current.value = "";
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
    if (!joinRoomRef.current) return;
    setJoining(true);
    const slug = joinRoomRef.current.value.trim();
    if (!slug) {
      addNotification("error", "Room name cannot be empty");
      setJoining(false);
      return;
    }
    try {
      const res = await axios.get(`${BACKEND_URL}/api/room/slug/${slug}`);
      const room = res.data;
      if (!room.room) {
        addNotification("error", "Room doesn't exist");
        return;
      }
      joinRoom(room.room.slug);
      joinRoomRef.current.value = "";
    } catch (error: any) {
      addNotification(
        "error",
        error.response?.data?.message || "Error fetching room"
      );
    } finally {
      setJoining(false);
    }
  }

  useEffect(() => {
    async function fetchRooms() {
      setLoading(true);
      try {
        const res = await axios.get(`${BACKEND_URL}/api/rooms`);
        setRooms(res.data.rooms);
      } catch (error: any) {
        addNotification("error",error.response?.data?.message)
      } finally {
        setLoading(false);
      }
    }
    fetchRooms();
  }, [addNotification, callBackend]);

  async function deleteRoom(id: number) {
    if (!window.confirm("Are you sure you want to delete this room?")) return;
    try {
      setDeleting(true);
      const res = await axios.delete(`${BACKEND_URL}/api/room/delete/${id}`);
      addNotification("success", res.data.message);
      setCallBackend((prev) => !prev);
    } catch (error: any) {
      addNotification(
        "error",
        error.response?.data?.message || "Error deleting room"
      );
    } finally {
      setDeleting(false);
    }
  }

  function joinRoom(slug: string) {
    addNotification("success", "Joined Room Successfully");
    router.push(`/canvas/${slug}`);
  }

  const handleLogout = () => {
    localStorage.removeItem("authorization");
    router.push("/");
  };

  return (
    <div className="bg-[#191414] min-h-screen text-white relative flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center p-4 md:p-6">
        <h1 className="text-2xl font-bold">SketchWiz</h1>
        <Button
          size="text-sm"
          onClickHandler={() => setShowLogoutModal(true)}
          className="secondary"
        >
          <div className="flex gap-2 items-center justify-center">
            <span>Logout</span>
            <LogOutIcon className="text-sm" />
          </div>
        </Button>
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-[#191414] outline text-white rounded-lg p-6 mx-4 max-w-sm w-full">
            <h3 className="text-xl font-semibold mb-4">Confirm Logout</h3>
            <p className="mb-6">Are you sure you want to logout?</p>
            <div className="flex justify-end gap-4">
              <Button
                onClickHandler={() => setShowLogoutModal(false)}
                className="secondary"
              >
                Cancel
              </Button>
              <Button onClickHandler={handleLogout} className="destructive">
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed overlay for deletion */}
      {deleting && (
        <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
          <div className="flex items-center gap-2 p-4 rounded-lg shadow-lg">
            <span className="text-lg">Deleting...</span>
            <svg
              className="animate-spin h-8 w-8 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              ></path>
            </svg>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center mt-6">
        <div className="w-full max-w-6xl px-4">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left Column: Create and Join Rooms */}
            <div className="flex flex-col gap-6 w-full md:w-1/3">
              {/* Create Room Section */}
              <div className="bg-gradient-to-tr from-[#0D2538] to-[#1A73E8] p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-3">Create Room</h2>
                <Input
                  size="mt-3 w-full"
                  inputRef={roomRef}
                  type="text"
                  place="Enter Room Name"
                />
                <Button
                  processing={creating}
                  onClickHandler={createRoom}
                  size="mt-3 w-full"
                  className="primary"
                >
                  {creating ? "Creating..." : "Create Room"}
                </Button>
              </div>
              {/* Join Room Section */}
              <div className="bg-gradient-to-tr from-[#0D2538] to-[#1A73E8] p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-3">Join Any Room</h2>
                <Input
                  size="mt-3 w-full"
                  place="Enter Room Name"
                  type="text"
                  inputRef={joinRoomRef}
                />
                <Button
                  processing={joining}
                  onClickHandler={getRoomId}
                  size="mt-3 w-full"
                  className="primary"
                >
                  {joining ? "Joining..." : "Join Room"}
                </Button>
              </div>
            </div>
            {/* Right Column: Rooms Table */}
            <div className="w-full md:w-2/3 bg-gradient-to-tr from-[#0D2538] to-[#1A73E8] p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold mb-3">
                Your Available Rooms
              </h2>
              {loading ? (
                <div className="flex justify-center items-center py-10">
                  <svg
                    className="animate-spin h-8 w-8 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    ></path>
                  </svg>
                </div>
              ) : rooms.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full block md:table">
                    <thead className="block md:table-header-group">
                      <tr className="bg-[#27304b] text-gray-200 block md:table-row">
                        <th className="px-4 py-2 text-left border-b border-gray-700">
                          ID
                        </th>
                        <th className="px-4 py-2 text-left border-b border-gray-700">
                          Room Name
                        </th>
                        <th className="px-4 py-2 text-left border-b border-gray-700">
                          Created At
                        </th>
                        <th className="px-4 py-2 text-center border-b border-gray-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="block md:table-row-group">
                      {rooms.map((room) => (
                        <tr
                          key={room.id}
                          className="bg-[#0D2538] border-b border-gray-700 block md:table-row mb-4 md:mb-0"
                        >
                          <td
                            className="px-4 py-2 block md:table-cell"
                            data-label="ID"
                          >
                            {room.id}
                          </td>
                          <td
                            className="px-4 py-2 block md:table-cell"
                            data-label="Room Name"
                          >
                            {room.slug}
                          </td>
                          <td
                            className="px-4 py-2 block md:table-cell"
                            data-label="Created At"
                          >
                            {room.createdAt.split("T")[0]}
                          </td>
                          <td
                            className="px-4 py-2 block md:table-cell"
                            data-label="Actions"
                          >
                            <div className="flex justify-center gap-3">
                              <Button
                                onClickHandler={() => joinRoom(room.slug)}
                                className="primary"
                              >
                                Join
                              </Button>
                              <Button
                                onClickHandler={() => deleteRoom(room.id)}
                                className="destructive"
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-gray-400 py-10">
                  No rooms available
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Page;
