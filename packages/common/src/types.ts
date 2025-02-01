import {z} from 'zod'

export const CreateUserSchema = z.object({
    email:z.string().email(),
    username:z.string().min(3).max(30),
    password:z.string().min(8, { message: "Password must be at least 8 characters long" })
})

export const SigninSchema = z.object({
    email:z.string().email(),
    password:z.string().min(8, { message: "Password must be at least 8 characters long" })
})

export const CreateRoomSchema = z.object({
    roomName:z.string().min(3).max(30)
})

