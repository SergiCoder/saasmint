import { Button } from "@/presentation/components/atoms/Button";
import { signOut } from "@/app/actions/auth";

interface SignOutButtonProps {
  label: string;
}

export function SignOutButton({ label }: SignOutButtonProps) {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" size="sm">
        {label}
      </Button>
    </form>
  );
}
