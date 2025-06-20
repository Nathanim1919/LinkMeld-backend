// // src/controllers/authController.ts
// import { auth } from "../lib/auth"; // or wherever you export betterAuth instance
// import { type Request, type Response } from "express"; // adjust if using Next.js

// export const signUpEmail = async (req: Request, res: Response) => {
//     const { email, password } = req.body;
//     const response = await auth.api.signInEmail({
//         body: {
//             email,
//             password
//         },
//         asResponse: true // returns a response object instead of data
//     });

//     console.log(response);
// };

// // export const signInEmail = async (req: Request, res: Response) => {
// //   try {
// //     const { user, headers } = await auth.api.signInEmail({
// //       body: req.body,
// //       returnHeaders: true,
// //     });
// //     res.set(headers.raw()).json({ user });
// //   } catch (err) {
// //     res.status(err.status || 401).json({ error: err.message });
// //   }
// // };

// // export const signOut = async (req: Request, res: Response) => {
// //   try {
// //     const { headers } = await auth.api.signOut({
// //       headers: req.headers as any,
// //       returnHeaders: true,
// //     });
// //     res.set(headers.raw()).json({ success: true });
// //   } catch (err) {
// //     res.status(err.status || 400).json({ error: err.message });
// //   }
// // };

// // export const getSession = async (req: Request, res: Response) => {
// //   try {
// //     const session = await auth.api.getSession({
// //       headers: req.headers as any,
// //     });
// //     res.json({ session });
// //   } catch {
// //     res.json({ session: null });
// //   }
// // };
