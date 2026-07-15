import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useLogin } from "@workspace/api-client-react";
import { useAuthContext } from "@/hooks/use-auth";
import XiyLogo from "@/components/XiyLogo";

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().default(false),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuthContext();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", remember: false },
  });

  const onSubmit = (data: FormData) => {
    loginMutation.mutate({ data }, {
      onSuccess: (res: any) => {
        login(res.token);
        toast({ title: "Welcome back!", description: `Signed in as ${res.user.name}` });
        setLocation("/");
      },
      onError: (err: any) => {
        toast({ title: "Sign in failed", description: err?.data?.error || "Invalid email or password", variant: "destructive" });
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF2FF] to-[#F0F9FF] flex flex-col items-center justify-center p-4">
      <div className="mb-6 flex flex-col items-center">
        <XiyLogo size="lg" />
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-1 text-center">Welcome Back</h1>
      <p className="text-gray-500 text-sm mb-8 text-center">Sign in to your account</p>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" aria-label="Sign in form">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium text-sm">Email Address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input type="email" placeholder="john@example.com" autoComplete="email" {...field} data-testid="input-email" className="pl-10 h-11 border-gray-200 rounded-lg" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium text-sm">Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input type="password" placeholder="••••••••" autoComplete="current-password" {...field} data-testid="input-password" className="pl-10 h-11 border-gray-200 rounded-lg" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between">
              <FormField
                control={form.control}
                name="remember"
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Checkbox id="remember" checked={field.value} onCheckedChange={field.onChange} />
                    <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">Remember me</label>
                  </div>
                )}
              />
              <button type="button" className="text-sm text-blue-600 font-medium hover:underline">Forgot password?</button>
            </div>

            <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg" disabled={loginMutation.isPending} data-testid="button-submit-login">
              {loginMutation.isPending ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </Form>

        <p className="text-center text-sm text-gray-500 mt-5">
          Don't have an account?{" "}
          <Link href="/register" className="text-blue-600 font-semibold hover:underline" data-testid="link-to-register">Sign Up</Link>
        </p>
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-400">Demo: demo@assistai.com / demo123</p>
      </div>
    </div>
  );
}
