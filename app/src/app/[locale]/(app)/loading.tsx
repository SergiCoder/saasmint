import { Spinner } from "@/presentation/components/atoms/Spinner";

export default function AppLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
