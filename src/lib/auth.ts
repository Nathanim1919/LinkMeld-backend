import { betterAuth } from "better-auth";
import {mongodbAdapter} from "better-auth/adapters/mongodb";
import {client} from "../config/mongoClient";


export const auth = betterAuth({
    database: mongodbAdapter(client.db()),
    emailAndPassword:{
        enabled: true,
    }
});