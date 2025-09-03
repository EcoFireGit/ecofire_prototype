This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, install all dependencies:
```
npm i
```
Then, set up environment variables to connect to MongoDB and Clerk authentication in a `.env.local` file in the root directory
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<enter your key>
CLERK_SECRET_KEY=<enter your key>
MONGODB_URI=<enter your key>
```
Then, run the development server:

```bash
npm run dev &
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.