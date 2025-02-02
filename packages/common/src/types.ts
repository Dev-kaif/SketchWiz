import {z} from 'zod'

export const CreateUserSchema = z.object({
    email:z.string().email(),
    username:z.string().min(3).max(30),
    name:z.string().min(3).max(30),
    photo:z.string().optional(),
    password:z.string().min(8, { message: "Password must be at least 8 characters long" })
})

export const SigninSchema = z.object({
    email:z.string().email(),
    password:z.string().min(8, { message: "Password must be at least 8 characters long" })
})

export const RoomSchema = z.object({
    roomName:z.string().min(3).max(30)
})

