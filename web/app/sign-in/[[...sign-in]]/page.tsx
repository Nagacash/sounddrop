import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <main style={{ padding: 24 }}>
      <SignIn />
    </main>
  );
}
